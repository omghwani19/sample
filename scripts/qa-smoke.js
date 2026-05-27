const { spawn } = require("node:child_process");
const fs = require("node:fs/promises");
const path = require("node:path");
const { extractArticleDate, extractArticleText } = require("../src/article-metadata-fetcher");

const PORT = "4191";
const BASE_URL = `http://localhost:${PORT}`;
const QA_DATE = "2025-11-09";

function addDays(dateValue, days) {
  const [year, month, day] = String(dateValue).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function waitForServer() {
  const startedAt = Date.now();
  let lastError;

  while (Date.now() - startedAt < 10000) {
    try {
      const response = await fetch(`${BASE_URL}/api/status`);
      if (response.ok) {
        return response.json();
      }
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw lastError || new Error("QA server did not start in time.");
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error || "Request failed.");
  }

  return body;
}

async function runQa() {
  const child = spawn(process.execPath, ["server.js"], {
    cwd: path.resolve(__dirname, ".."),
    env: {
      ...process.env,
      PORT
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });

  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
  });

  try {
    const status = await waitForServer();
    assert(status.searchProvider === "Google News RSS", "Default search provider should be Google News RSS.");
    assert(status.topicCount > 0, "Could not load guide topics.");

    const homeResponse = await fetch(BASE_URL);
    assert(homeResponse.ok, "Could not fetch the home page HTML.");
    const homeHtml = await homeResponse.text();
    assert(homeHtml.includes("GAT 기사 검색"), "Home page title is incorrect.");
    assert(homeHtml.includes("원문 날짜 확인 수"), "Original date verification option is missing from the home page.");

    const sampleHtml = [
      "<html><head>",
      "<meta property=\"article:published_time\" content=\"2026-05-18T10:00:00Z\">",
      "<meta name=\"description\" content=\"Aviation policy and airport infrastructure analysis.\">",
      "</head><body><p>This aviation policy article discusses airport infrastructure investment and SAF compliance in detail.</p></body></html>"
    ].join("");
    const sampleDate = extractArticleDate(sampleHtml);
    assert(sampleDate.dateInfo === "2026-05-18T10:00:00Z", "Original article date extraction failed.");
    assert(extractArticleText(sampleHtml).includes("airport infrastructure"), "Original article body extraction failed.");

    const preview = await postJson(`${BASE_URL}/api/preview`, {
      startDate: QA_DATE,
      endDate: addDays(QA_DATE, 2),
      maxResultsPerQuery: 20
    });
    assert(preview.queryCount > 0, "No search queries were generated.");
    assert(preview.queries.every((query) => query.query.includes("site:")), "Generated queries do not use site-based search.");

    const search = await postJson(`${BASE_URL}/api/search`, {
      startDate: QA_DATE,
      endDate: addDays(QA_DATE, 2),
      maxResultsPerQuery: 10,
      maxArticleFetches: 12,
      includeDateMismatches: false
    });
    assert(search.reportUrl, "HTML report URL was not generated.");
    assert(search.summary.rawCount >= search.summary.resultCount, "Search summary counts are inconsistent.");

    const reportResponse = await fetch(`${BASE_URL}${search.reportUrl}`);
    assert(reportResponse.ok, "Generated report could not be fetched.");
    const reportHtml = await reportResponse.text();
    assert(reportHtml.includes("GAT 기사 리포트"), "Report HTML content is incorrect.");

    if (search.results.length > 0) {
      assert(search.results.every((result) => result.url && /^https?:\/\//.test(result.url)), "Article URLs are invalid.");
    }

    const result = {
      provider: status.searchProvider,
      guideLoaded: status.guideLoaded,
      apiConfigured: true,
      queryCount: preview.queryCount,
      resultCount: search.summary.resultCount,
      exactDateCount: search.summary.exactDateCount,
      includedDateMismatchCount: search.summary.includedDateMismatchCount,
      rawCount: search.summary.rawCount,
      dateMismatchCount: search.summary.dateMismatchCount,
      urlResolvedCount: search.summary.urlResolvedCount,
      articleDateVerifiedCount: search.summary.articleDateVerifiedCount,
      articleDateFailedCount: search.summary.articleDateFailedCount,
      reportUrl: search.reportUrl
    };

    await fs.writeFile(path.resolve(__dirname, "..", "reports", "qa-smoke-last.json"), JSON.stringify(result, null, 2), "utf8");
    console.log(JSON.stringify(result, null, 2));
  } finally {
    child.kill();
    if (stderr.trim()) {
      console.error(stderr.trim());
    }
  }
}

runQa().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
