const fsp = require("node:fs/promises");
const path = require("node:path");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "report";
}

function groupByTier(results) {
  return results.reduce((accumulator, result) => {
    accumulator[result.tier] = (accumulator[result.tier] || 0) + 1;
    return accumulator;
  }, {});
}

function renderBadges(values, fallback) {
  const items = values && values.length ? values : [fallback];
  return items.map((item) => `<span class="badge">${escapeHtml(item)}</span>`).join("");
}

function renderResult(result, index) {
  return `
    <article class="result-card">
      <div class="result-meta">
        <span class="badge strong">${escapeHtml(result.tier)}</span>
        <span class="badge">${escapeHtml(result.priorityLabel)}</span>
        ${result.dateStatus ? `<span class="badge">${escapeHtml(result.dateStatus)}</span>` : ""}
        ${result.urlResolutionStatus ? `<span class="badge">${escapeHtml(result.urlResolutionStatus)}</span>` : ""}
        ${result.articleDateVerificationStatus ? `<span class="badge">원문 날짜 ${escapeHtml(result.articleDateVerificationStatus)}</span>` : ""}
        <span class="date-info">${escapeHtml(result.dateInfo)}</span>
      </div>
      <h2><a href="${escapeHtml(result.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(index + 1)}. ${escapeHtml(result.title)}</a></h2>
      <p class="source-line">${escapeHtml(result.source)} · ${escapeHtml(result.selectionReason)}</p>
      ${result.excludeReason ? `<p class="warning-text">${escapeHtml(result.excludeReason)}</p>` : ""}
      <p>${escapeHtml(result.snippet)}</p>
      <div class="topic-row">
        ${result.gatTopic ? `<span class="badge strong">${escapeHtml(result.gatTopic)}</span>` : ""}
        ${Number.isFinite(Number(result.score)) ? `<span class="badge">Score ${escapeHtml(result.score)}</span>` : ""}
        ${renderBadges(result.matchedTopics, "주제 검토 필요")}
      </div>
      <a class="url-link" href="${escapeHtml(result.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(result.url)}</a>
      ${result.googleNewsUrl ? `<p><a href="${escapeHtml(result.googleNewsUrl)}" target="_blank" rel="noopener noreferrer">Google News 링크</a></p>` : ""}
      ${result.articleDateVerificationSource ? `<p class="source-line">원문 날짜 출처: ${escapeHtml(result.articleDateVerificationSource)}</p>` : ""}
      ${result.articleDateVerificationError ? `<p class="source-line">원문 날짜 확인 메모: ${escapeHtml(result.articleDateVerificationError)}</p>` : ""}
      <details>
        <summary>사용 쿼리</summary>
        <code>${escapeHtml(result.queryUsed)}</code>
      </details>
    </article>
  `;
}

function safeNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function renderReportHtml({ input, queries, results, summary = {}, warnings, generatedAt }) {
  const tierCounts = groupByTier(results);
  const generatedText = generatedAt.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  const searchLabel = input.searchLabel || (input.keywords.length ? input.keywords.join(", ") : "GUIDE 전체 기준");
  const rawCount = safeNumber(summary.rawCount);
  const dateMismatchCount = safeNumber(summary.dateMismatchCount);
  const includedDateMismatchCount = safeNumber(summary.includedDateMismatchCount);
  const exactDateCount = safeNumber(summary.exactDateCount);
  const urlResolvedCount = safeNumber(summary.urlResolvedCount);
  const articleDateVerifiedCount = safeNumber(summary.articleDateVerifiedCount);

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>GAT 기사 리포트 - ${escapeHtml(input.date)}</title>
  <style>
    :root {
      --canvas: #fffefb;
      --canvas-soft: #f8f4f0;
      --ink: #201515;
      --ink-soft: #2f2a26;
      --body: #605d52;
      --body-mid: #939084;
      --mute: #c5c0b1;
      --primary: #ff4f00;
      --on-primary: #fffefb;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--canvas);
      color: var(--ink);
      line-height: 1.5;
    }
    main {
      width: min(1180px, calc(100% - 32px));
      margin: 0 auto;
      padding: 32px 0 56px;
    }
    header {
      border-bottom: 1px solid var(--mute);
      padding: 28px 0 24px;
      margin-bottom: 24px;
    }
    h1 {
      margin: 0 0 8px;
      font-size: clamp(28px, 4vw, 44px);
      line-height: 1.05;
      letter-spacing: 0;
    }
    h2 {
      margin: 10px 0 8px;
      font-size: 20px;
      line-height: 1.3;
      letter-spacing: 0;
    }
    a { color: var(--ink); }
    a:hover { color: var(--primary); }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-bottom: 24px;
    }
    .summary-card, .query-log, .warning-list {
      background: var(--canvas-soft);
      border: 1px solid rgba(32, 21, 21, 0.14);
      border-radius: 12px;
      padding: 16px;
    }
    .summary-card strong {
      display: block;
      font-size: 26px;
      line-height: 1;
      margin-bottom: 4px;
    }
    .summary-card span, .source-line, .date-info {
      color: var(--body);
      font-size: 14px;
    }
    .warning-text {
      margin: 10px 0;
      color: #8f2d00;
      font-weight: 700;
    }
    .result-card {
      border: 1px solid rgba(32, 21, 21, 0.16);
      border-radius: 12px;
      padding: 20px;
      margin: 14px 0;
      background: #fff;
    }
    .result-meta, .topic-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      min-height: 24px;
      padding: 3px 9px;
      border-radius: 999px;
      background: var(--canvas-soft);
      border: 1px solid rgba(32, 21, 21, 0.12);
      color: var(--ink-soft);
      font-size: 13px;
      font-weight: 600;
    }
    .badge.strong {
      background: var(--ink);
      color: var(--on-primary);
    }
    .url-link {
      display: inline-block;
      margin-top: 12px;
      color: var(--primary);
      overflow-wrap: anywhere;
      font-weight: 700;
    }
    details {
      margin-top: 12px;
      color: var(--body);
    }
    code {
      display: block;
      margin-top: 8px;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      background: var(--canvas-soft);
      border-radius: 6px;
      padding: 10px;
      color: var(--ink);
    }
    ul {
      margin: 8px 0 0;
      padding-left: 20px;
    }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>GAT 기사 리포트</h1>
      <p>검색일: <strong>${escapeHtml(input.date)}</strong> · 검색 기준: <strong>${escapeHtml(searchLabel)}</strong> · 생성 시각: ${escapeHtml(generatedText)} KST</p>
    </header>

    <section class="summary-grid" aria-label="리포트 요약">
      <div class="summary-card"><strong>${results.length}</strong><span>기사 후보</span></div>
      <div class="summary-card"><strong>${exactDateCount}</strong><span>선택 날짜 일치</span></div>
      <div class="summary-card"><strong>${includedDateMismatchCount}</strong><span>날짜 확인 필요</span></div>
      <div class="summary-card"><strong>${rawCount}</strong><span>원본 후보</span></div>
      <div class="summary-card"><strong>${dateMismatchCount}</strong><span>날짜 불일치</span></div>
      <div class="summary-card"><strong>${urlResolvedCount}</strong><span>원문 URL 확인</span></div>
      <div class="summary-card"><strong>${articleDateVerifiedCount}</strong><span>원문 날짜 확인</span></div>
      <div class="summary-card"><strong>${queries.length}</strong><span>사용 쿼리</span></div>
      <div class="summary-card"><strong>${warnings.length}</strong><span>경고</span></div>
      <div class="summary-card"><strong>${Object.keys(tierCounts).length}</strong><span>포함된 등급</span></div>
    </section>

    <section class="summary-card">
      <h2>등급 요약</h2>
      ${Object.keys(tierCounts).length
        ? Object.entries(tierCounts).map(([tier, count]) => `<span class="badge">${escapeHtml(tier)}: ${count}</span>`).join(" ")
        : "<p>검색된 기사 후보가 없습니다.</p>"}
    </section>

    ${warnings.length ? `
      <section class="warning-list">
        <h2>경고</h2>
        <ul>${warnings.map((warning) => `<li>${escapeHtml(warning.message)}</li>`).join("")}</ul>
      </section>
    ` : ""}

    <section>
      <h2>검색 결과</h2>
      ${results.length ? results.map(renderResult).join("") : `<p>이 검색 조건에 맞는 기사 후보가 없습니다. 원본 후보 ${rawCount}건 중 날짜 불일치 ${dateMismatchCount}건이 제외되었습니다.</p>`}
    </section>

    <section class="query-log">
      <h2>쿼리 로그</h2>
      <ul>${queries.map((query) => `<li><code>${escapeHtml(query.query)}</code></li>`).join("")}</ul>
    </section>
  </main>
</body>
</html>`;
}

async function findLatestReport(reportsDir) {
  try {
    const entries = await fsp.readdir(reportsDir, { withFileTypes: true });
    const htmlFiles = [];

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".html")) {
        const filePath = path.join(reportsDir, entry.name);
        const stats = await fsp.stat(filePath);
        htmlFiles.push({ name: entry.name, mtimeMs: stats.mtimeMs });
      }
    }

    htmlFiles.sort((left, right) => right.mtimeMs - left.mtimeMs);
    return htmlFiles[0] ? `/reports/${htmlFiles[0].name}` : null;
  } catch (error) {
    return null;
  }
}

async function writeHtmlReport({ rootDir, reportsDir, input, queries, results, summary, warnings, generatedAt }) {
  await fsp.mkdir(reportsDir, { recursive: true });
  const timestamp = generatedAt.toISOString().replace(/[-:]/g, "").slice(0, 15);
  const keywordSlug = slugify(input.keywords.slice(0, 3).join("-"));
  const fileName = `gat-report-${input.date}-${keywordSlug}-${timestamp}.html`;
  const filePath = path.join(reportsDir, fileName);
  const html = renderReportHtml({ input, queries, results, summary, warnings, generatedAt });

  await fsp.writeFile(filePath, html, "utf8");

  return {
    filePath,
    relativePath: path.relative(rootDir, filePath).replace(/\\/g, "/"),
    url: `/reports/${fileName}`
  };
}

module.exports = {
  findLatestReport,
  writeHtmlReport
};
