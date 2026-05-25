const GOOGLE_NEWS_RSS_ENDPOINT = "https://news.google.com/rss/search";

function decodeXml(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(value) {
  return decodeXml(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractTag(block, tagName) {
  const pattern = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = block.match(pattern);
  return match ? decodeXml(match[1]).trim() : "";
}

function extractSource(block) {
  const match = block.match(/<source\s+url="([^"]+)"[^>]*>([\s\S]*?)<\/source>/i);
  if (!match) {
    return { name: "", url: "" };
  }

  return {
    url: decodeXml(match[1]).trim(),
    name: decodeXml(match[2]).trim()
  };
}

function domainFromUrl(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch (error) {
    return "";
  }
}

function addDays(dateValue, days) {
  const [year, month, day] = String(dateValue).split("-").map(Number);
  if (!year || !month || !day) {
    return dateValue;
  }

  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function buildRssQuery(query, date) {
  return `${query.query} after:${date} before:${addDays(date, 1)}`;
}

function cleanTitle(title, sourceName) {
  if (!sourceName) {
    return title;
  }

  return title.replace(new RegExp(`\\s+-\\s+${sourceName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"), "").trim();
}

function parseItems(xml, query) {
  const items = [];
  const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemPattern.exec(xml)) !== null) {
    const block = match[1];
    const source = extractSource(block);
    const rawTitle = extractTag(block, "title");
    const link = extractTag(block, "link");
    const pubDate = extractTag(block, "pubDate");
    const description = stripTags(extractTag(block, "description"));
    const sourceDomain = domainFromUrl(source.url);

    items.push({
      title: cleanTitle(rawTitle, source.name) || "제목 없는 결과",
      url: link,
      displayUrl: sourceDomain,
      source: source.name || sourceDomain,
      snippet: description,
      dateInfo: pubDate || "날짜 정보 없음",
      queryUsed: query.query,
      keyword: query.keyword,
      topics: query.topics || [],
      tier: "RSS"
    });
  }

  return items;
}

async function searchGoogleNewsRss({ query, date, maxResults }) {
  const url = new URL(GOOGLE_NEWS_RSS_ENDPOINT);
  url.searchParams.set("q", buildRssQuery(query, date));
  url.searchParams.set("hl", "en-US");
  url.searchParams.set("gl", "US");
  url.searchParams.set("ceid", "US:en");

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 GAT-Article-Search/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Google News RSS 요청이 실패했습니다. 상태 코드: ${response.status}`);
  }

  const xml = await response.text();
  return parseItems(xml, query).slice(0, Math.max(1, Math.min(100, maxResults || 75)));
}

module.exports = {
  searchGoogleNewsRss
};
