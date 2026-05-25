const DEFAULT_MAX_RESULTS = 5;
const MAX_RSS_RESULTS = 250;
const TOPIC_GROUP_SIZE = 3;

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

  return {
    date,
    keywords,
    searchMode: keywords.length > 0 ? "custom" : "guide",
    searchLabel: keywords.length > 0 ? keywords.join(", ") : "GUIDE 전체 기준",
    includeDateMismatches,
    tierScope,
    maxResultsPerQuery
  };
}

function buildTopicClause() {
  return "(aviation OR airline OR airport OR aircraft OR SAF OR eVTOL OR UAM OR MRO)";
}

function formatSearchTerm(term) {
  const cleanTerm = String(term || "").trim();
  if (!cleanTerm) {
    return "";
  }

  return cleanTerm.includes(" ") ? `"${cleanTerm}"` : cleanTerm;
}

function buildGuideSearchGroups(guide) {
  const groups = [];

  for (let index = 0; index < guide.includedTopics.length; index += TOPIC_GROUP_SIZE) {
    const topics = guide.includedTopics.slice(index, index + TOPIC_GROUP_SIZE);
    const terms = unique(topics.flatMap((topic) => topic.terms).map(formatSearchTerm));
    groups.push({
      label: topics.map((topic) => topic.topic).join(" / "),
      clause: `(${terms.join(" OR ")})`,
      topics: topics.map((topic) => topic.topic)
    });
  }

  return groups;
}

function buildCustomSearchGroups(input) {
  return input.keywords.map((keyword) => ({
    label: keyword,
    clause: [`"${keyword}"`, buildTopicClause()].join(" "),
    topics: []
  }));
}

function buildSearchQueries(input, guide) {
  if (!input.date) {
    return [];
  }

  const selectedSources = guide.allSources.filter((source) => input.tierScope.includes(source.tier));
  const queries = [];
  const searchGroups = input.searchMode === "custom"
    ? buildCustomSearchGroups(input)
    : buildGuideSearchGroups(guide);

  for (const searchGroup of searchGroups) {
    queries.push({
      query: searchGroup.clause,
      keyword: searchGroup.label,
      topics: searchGroup.topics,
      tier: "RSS",
      sources: selectedSources.map((source) => source.name),
      date: input.date
    });
  }

  return queries;
}

module.exports = {
  normalizeSearchInput,
  buildSearchQueries
};
