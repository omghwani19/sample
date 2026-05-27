const DEFAULT_MAX_RESULTS = 10;
const MAX_RSS_RESULTS = 250;
const DEFAULT_QUERY_LIMIT = 60;
const DEFAULT_ARTICLE_FETCH_LIMIT = 24;
const TOPIC_KEYWORD_LIMIT_PER_SOURCE = 3;

const TOPIC_KEYWORDS = [
  "aviation policy",
  "aviation regulation",
  "airline strategy",
  "airport infrastructure",
  "airport expansion",
  "MRO",
  "aircraft manufacturing",
  "supply chain",
  "SAF",
  "carbon compliance",
  "CORSIA",
  "eVTOL",
  "UAM",
  "airspace disruption",
  "aviation security",
  "digital aviation",
  "air cargo"
];

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function addDays(dateValue, days) {
  const [year, month, day] = String(dateValue || "").split("-").map(Number);
  if (!year || !month || !day) {
    return dateValue;
  }

  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function parseKeywords(value) {
  if (Array.isArray(value)) {
    return unique(value.map((item) => String(item).trim()).filter(Boolean));
  }

  return unique(
    String(value || "")
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function normalizeSearchInput(body) {
  const startDate = String(body.startDate || body.date || "").trim();
  const endDate = String(body.endDate || body.date || startDate).trim();
  const keywords = parseKeywords(body.keywords);
  const includeDateMismatches = body.includeDateMismatches === true;
  const tierScope = Array.isArray(body.tierScope) && body.tierScope.length > 0
    ? body.tierScope.map(String)
    : ["Tier 1", "Tier 2", "Tier 3", "Tier 4", "Tier 5", "Tier 6", "Extended"];

  const requestedMax = Number(body.maxResultsPerQuery || DEFAULT_MAX_RESULTS);
  const maxResultsPerQuery = Math.max(1, Math.min(MAX_RSS_RESULTS, Number.isFinite(requestedMax) ? requestedMax : DEFAULT_MAX_RESULTS));
  const requestedArticleFetches = Number(body.maxArticleFetches || DEFAULT_ARTICLE_FETCH_LIMIT);
  const maxArticleFetches = Math.max(0, Math.min(100, Number.isFinite(requestedArticleFetches) ? requestedArticleFetches : DEFAULT_ARTICLE_FETCH_LIMIT));
  const normalizedStartDate = startDate && endDate && endDate < startDate ? endDate : startDate;
  const normalizedEndDate = startDate && endDate && endDate < startDate ? startDate : endDate;

  return {
    date: normalizedStartDate,
    startDate: normalizedStartDate,
    endDate: normalizedEndDate || normalizedStartDate,
    keywords,
    searchMode: keywords.length > 0 ? "custom" : "guide",
    searchLabel: keywords.length > 0
      ? keywords.join(", ")
      : normalizedStartDate === normalizedEndDate
        ? `GUIDE 전체 기준 · ${normalizedStartDate}`
        : `GUIDE 전체 기준 · ${normalizedStartDate} ~ ${normalizedEndDate}`,
    includeDateMismatches,
    tierScope,
    maxResultsPerQuery,
    maxArticleFetches,
    maxQueries: DEFAULT_QUERY_LIMIT
  };
}

function formatSearchTerm(term) {
  const cleanTerm = String(term || "").trim();
  if (!cleanTerm) {
    return "";
  }

  return cleanTerm.includes(" ") ? `"${cleanTerm}"` : cleanTerm;
}

function buildDateClause(startDate, endDate) {
  const normalizedStart = String(startDate || "").trim();
  const normalizedEnd = String(endDate || normalizedStart).trim();
  if (!normalizedStart) {
    return "";
  }

  const end = normalizedEnd || normalizedStart;
  return `after:${normalizedStart} before:${addDays(end, 1)}`;
}

function flattenTopicKeywords(guide) {
  return unique([
    ...TOPIC_KEYWORDS,
    ...guide.includedTopics.flatMap((topic) => topic.terms)
  ]);
}

function findTopicsForKeyword(keyword, guide) {
  const normalizedKeyword = keyword.toLowerCase();
  return guide.includedTopics
    .filter((topic) => topic.terms.some((term) => {
      const normalizedTerm = term.toLowerCase();
      return normalizedKeyword.includes(normalizedTerm) || normalizedTerm.includes(normalizedKeyword);
    }))
    .map((topic) => topic.topic);
}

function pushQuery(queries, seen, query) {
  if (!query.query || seen.has(query.query)) {
    return;
  }

  seen.add(query.query);
  queries.push(query);
}

function buildSearchQueries(input, guide) {
  if (!input.startDate) {
    return [];
  }

  const selectedSources = guide.allSources.filter((source) => input.tierScope.includes(source.tier));
  const queries = [];
  const seen = new Set();
  const dateClause = buildDateClause(input.startDate, input.endDate);
  const keywords = input.searchMode === "custom" ? input.keywords : flattenTopicKeywords(guide);
  const queryLimit = input.maxQueries || DEFAULT_QUERY_LIMIT;

  for (const source of selectedSources) {
    pushQuery(queries, seen, {
      query: [`site:${source.domain}`, dateClause, "aviation"].filter(Boolean).join(" "),
      keyword: "date + aviation",
      topics: [],
      tier: source.tier,
      source: source.name,
      domain: source.domain,
      date: input.startDate,
      searchPattern: "site-date-range"
    });

    for (const keyword of keywords.slice(0, TOPIC_KEYWORD_LIMIT_PER_SOURCE)) {
      const formattedKeyword = formatSearchTerm(keyword);
      pushQuery(queries, seen, {
        query: [`site:${source.domain}`, dateClause, formattedKeyword].filter(Boolean).join(" "),
        keyword,
        topics: findTopicsForKeyword(keyword, guide),
        tier: source.tier,
        source: source.name,
        domain: source.domain,
        date: input.startDate,
        searchPattern: "site-date-topic"
      });

      if (queries.length >= queryLimit) {
        return queries;
      }
    }
  }

  return queries;
}

module.exports = {
  normalizeSearchInput,
  buildSearchQueries
};
