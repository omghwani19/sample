const http = require("node:http");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");

const { loadRuntimeConfig, getStatusPayload } = require("./src/config");
const { loadGuideConfig } = require("./src/guide-config");
const { buildSearchQueries, normalizeSearchInput } = require("./src/search-query-builder");
const { searchGoogleCse } = require("./src/google-cse");
const { searchGoogleNewsRss } = require("./src/google-news-rss");
const { rankCandidates } = require("./src/article-filter");
const { resolveArticleUrls } = require("./src/article-url-resolver");
const { enrichArticleMetadata } = require("./src/article-metadata-fetcher");
const { findLatestReport, writeHtmlReport } = require("./src/report-writer");

const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const REPORTS_DIR = path.join(ROOT_DIR, "reports");
const SERVER_CONFIG = loadRuntimeConfig(ROOT_DIR);
const PORT = Number(process.env.PORT || SERVER_CONFIG.port || 4173);
const JSON_LIMIT_BYTES = 1024 * 1024;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload, null, 2));
}

function sendText(response, statusCode, message) {
  response.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(message);
}

function parseRequestUrl(request) {
  return new URL(request.url, `http://${request.headers.host || "localhost"}`);
}

function assertInside(baseDir, targetPath) {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(targetPath);
  return resolvedTarget === resolvedBase || resolvedTarget.startsWith(resolvedBase + path.sep);
}

function isValidDateInput(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function canonicalizeResultUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch (error) {
    return String(rawUrl || "").trim();
  }
}

function dedupeSearchResults(results) {
  const byUrl = new Map();

  for (const result of results) {
    const key = canonicalizeResultUrl(result.url);
    if (!key || byUrl.has(key)) {
      continue;
    }

    byUrl.set(key, result);
  }

  return [...byUrl.values()];
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

function selectSearchProvider(runtimeConfig) {
  if (runtimeConfig.searchProvider === "google-cse") {
    return {
      name: "Google Custom Search JSON API",
      search: (params) => searchGoogleCse({
        runtimeConfig,
        ...params
      })
    };
  }

  return {
    name: "Google News RSS",
    search: (params) => searchGoogleNewsRss(params)
  };
}

async function readJsonBody(request) {
  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    totalBytes += chunk.length;
    if (totalBytes > JSON_LIMIT_BYTES) {
      const error = new Error("요청 본문이 너무 큽니다.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    error.statusCode = 400;
    error.message = "요청 본문은 올바른 JSON이어야 합니다.";
    throw error;
  }
}

async function serveStaticFile(request, response, baseDir, relativePath) {
  const cleanRelativePath = decodeURIComponent(relativePath).replace(/^[/\\]+/, "");
  const targetPath = path.join(baseDir, cleanRelativePath || "index.html");

  if (!assertInside(baseDir, targetPath)) {
    sendText(response, 403, "접근할 수 없습니다.");
    return;
  }

  try {
    const stats = await fsp.stat(targetPath);
    if (stats.isDirectory()) {
      await serveStaticFile(request, response, baseDir, path.join(cleanRelativePath, "index.html"));
      return;
    }

    const ext = path.extname(targetPath).toLowerCase();
    response.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Cache-Control": ext === ".html" ? "no-store" : "public, max-age=300"
    });
    fs.createReadStream(targetPath).pipe(response);
  } catch (error) {
    sendText(response, 404, "찾을 수 없습니다.");
  }
}

async function handleStatus(response) {
  const runtimeConfig = loadRuntimeConfig(ROOT_DIR);
  const guide = await loadGuideConfig(runtimeConfig);
  const latestReport = await findLatestReport(REPORTS_DIR);

  sendJson(response, 200, {
    ...getStatusPayload(runtimeConfig, guide),
    latestReport
  });
}

async function handlePreview(request, response) {
  const runtimeConfig = loadRuntimeConfig(ROOT_DIR);
  const guide = await loadGuideConfig(runtimeConfig);
  const body = await readJsonBody(request);
  const input = normalizeSearchInput(body);
  const queries = buildSearchQueries(input, guide);

  sendJson(response, 200, {
    input,
    queryCount: queries.length,
    queries: queries.slice(0, 20)
  });
}

