const crypto = require("node:crypto");

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

function inferSource(candidate, guide) {
  const urlText = `${candidate.url} ${candidate.displayUrl}`.toLowerCase();
  const titleText = String(candidate.title || "").toLowerCase();

  return guide.allSources.find((source) =>
    urlText.includes(source.domain.toLowerCase()) || titleText.includes(source.name.toLowerCase())
  ) || null;
}

function findMatchedTopics(candidate, guide) {
  const haystack = `${candidate.title || ""} ${candidate.snippet || ""}`.toLowerCase();

  return guide.includedTopics
    .filter((topic) => topic.terms.some((term) => haystack.includes(term.toLowerCase())))
    .map((topic) => topic.topic);
}

function findExcludedTerms(candidate, guide) {
  const haystack = `${candidate.title || ""} ${candidate.snippet || ""}`.toLowerCase();
  return guide.excludedTerms.filter((term) => haystack.includes(term.toLowerCase()));
}

function findMatchedKeywords(candidate, input) {
  if (input.keywords.length === 0 && candidate.keyword) {
    return [candidate.keyword];
  }

  const haystack = `${candidate.title || ""} ${candidate.snippet || ""}`.toLowerCase();
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

function tierNumber(tier) {
  const match = String(tier || "").match(/\d+/);
  return match ? Number(match[0]) : 99;
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

function matchesSelectedDate(candidate, input) {
  if (!input.date) {
    return true;
  }

  return toKoreanDate(candidate.dateInfo) === input.date;
}

function buildDateStatus(candidate, input) {
  if (!input.date) {
    return {
      dateMatched: true,
      dateStatus: "날짜 확인 안 함"
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

function scoreCandidate({ source, matchedKeywords, matchedTopics, excludedTerms }) {
  let score = 0;

  if (source) {
    score += source.tier === "Extended" ? 15 : 60 - tierNumber(source.tier) * 5;
  }

  score += matchedKeywords.length * 15;
  score += matchedTopics.length * 10;
  score -= excludedTerms.length * 25;

  return score;
}

function buildSelectionReason({ source, matchedKeywords, matchedTopics, excludedTerms }) {
  const reasons = [];

  if (source) {
    reasons.push(`${source.tier} 매체: ${source.name}`);
  }

  if (matchedKeywords.length) {
    reasons.push(`검색 그룹: ${matchedKeywords.join(", ")}`);
  }

  if (matchedTopics.length) {
    reasons.push(`GAT 주제: ${matchedTopics.slice(0, 2).join(", ")}`);
  }

  if (excludedTerms.length) {
    reasons.push(`주의 검토: ${excludedTerms.join(", ")}`);
  }

  return reasons.join("; ") || "편집자 검토 필요";
}

function normalizeCandidate(candidate, guide, input) {
  const url = canonicalizeUrl(candidate.url);
  const source = inferSource(candidate, guide);
  const matchedKeywords = findMatchedKeywords(candidate, input);
  const matchedTopics = findMatchedTopics(candidate, guide);
  const excludedTerms = findExcludedTerms(candidate, guide);
  const score = scoreCandidate({ source, matchedKeywords, matchedTopics, excludedTerms });
  const date = buildDateStatus(candidate, input);
  const priorityLabel = !date.dateMatched ? "날짜 확인 필요" : excludedTerms.length ? "주의 검토" : "후보";

  return {
    id: createId(url),
    title: candidate.title || "제목 없는 결과",
    url,
    displayUrl: candidate.displayUrl || url,
    source: source?.name || candidate.displayUrl || "알 수 없는 매체",
    tier: source?.tier || "미분류",
    dateInfo: extractDateInfo(candidate),
    snippet: candidate.snippet || "",
    matchedKeywords,
    matchedTopics,
    excludedTerms,
    selectionReason: buildSelectionReason({ source, matchedKeywords, matchedTopics, excludedTerms }),
    priority: date.dateMatched ? score : score - 8,
    priorityLabel,
    dateMatched: date.dateMatched,
    dateStatus: date.dateStatus,
    queryUsed: candidate.queryUsed || ""
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

    if (!existing || normalized.priority > existing.priority) {
      byUrl.set(normalized.url, normalized);
    } else {
      existing.matchedKeywords = [...new Set([...existing.matchedKeywords, ...normalized.matchedKeywords])];
      existing.matchedTopics = [...new Set([...existing.matchedTopics, ...normalized.matchedTopics])];
    }
  }

  const results = [...byUrl.values()].sort((left, right) => {
    if (left.dateMatched !== right.dateMatched) {
      return left.dateMatched ? -1 : 1;
    }

    const tierDelta = tierNumber(left.tier) - tierNumber(right.tier);
    if (tierDelta !== 0) {
      return tierDelta;
    }
    return right.priority - left.priority;
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
      reviewCarefullyCount: results.filter((result) => result.excludedTerms.length > 0).length
    }
  };
}

module.exports = {
  rankCandidates
};
