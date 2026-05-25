const { spawn } = require("node:child_process");
const fs = require("node:fs/promises");
const path = require("node:path");

const PORT = "4191";
const BASE_URL = `http://localhost:${PORT}`;
const QA_DATE = "2025-11-09";

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

  throw lastError || new Error("QA 서버가 시간 안에 시작되지 않았습니다.");
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
    throw new Error(body.error || "요청이 실패했습니다.");
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
    assert(status.apiConfigured === true, "검색 제공자가 준비되지 않았습니다.");
    assert(status.searchProvider === "Google News RSS", "검색 제공자가 Google News RSS가 아닙니다.");
    assert(status.topicCount > 0, "GUIDE 주제 설정을 찾지 못했습니다.");

    const preview = await postJson(`${BASE_URL}/api/preview`, {
      date: QA_DATE,
      maxResultsPerQuery: 20
    });
    assert(preview.queryCount === 3, "GUIDE 검색 쿼리 수가 예상과 다릅니다.");

    const search = await postJson(`${BASE_URL}/api/search`, {
      date: QA_DATE,
      maxResultsPerQuery: 20,
      includeDateMismatches: false
    });
    assert(search.reportUrl, "HTML 리포트 URL이 생성되지 않았습니다.");
    assert(search.summary.rawCount >= search.summary.resultCount, "검색 요약 수치가 올바르지 않습니다.");

    const reportResponse = await fetch(`${BASE_URL}${search.reportUrl}`);
    assert(reportResponse.ok, "생성된 리포트를 열 수 없습니다.");
    const reportHtml = await reportResponse.text();
    assert(reportHtml.includes("GAT 기사 리포트"), "리포트 HTML 내용이 올바르지 않습니다.");

    if (search.results.length > 0) {
      assert(search.results.every((result) => result.url && /^https?:\/\//.test(result.url)), "기사 URL이 올바르지 않습니다.");
    }

    const result = {
      provider: status.searchProvider,
      guideLoaded: status.guideLoaded,
      queryCount: preview.queryCount,
      resultCount: search.summary.resultCount,
      exactDateCount: search.summary.exactDateCount,
      includedDateMismatchCount: search.summary.includedDateMismatchCount,
      rawCount: search.summary.rawCount,
      dateMismatchCount: search.summary.dateMismatchCount,
      urlResolvedCount: search.summary.urlResolvedCount,
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
