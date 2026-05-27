const GOOGLE_CSE_ENDPOINT = "https://www.googleapis.com/customsearch/v1";

function addDays(dateValue, days) {
  const [year, month, day] = String(dateValue).split("-").map(Number);
  if (!year || !month || !day) {
    return dateValue;
  }

  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function buildGoogleQuery(query, startDate, endDate) {
  if (/\bafter:/i.test(query.query) || /\bbefore:/i.test(query.query)) {
    return query.query;
  }

  const normalizedStart = String(startDate || "").trim();
  const normalizedEnd = String(endDate || normalizedStart).trim();
  if (!normalizedStart) {
    return query.query;
  }

  return `${query.query} after:${normalizedStart} before:${addDays(normalizedEnd || normalizedStart, 1)}`;
}

function extractMetaDate(item) {
  const metatags = item.pagemap?.metatags || [];
  const firstMeta = metatags[0] || {};
  const dateFields = [
    "article:published_time",
    "article:modified_time",
    "datePublished",
    "datepublished",
    "pubdate",
    "og:updated_time",
    "dc.date",
    "date"
  ];

  for (const field of dateFields) {
    if (firstMeta[field]) {
      return String(firstMeta[field]).slice(0, 64);
    }
  }

  const snippetMatch = String(item.snippet || "").match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},\s+\d{4}\b/i);
  return snippetMatch ? snippetMatch[0] : "날짜 정보 없음";
}

function buildApiError(status, payload) {
  const apiMessage = payload?.error?.message || "Google Custom Search API 요청이 실패했습니다.";
  const details = payload?.error?.errors?.map((error) => error.message).filter(Boolean) || [];
  return new Error([`Google Custom Search API 오류(${status}): ${apiMessage}`, ...details].join(" "));
}

function normalizeItem(item, query) {
  return {
    title: item.title || "제목 없는 결과",
    url: item.link || "",
    displayUrl: item.displayLink || "",
    source: item.displayLink || "",
    snippet: item.snippet || "",
    dateInfo: extractMetaDate(item),
    pagemap: item.pagemap || {},
    queryUsed: query.query,
    keyword: query.keyword,
    topics: query.topics || [],
    tier: "Google API"
  };
}

async function searchGoogleCse({ runtimeConfig, query, startDate, endDate, maxResults }) {
  if (!runtimeConfig.googleApiKey || !runtimeConfig.googleCseId) {
    throw new Error("Google API 설정이 필요합니다. .env에 GOOGLE_API_KEY와 GOOGLE_CSE_ID를 입력하세요.");
  }

  const targetCount = Math.max(1, Math.min(100, maxResults || 10));
  const items = [];

  for (let start = 1; start <= targetCount; start += 10) {
    const pageSize = Math.min(10, targetCount - items.length);
    const url = new URL(GOOGLE_CSE_ENDPOINT);
    url.searchParams.set("key", runtimeConfig.googleApiKey);
    url.searchParams.set("cx", runtimeConfig.googleCseId);
    url.searchParams.set("q", buildGoogleQuery(query, startDate, endDate));
    url.searchParams.set("num", String(pageSize));
    url.searchParams.set("start", String(start));
    url.searchParams.set("hl", "en");
    url.searchParams.set("gl", "us");
    url.searchParams.set("safe", "off");

    const response = await fetch(url);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw buildApiError(response.status, payload);
    }

    const pageItems = Array.isArray(payload.items) ? payload.items : [];
    items.push(...pageItems.map((item) => normalizeItem(item, query)));

    if (pageItems.length < pageSize) {
      break;
    }
  }

  return items.slice(0, targetCount);
}

module.exports = {
  searchGoogleCse
};
