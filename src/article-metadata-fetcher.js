const REQUEST_HEADERS = {
  "User-Agent": "Mozilla/5.0 GAT-Article-Search/1.0",
  Accept: "text/html,application/xhtml+xml"
};

const REQUEST_TIMEOUT_MS = 8000;
const MAX_HTML_BYTES = 768 * 1024;
const DEFAULT_FETCH_LIMIT = 60;

const DATE_META_FIELDS = [
  "article:published_time",
  "article:modified_time",
  "datePublished",
  "datepublished",
  "pubdate",
  "publishdate",
  "published_date",
  "og:updated_time",
  "dc.date",
  "dc.date.issued",
  "date",
  "timestamp",
  "sailthru.date",
  "parsely-pub-date"
];

function parseUrl(value) {
  try {
    return new URL(value);
  } catch (error) {
    return null;
  }
}

function isFetchableUrl(value) {
  const url = parseUrl(value);
  return Boolean(url && ["http:", "https:"].includes(url.protocol));
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&quot;/g, "\"")
    .replace(/&#34;/g, "\"")
    .replace(/&#x22;/gi, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function parseAttributes(tag) {
  const attributes = {};
  const pattern = /([a-zA-Z_:.-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let match;

  while ((match = pattern.exec(tag)) !== null) {
    attributes[match[1].toLowerCase()] = decodeHtmlEntities(match[3] || match[4] || match[5] || "");
  }

  return attributes;
}

function normalizeDateField(value) {
  return String(value || "").toLowerCase().replace(/[_\s-]+/g, "");
}

function fieldMatchesDateField(value) {
  const normalized = normalizeDateField(value);
  return DATE_META_FIELDS.some((field) => normalizeDateField(field) === normalized);
}

function findMetaDate(html) {
  const metaTags = html.match(/<meta\b[^>]*>/gi) || [];

  for (const tag of metaTags) {
    const attributes = parseAttributes(tag);
    const key = attributes.property || attributes.name || attributes.itemprop || "";
    if (fieldMatchesDateField(key) && attributes.content) {
      return {
        dateInfo: attributes.content,
        source: `meta:${key}`
      };
    }
  }

  return null;
}

function findMetaText(html, fields) {
  const metaTags = html.match(/<meta\b[^>]*>/gi) || [];

  for (const tag of metaTags) {
    const attributes = parseAttributes(tag);
    const key = attributes.property || attributes.name || attributes.itemprop || "";
    if (fields.includes(key.toLowerCase()) && attributes.content) {
      return attributes.content;
    }
  }

  return "";
}

function findTimeDate(html) {
  const timeTags = html.match(/<time\b[^>]*>/gi) || [];

  for (const tag of timeTags) {
    const attributes = parseAttributes(tag);
    if (attributes.datetime) {
      return {
        dateInfo: attributes.datetime,
        source: "time:datetime"
      };
    }
  }

  return null;
}

function unwrapJsonLd(value) {
  if (!value || typeof value !== "object") {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(unwrapJsonLd);
  }

  const nested = [];
  if (value["@graph"]) {
    nested.push(...unwrapJsonLd(value["@graph"]));
  }

  return [value, ...nested];
}

function findJsonLdDate(html) {
  const scripts = html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || [];

  for (const script of scripts) {
    const jsonText = script
      .replace(/^<script\b[^>]*>/i, "")
      .replace(/<\/script>$/i, "")
      .trim();

    try {
      const parsed = JSON.parse(decodeHtmlEntities(jsonText));
      const nodes = unwrapJsonLd(parsed);
      const node = nodes.find((item) => item.datePublished || item.dateModified);
      if (node) {
        return {
          dateInfo: node.datePublished || node.dateModified,
          source: node.datePublished ? "jsonld:datePublished" : "jsonld:dateModified"
        };
      }
    } catch (error) {
      continue;
    }
  }

  return null;
}

function stripHtml(value) {
  return decodeHtmlEntities(
    String(value || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
  );
}

function extractParagraphText(html) {
  const paragraphMatches = html.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) || [];
  return paragraphMatches
    .map(stripHtml)
    .filter((text) => text.length >= 40)
    .slice(0, 5)
    .join(" ");
}

function extractArticleText(html) {
  return [
    findMetaText(html, ["description", "og:description", "twitter:description"]),
    extractParagraphText(html)
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .slice(0, 4000);
}

function extractArticleDate(html) {
  return findMetaDate(html) || findJsonLdDate(html) || findTimeDate(html);
}

async function readLimitedText(response) {
  const reader = response.body?.getReader();
  if (!reader) {
    return response.text();
  }

  const chunks = [];
  let totalBytes = 0;

  while (totalBytes < MAX_HTML_BYTES) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    totalBytes += value.byteLength;
    chunks.push(value);
  }

  return new TextDecoder("utf-8", { fatal: false }).decode(Buffer.concat(chunks));
}

async function mapWithConcurrency(items, limit, mapper) {
  const queue = items.map((value, index) => ({ value, index }));
  const results = new Array(items.length);
  const workerCount = Math.max(1, limit);

  async function worker() {
    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) {
        return;
      }

      results[next.index] = await mapper(next.value, next.index);
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

async function fetchArticleMetadata(url) {
  if (!isFetchableUrl(url)) {
      return {
        dateInfo: "",
        articleBody: "",
        source: "",
        status: "skipped",
        error: "URL 형식이 올바르지 않음"
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: REQUEST_HEADERS,
      redirect: "follow",
      signal: controller.signal
    });

    if (!response.ok) {
      return {
        dateInfo: "",
        articleBody: "",
        source: "",
        status: "failed",
        error: `HTTP ${response.status}`
      };
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType && !contentType.toLowerCase().includes("html")) {
      return {
        dateInfo: "",
        articleBody: "",
        source: "",
        status: "skipped",
        error: `HTML 아님: ${contentType}`
      };
    }

    const html = await readLimitedText(response);
    const metadata = extractArticleDate(html);
    const articleBody = extractArticleText(html);
    if (!metadata?.dateInfo) {
      return {
        dateInfo: "",
        articleBody,
        source: "",
        status: "missing",
        error: "게시일 메타데이터 없음"
      };
    }

    return {
      ...metadata,
      articleBody,
      status: "verified",
      error: ""
    };
  } catch (error) {
    return {
      dateInfo: "",
      articleBody: "",
      source: "",
      status: "failed",
      error: error.name === "AbortError" ? "요청 시간 초과" : error.message
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function enrichArticleMetadata(results, options = {}) {
  const fetchLimit = Math.max(0, Math.min(DEFAULT_FETCH_LIMIT, Number(options.fetchLimit || DEFAULT_FETCH_LIMIT)));
  let verifiedCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  const enriched = await mapWithConcurrency(results, 4, async (result, index) => {
    if (index >= fetchLimit) {
      skippedCount += 1;
      return {
        ...result,
        articleDateVerificationStatus: "not-fetched",
        articleDateVerificationSource: "",
        articleDateVerificationError: "원문 확인 상한 초과"
      };
    }

    const metadata = await fetchArticleMetadata(result.url);
    if (metadata.status === "verified") {
      verifiedCount += 1;
    } else if (metadata.status === "skipped") {
      skippedCount += 1;
    } else {
      failedCount += 1;
    }

    return {
      ...result,
      dateInfo: metadata.dateInfo || result.dateInfo,
      articleDateInfo: metadata.dateInfo || "",
      articleBody: metadata.articleBody || result.articleBody || "",
      articleDateVerificationStatus: metadata.status,
      articleDateVerificationSource: metadata.source,
      articleDateVerificationError: metadata.error
    };
  });

  return {
    results: enriched,
    summary: {
      articleDateVerifiedCount: verifiedCount,
      articleDateFailedCount: failedCount,
      articleDateSkippedCount: skippedCount
    }
  };
}

module.exports = {
  enrichArticleMetadata,
  fetchArticleMetadata,
  extractArticleDate,
  extractArticleText
};