async function handleSearch(request, response) {
  const runtimeConfig = loadRuntimeConfig(ROOT_DIR);
  const guide = await loadGuideConfig(runtimeConfig);
  const body = await readJsonBody(request);
  const input = normalizeSearchInput(body);
  const warnings = [];

  if (!input.date) {
    sendJson(response, 400, {
      error: "검색 날짜가 필요합니다."
    });
    return;
  }

  if (!isValidDateInput(input.date)) {
    sendJson(response, 400, {
      error: "검색 날짜는 YYYY-MM-DD 형식의 실제 날짜여야 합니다."
    });
    return;
  }

  const searchProvider = selectSearchProvider(runtimeConfig);
  if (runtimeConfig.searchProvider === "google-cse" && (!runtimeConfig.googleApiKey || !runtimeConfig.googleCseId)) {
    sendJson(response, 400, {
      error: "Google API 설정이 필요합니다. .env에 GOOGLE_API_KEY와 GOOGLE_CSE_ID를 입력하세요.",
      missingConfig: [
        ...(!runtimeConfig.googleApiKey ? ["GOOGLE_API_KEY"] : []),
        ...(!runtimeConfig.googleCseId ? ["GOOGLE_CSE_ID"] : [])
      ]
    });
    return;
  }

  const queries = buildSearchQueries(input, guide);
  if (queries.length === 0) {
    sendJson(response, 400, {
      error: "선택한 조건으로 생성할 수 있는 검색 쿼리가 없습니다."
    });
    return;
  }

  const searchResults = await mapWithConcurrency(queries, 6, async (query) => {
    try {
      const items = await searchProvider.search({
        query,
        startDate: input.startDate,
        endDate: input.endDate,
        maxResults: input.maxResultsPerQuery
      });
      return { query, items, error: null };
    } catch (error) {
      return { query, items: [], error: error.message };
    }
  });

  const rawResults = [];
  for (const resultSet of searchResults) {
    if (resultSet.error) {
      warnings.push({
        query: resultSet.query.query,
        message: resultSet.error
      });
      continue;
    }

    for (const item of resultSet.items) {
      rawResults.push({
        ...item,
        keyword: item.keyword || resultSet.query.keyword,
        tier: item.tier || resultSet.query.tier,
        topics: item.topics || resultSet.query.topics,
        queryUsed: resultSet.query.query
      });
    }
  }

  const dedupedRawResults = dedupeSearchResults(rawResults);
  const resolved = await resolveArticleUrls(dedupedRawResults);
  const enriched = await enrichArticleMetadata(resolved.results, {
    fetchLimit: input.maxArticleFetches
  });
  const ranked = rankCandidates(enriched.results, guide, input);
  if (ranked.results.length === 0) {
    if (rawResults.length === 0) {
      warnings.push({
        query: "all",
        message: `${searchProvider.name}에서 검색 후보를 찾지 못했습니다. 날짜나 결과 수를 조정해 다시 확인해보세요.`
      });
    } else if (ranked.summary.dateMismatchCount > 0) {
      warnings.push({
        query: "date-filter",
        message: `${ranked.summary.dateMismatchCount}건은 검색 결과의 게시일 정보가 선택 날짜와 달라 제외했습니다.`
      });
    }
  }

  const summary = {
    ...ranked.summary,
    rawCount: rawResults.length,
    dedupedRawCount: dedupedRawResults.length,
    ...resolved.summary,
    ...enriched.summary
  };
  const report = await writeHtmlReport({
    rootDir: ROOT_DIR,
    reportsDir: REPORTS_DIR,
    input,
    guide,
    queries,
    results: ranked.results,
    summary,
    warnings,
    generatedAt: new Date()
  });

  sendJson(response, 200, {
    results: ranked.results,
    summary,
    queries,
    warnings,
    reportPath: report.relativePath,
    reportUrl: report.url
  });
}

async function handleRequest(request, response) {
  try {
    const url = parseRequestUrl(request);

    if (request.method === "GET" && url.pathname === "/api/status") {
      await handleStatus(response);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/preview") {
      await handlePreview(request, response);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/search") {
      await handleSearch(request, response);
      return;
    }

    if (request.method === "GET" && url.pathname.startsWith("/reports/")) {
      await serveStaticFile(request, response, REPORTS_DIR, url.pathname.replace("/reports/", ""));
      return;
    }

    if (request.method === "GET") {
      await serveStaticFile(request, response, PUBLIC_DIR, url.pathname === "/" ? "index.html" : url.pathname);
      return;
    }

    sendText(response, 405, "허용되지 않는 요청 방식입니다.");
  } catch (error) {
    const statusCode = error.statusCode || 500;
    sendJson(response, statusCode, {
      error: error.message || "예상하지 못한 서버 오류가 발생했습니다."
    });
  }
}

const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`GAT 기사 검색 앱이 실행 중입니다: http://localhost:${PORT}`);
});
