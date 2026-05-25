const GOOGLE_NEWS_BATCH_ENDPOINT = "https://news.google.com/_/DotsSplashUi/data/batchexecute?rpcids=Fbv4je";
const REQUEST_HEADERS = {
  "User-Agent": "Mozilla/5.0 GAT-Article-Search/1.0"
};

function parseUrl(value) {
  try {
    return new URL(value);
  } catch (error) {
    return null;
  }
}

function isGoogleNewsUrl(value) {
  const url = parseUrl(value);
  return Boolean(url && url.hostname === "news.google.com" && /\/(?:rss\/)?articles\//.test(url.pathname));
}

function extractArticleId(value) {
  const url = parseUrl(value);
  if (!url) {
    return "";
  }

  return url.pathname.split("/").filter(Boolean).pop() || "";
}

function decodeBase64Url(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(normalized + "=".repeat(padding), "base64").toString("utf8");
}

function cleanUrl(value) {
  return String(value || "")
    .replace(/\\u003d/g, "=")
    .replace(/\\u0026/g, "&")
    .replace(/\\\//g, "/")
    .replace(/[)"\],]+$/g, "")
    .trim();
}

function isPublisherUrl(value) {
  const url = parseUrl(value);
  if (!url) {
    return false;
  }

  return ![
    "news.google.com",
    "www.google.com",
    "google.com",
    "accounts.google.com",
    "support.google.com",
    "www.gstatic.com",
    "fonts.gstatic.com"
  ].includes(url.hostname);
}

function extractPublisherUrl(text) {
  const normalized = cleanUrl(text);
  const matches = normalized.match(/https?:\/\/[^\s"'<>\\]+/g) || [];
  return matches.map(cleanUrl).find(isPublisherUrl) || "";
}

function decodeLegacyGoogleNewsUrl(sourceUrl) {
  const articleId = extractArticleId(sourceUrl);
  if (!articleId) {
    return "";
  }

  try {
    return extractPublisherUrl(decodeBase64Url(articleId));
  } catch (error) {
    return "";
  }
}

function extractAttribute(html, name) {
  const marker = `${name}="`;
  const start = html.indexOf(marker);
  if (start === -1) {
    return "";
  }

  const valueStart = start + marker.length;
  const valueEnd = html.indexOf("\"", valueStart);
  return valueEnd === -1 ? "" : html.slice(valueStart, valueEnd);
}

function buildBatchBody({ articleId, signature, timestamp }) {
  const requestPayload = [
    "garturlreq",
    [
      ["en-US", "US", ["FINANCE_TOP_INDICES", "WEB_TEST_1_0_0"], null, null, 1, 1, "US:en", null, 180, null, null, null, null, null, 0, null, null, [1608992183, 723341000]],
      "en-US",
      "US",
      1,
      [2, 3, 4, 8],
      1,
      0,
      "655000234",
      0,
      0,
      null,
      0
    ],
    articleId,
    Number(timestamp),
    signature
  ];
  const batchPayload = [[["Fbv4je", JSON.stringify(requestPayload), null, "generic"]]];
  return new URLSearchParams({ "f.req": JSON.stringify(batchPayload) });
}

async function resolveWithBatch(sourceUrl, pageHtml) {
  const articleId = extractArticleId(sourceUrl);
  const signature = extractAttribute(pageHtml, "data-n-a-sg");
  const timestamp = extractAttribute(pageHtml, "data-n-a-ts");

  if (!articleId || !signature || !timestamp) {
    return "";
  }

  const response = await fetch(GOOGLE_NEWS_BATCH_ENDPOINT, {
    method: "POST",
    headers: {
      ...REQUEST_HEADERS,
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      Referer: sourceUrl
    },
    body: buildBatchBody({ articleId, signature, timestamp })
  });

  if (!response.ok) {
    return "";
  }

  return extractPublisherUrl(await response.text());
}

async function resolveGoogleNewsUrl(sourceUrl) {
  if (!isGoogleNewsUrl(sourceUrl)) {
    return { url: sourceUrl, resolved: true, method: "already-direct" };
  }

  const legacyUrl = decodeLegacyGoogleNewsUrl(sourceUrl);
  if (legacyUrl) {
    return { url: legacyUrl, resolved: true, method: "legacy-decode" };
  }

  const response = await fetch(sourceUrl, {
    headers: REQUEST_HEADERS,
    redirect: "follow"
  });

  const finalUrl = response.url;
  if (finalUrl && !isGoogleNewsUrl(finalUrl)) {
    return { url: finalUrl, resolved: true, method: "redirect" };
  }

  const resolvedUrl = await resolveWithBatch(sourceUrl, await response.text());
  if (resolvedUrl) {
    return { url: resolvedUrl, resolved: true, method: "batch" };
  }

  return { url: sourceUrl, resolved: false, method: "google-news" };
}

async function resolveArticleUrls(results) {
  const resolvedResults = [];
  let resolvedCount = 0;

  for (const result of results) {
    try {
      const resolution = await resolveGoogleNewsUrl(result.url);
      const isResolved = resolution.resolved && resolution.url !== result.url;
      if (isResolved) {
        resolvedCount += 1;
      }

      resolvedResults.push({
        ...result,
        url: resolution.url,
        googleNewsUrl: isResolved ? result.url : "",
        urlResolutionMethod: resolution.method,
        urlResolutionStatus: isResolved ? "원문 URL 확인됨" : "Google News 링크"
      });
    } catch (error) {
      resolvedResults.push({
        ...result,
        googleNewsUrl: "",
        urlResolutionMethod: "failed",
        urlResolutionStatus: "Google News 링크",
        urlResolutionError: error.message
      });
    }
  }

  return {
    results: resolvedResults,
    summary: {
      urlResolvedCount: resolvedCount,
      urlFallbackCount: resolvedResults.length - resolvedCount
    }
  };
}

module.exports = {
  resolveArticleUrls,
  resolveGoogleNewsUrl
};
