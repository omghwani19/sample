const crypto = require("node:crypto");

const TIER_SCORE = {
  "Tier 1": 50,
  "Tier 2": 35,
  "Tier 3": 25,
  "Tier 4": 30,
  "Tier 5": 40,
  "Tier 6": 30,
  Extended: 15
};

const INDUSTRY_IMPACT_SIGNALS = [
  "policy",
  "regulation",
  "strategy",
  "infrastructure",
  "investment",
  "expansion",
  "manufacturing",
  "supply chain",
  "MRO",
  "maintenance",
  "SAF",
  "carbon",
  "CORSIA",
  "eVTOL",
  "UAM",
  "security",
  "airspace",
  "airport",
  "fleet",
  "cargo"
];

const ANALYSIS_SIGNALS = [
  "analysis",
  "analyst",
  "outlook",
  "forecast",
  "report",
  "data",
  "market",
  "trend",
  "uncertainty",
  "impact",
  "why",
  "how"
];

const POLICY_RELEASE_SIGNALS = [
  "government",
  "federal",
  "ministry",
  "department",
  "authority",
  "regulator",
  "FAA",
  "EASA",
  "ICAO",
  "IATA",
  "ACI",
  "policy",
  "regulation",
  "rule",
  "standard",
  "airport"
];

function canonicalizeUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    url.hash = "";

    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith("utm_") || ["fbclid", "gclid"].includes(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }

    return url.toString().replace(/\/$/, "");
  } catch (error) {
    return String(rawUrl || "").trim();
  }
}

function createId(value) {
  return crypto.createHash("sha1").update(value).digest("hex").slice(0, 12);
}

function tierNumber(tier) {
  const match = String(tier || "").match(/\d+/);
  return match ? Number(match[0]) : 99;
}

function articleText(candidate) {
  return `${candidate.title || ""} ${candidate.snippet || ""} ${candidate.articleBody || ""}`.trim();
}

function inferSource(candidate, guide) {
  const urlText = `${candidate.url} ${candidate.displayUrl}`.toLowerCase();
  const titleText = String(candidate.title || "").toLowerCase();

  return guide.allSources.find((source) =>
    urlText.includes(source.domain.toLowerCase()) || titleText.includes(source.name.toLowerCase())
  ) || null;
}

function findMatchedTopics(candidate, guide) {
  const haystack = articleText(candidate).toLowerCase();

  return guide.includedTopics
    .filter((topic) => topic.terms.some((term) => haystack.includes(term.toLowerCase())))
    .map((topic) => topic.topic);
}

function isPolicyRelease(candidate, source) {
  const haystack = articleText(candidate).toLowerCase();
  if (source?.tier === "Tier 5") {
    return true;
  }

  return POLICY_RELEASE_SIGNALS.some((signal) => haystack.includes(signal.toLowerCase()));
}

function findExcludedTerms(candidate, guide, source) {
  const haystack = articleText(candidate).toLowerCase();

  return guide.excludedTerms.filter((term) => {
    const normalizedTerm = term.toLowerCase();
    if (!haystack.includes(normalizedTerm)) {
      return false;
    }

    return normalizedTerm !== "press release" || !isPolicyRelease(candidate, source);
  });
}

function findMatchedKeywords(candidate, input) {
  if (input.keywords.length === 0 && candidate.keyword) {
    return [candidate.keyword];
  }

  const haystack = articleText(candidate).toLowerCase();
  return input.keywords.filter((keyword) => haystack.includes(keyword.toLowerCase()));
}

function extractDateInfo(candidate) {
  if (candidate.dateInfo) {
    return String(candidate.dateInfo).slice(0, 64);
  }

  const metatags = candidate.pagemap?.metatags || [];
  const firstMeta = metatags[0] || {};
  const dateFields = [
    "article:published_time",
    "article:modified_time",
    "datePublished",
    "datepublished",
    "pubdate",
    "og:updated_time"
  ];

  for (const field of dateFields) {
    if (firstMeta[field]) {
      return String(firstMeta[field]).slice(0, 32);
    }
  }

  const snippetMatch = String(candidate.snippet || "").match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},\s+\d{4}\b/i);
  return snippetMatch ? snippetMatch[0] : "날짜 정보 없음";
}

function toKoreanDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${byType.year}-${byType.month}-${byType.day}`;
}

function buildDateStatus(candidate, input) {
  if (!input.date) {
    return {
      dateMatched: true,
      dateStatus: "날짜 확인 대상"
    };
  }

  const koreanDate = toKoreanDate(candidate.dateInfo);
  if (koreanDate === input.date) {
    return {
      dateMatched: true,
      dateStatus: "선택 날짜 일치"
    };
  }

  return {
    dateMatched: false,
    dateStatus: koreanDate ? `날짜 확인 필요: ${koreanDate}` : "날짜 확인 필요"
  };
}

function hasSignal(candidate, signals) {
  const haystack = articleText(candidate).toLowerCase();
  return signals.some((signal) => haystack.includes(signal.toLowerCase()));
}

function scoreCandidate({ source, dateMatched, matchedTopics, excludedTerms, hasIndustryImpact, isAnalysis }) {
  let score = 0;

  score += TIER_SCORE[source?.tier] || 0;
  score += dateMatched ? 30 : -50;
  score += matchedTopics.length ? 30 : 0;
  score += isAnalysis ? 15 : 0;
  score += hasIndustryImpact ? 20 : 0;

  if (excludedTerms.length) {
    score -= 100;
  }

  return score;
}

function buildExcludeReason({ date, source, matchedTopics, excludedTerms }) {
  const reasons = [];

  if (!date.dateMatched) {
    reasons.push("게시일 불일치 또는 원문 날짜 확인 필요");
  }

  if (!source) {
    reasons.push("GAT 매체 DB에서 확인되지 않음");
  }

  if (!matchedTopics.length) {
    reasons.push("GAT 주제 직접성 부족");
  }

  if (excludedTerms.length) {
    reasons.push(`제외 신호: ${excludedTerms.join(", ")}`);
  }

  return reasons.join("; ") || null;
}

function classifyPriority({ date, source, matchedTopics, excludedTerms, score }) {
  const excludeReason = buildExcludeReason({ date, source, matchedTopics, excludedTerms });

  if (excludeReason) {
    return {
      priorityBucket: "Exclude",
      priorityLabel: "Exclude 제외/보류",
      excludeReason
    };
  }

  if (score >= 100) {
    return {
      priorityBucket: "A",
      priorityLabel: "A 우선 검토",
      excludeReason: null
    };
  }

  return {
    priorityBucket: "B",
    priorityLabel: "B 추가 검토",
    excludeReason: null
  };
}

function buildSelectionReason({ source, matchedKeywords, matchedTopics, hasIndustryImpact, isAnalysis }) {
  const reasons = [];

  if (source) {
    reasons.push(`${source.tier} 매체: ${source.name}`);
  }

  if (matchedKeywords.length) {
    reasons.push(`검색 패턴: ${matchedKeywords.slice(0, 3).join(", ")}`);
  }

  if (matchedTopics.length) {
    reasons.push(`GAT 주제: ${matchedTopics.slice(0, 2).join(", ")}`);
  }

  if (hasIndustryImpact) {
    reasons.push("산업 영향 신호 있음");
  }

  if (isAnalysis) {
    reasons.push("분석/자료 성격");
  }

  return reasons.join("; ") || "편집자 검토 필요";
}

function normalizeCandidate(candidate, guide, input) {
  const url = canonicalizeUrl(candidate.url);
  const source = inferSource(candidate, guide);
  const matchedKeywords = findMatchedKeywords(candidate, input);
  const matchedTopics = findMatchedTopics(candidate, guide);
  const excludedTerms = findExcludedTerms(candidate, guide, source);
  const dateInfo = extractDateInfo(candidate);
  const date = buildDateStatus({ ...candidate, dateInfo }, input);
  const hasIndustryImpact = hasSignal(candidate, INDUSTRY_IMPACT_SIGNALS);
  const isAnalysis = hasSignal(candidate, ANALYSIS_SIGNALS);
  const score = scoreCandidate({
    source,
    dateMatched: date.dateMatched,
    matchedTopics,
    excludedTerms,
    hasIndustryImpact,
    isAnalysis
  });
  const priority = classifyPriority({ date, source, matchedTopics, excludedTerms, score });

  return {
    id: createId(url),
    title: candidate.title || "제목 없는 결과",
    url,
    displayUrl: candidate.displayUrl || url,
    source: source?.name || candidate.displayUrl || "알 수 없는 매체",
    tier: source?.tier || "미분류",
    dateInfo,
    snippet: candidate.snippet || "",
    articleBody: candidate.articleBody || "",
    matchedKeywords,
    matchedTopics,
    gatTopic: matchedTopics[0] || null,
    excludedTerms,
    excludeReason: priority.excludeReason,
    selectionReason: buildSelectionReason({ source, matchedKeywords, matchedTopics, hasIndustryImpact, isAnalysis }),
    score,
    priority: score,
    priorityBucket: priority.priorityBucket,
    priorityLabel: priority.priorityLabel,
    dateMatched: date.dateMatched,
    dateStatus: date.dateStatus,
    hasIndustryImpact,
    isAnalysis,
    queryUsed: candidate.queryUsed || "",
    googleNewsUrl: candidate.googleNewsUrl || "",
    urlResolutionMethod: candidate.urlResolutionMethod || "",
    urlResolutionStatus: candidate.urlResolutionStatus || "",
    urlResolutionError: candidate.urlResolutionError || "",
    articleDateInfo: candidate.articleDateInfo || "",
    articleDateVerificationStatus: candidate.articleDateVerificationStatus || "",
    articleDateVerificationSource: candidate.articleDateVerificationSource || "",
    articleDateVerificationError: candidate.articleDateVerificationError || ""
  };
}

function rankCandidates(rawResults, guide, input) {
  const byUrl = new Map();
  let dateMismatchCount = 0;

  for (const candidate of rawResults) {
    if (!candidate.url) {
      continue;
    }

    const normalized = normalizeCandidate(candidate, guide, input);
    if (!normalized.dateMatched) {
      dateMismatchCount += 1;
      if (!input.includeDateMismatches) {
        continue;
      }
    }

    if (normalized.tier === "미분류") {
      continue;
    }

    const existing = byUrl.get(normalized.url);
    if (!existing || normalized.score > existing.score) {
      byUrl.set(normalized.url, normalized);
    } else {
      existing.matchedKeywords = [...new Set([...existing.matchedKeywords, ...normalized.matchedKeywords])];
      existing.matchedTopics = [...new Set([...existing.matchedTopics, ...normalized.matchedTopics])];
    }
  }

  const priorityOrder = { A: 0, B: 1, Exclude: 2 };
  const results = [...byUrl.values()].sort((left, right) => {
    const priorityDelta = priorityOrder[left.priorityBucket] - priorityOrder[right.priorityBucket];
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    const tierDelta = tierNumber(left.tier) - tierNumber(right.tier);
    if (tierDelta !== 0) {
      return tierDelta;
    }

    return right.score - left.score;
  });

  return {
    results,
    summary: {
      rawCount: rawResults.length,
      resultCount: results.length,
      duplicateCount: Math.max(0, rawResults.length - results.length),
      dateMismatchCount,
      includedDateMismatchCount: results.filter((result) => !result.dateMatched).length,
      exactDateCount: results.filter((result) => result.dateMatched).length,
      reviewCarefullyCount: results.filter((result) => result.priorityBucket === "B").length,
      priorityACount: results.filter((result) => result.priorityBucket === "A").length,
      priorityBCount: results.filter((result) => result.priorityBucket === "B").length,
      excludedCount: results.filter((result) => result.priorityBucket === "Exclude").length
    }
  };
}

module.exports = {
  rankCandidates
};
