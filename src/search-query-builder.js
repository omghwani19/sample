const DEFAULT_MAX_RESULTS = 5;
const MAX_RSS_RESULTS = 250;
const DEFAULT_QUERY_LIMIT = 120;
const DEFAULT_ARTICLE_FETCH_LIMIT = 60;

const DATE_VARIANT_LIMIT_FOR_TOPIC_SEARCH = 2;
const GENERAL_DATE_VARIANT_LIMIT = 5;
const INITIAL_GENERAL_DATE_VARIANT_LIMIT = 2;
const TOPIC_KEYWORD_LIMIT_PER_SOURCE = 4;

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
  const date = String(body.date || "").trim();
  const keywords = parseKeywords(body.keywords);
  const includeDateMismatches = body.includeDateMismatches === true;
  const tierScope = Array.isArray(body.tierScope) && body.tierScope.length > 0
    ? body.tierScope.map(String)
    : ["Tier 1", "Tier 2", "Tier 3", "Tier 4", "Tier 5", "Tier 6", "Extended"];

  const requestedMax = Number(body.maxResultsPerQuery || DEFAULT_MAX_RESULTS);
  const maxResultsPerQuery = Math.max(1, Math.min(MAX_RSS_RESULTS, Number.isFinite(requestedMax) ? requestedMax : DEFAULT_MAX_RESULTS));
  const requestedArticleFetches = Number(body.maxArticleFetches || DEFAULT_ARTICLE_FETCH_LIMIT);
  const maxArticleFetches = Math.max(0, Math.min(100, Number.isFinite(requestedArticleFetches) ? requestedArticleFetches : DEFAULT_ARTICLE_FETCH_LIMIT));

  return {
    date,
    keywords,
    searchMode: keywords.length > 0 ? "custom" : "guide",
    searchLabel: keywords.length > 0 ? keywords.join(", ") : "GUIDE 전체 기준",
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

function formatDateLong(targetDate) {
  const date = new Date(`${targetDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return targetDate;
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function formatDateDayMonth(targetDate) {
  const date = new Date(`${targetDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return targetDate;
  }

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

function buildDateVariants(targetDate) {
  const longDate = formatDateLong(targetDate);
  const dayMonthDate = formatDateDayMonth(targetDate);

  return unique([
    `"${longDate}"`,
    `"${dayMonthDate}"`,
    `"${targetDate}"`,
    `"published ${dayMonthDate}"`,
    `"W/C ${longDate}"`
  ]);
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
  if (!input.date) {
    return [];
  }

  const selectedSources = guide.allSources.filter((source) => input.tierScope.includes(source.tier));
  const queries = [];
  const seen = new Set();
  const dateVariants = buildDateVariants(input.date);
  const keywords = input.searchMode === "custom" ? input.keywords : flattenTopicKeywords(guide);
  const queryLimit = input.maxQueries || DEFAULT_QUERY_LIMIT;

  for (const source of selectedSources) {
    for (const dateVariant of dateVariants.slice(0, INITIAL_GENERAL_DATE_VARIANT_LIMIT)) {
      pushQuery(queries, seen, {
        query: `site:${source.domain} ${dateVariant} aviation`,
        keyword: "date + aviation",
        topics: [],
        tier: source.tier,
        source: source.name,
        domain: source.domain,
        date: input.date,
        searchPattern: "site-date"
      });

      if (queries.length >= queryLimit) {
        return queries;
      }
    }

    for (const dateVariant of dateVariants.slice(0, DATE_VARIANT_LIMIT_FOR_TOPIC_SEARCH)) {
      for (const keyword of keywords.slice(0, TOPIC_KEYWORD_LIMIT_PER_SOURCE)) {
        const formattedKeyword = formatSearchTerm(keyword);
        pushQuery(queries, seen, {
          query: `site:${source.domain} ${dateVariant} ${formattedKeyword}`,
          keyword,
          topics: findTopicsForKeyword(keyword, guide),
          tier: source.tier,
          source: source.name,
          domain: source.domain,
          date: input.date,
          searchPattern: "site-date-topic"
        });

        if (queries.length >= queryLimit) {
          return queries;
        }
      }
    }

    for (const dateVariant of dateVariants.slice(INITIAL_GENERAL_DATE_VARIANT_LIMIT, GENERAL_DATE_VARIANT_LIMIT)) {
      pushQuery(queries, seen, {
        query: `site:${source.domain} ${dateVariant} aviation`,
        keyword: "date + aviation",
        topics: [],
        tier: source.tier,
        source: source.name,
        domain: source.domain,
        date: input.date,
        searchPattern: "site-date"
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
