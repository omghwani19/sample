const state = {
  status: null,
  lastResults: [],
  lastQueries: [],
  lastReportUrl: null
};

const elements = {
  apiStatus: document.querySelector("#apiStatus"),
  guideStatus: document.querySelector("#guideStatus"),
  latestReportLink: document.querySelector("#latestReportLink"),
  runState: document.querySelector("#runState"),
  searchForm: document.querySelector("#searchForm"),
  dateInput: document.querySelector("#dateInput"),
  maxResultsInput: document.querySelector("#maxResultsInput"),
  includeDateMismatchesInput: document.querySelector("#includeDateMismatchesInput"),
  previewButton: document.querySelector("#previewButton"),
  searchButton: document.querySelector("#searchButton"),
  queryCount: document.querySelector("#queryCount"),
  queryPreview: document.querySelector("#queryPreview"),
  reportActions: document.querySelector("#reportActions"),
  resultCount: document.querySelector("#resultCount"),
  messageArea: document.querySelector("#messageArea"),
  resultList: document.querySelector("#resultList")
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getKoreanToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function setBadge(element, text, mode = "muted") {
  element.textContent = text;
  element.className = `status-badge ${mode}`;
}

function setRunState(text, mode = "") {
  setBadge(elements.runState, text, mode);
}

function selectedTiers() {
  return [...document.querySelectorAll("input[name='tierScope']:checked")].map((input) => input.value);
}

function getSearchPayload() {
  return {
    date: elements.dateInput.value,
    tierScope: selectedTiers(),
    maxResultsPerQuery: Number(elements.maxResultsInput.value || 5),
    includeDateMismatches: elements.includeDateMismatchesInput.checked
  };
}

function showMessages(messages, mode = "") {
  const items = Array.isArray(messages) ? messages : [messages];
  elements.messageArea.innerHTML = items
    .filter(Boolean)
    .map((message) => `<div class="message ${mode}">${escapeHtml(message)}</div>`)
    .join("");
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const details = Array.isArray(payload.details) ? ` ${payload.details.join(" ")}` : "";
    throw new Error(`${payload.error || "요청이 실패했습니다."}${details}`);
  }

  return payload;
}

function renderStatus(status) {
  state.status = status;

  if (status.apiConfigured) {
    setBadge(elements.apiStatus, `${status.searchProvider || "검색 엔진"} 준비됨`, "ready");
  } else {
    const missing = status.missingConfig?.length ? `: ${status.missingConfig.join(", ")}` : "";
    setBadge(elements.apiStatus, `Google API 설정 필요${missing}`, "warning");
  }

  if (status.guideLoaded) {
    setBadge(elements.guideStatus, "가이드 로드됨", "ready");
  } else {
    setBadge(elements.guideStatus, "내장 가이드 사용", "warning");
  }

  if (status.latestReport) {
    elements.latestReportLink.href = status.latestReport;
    elements.latestReportLink.classList.remove("is-hidden");
  } else {
    elements.latestReportLink.classList.add("is-hidden");
  }
}

function renderQueryPreview(payload) {
  elements.queryCount.textContent = String(payload.queryCount || 0);

  if (!payload.queries || payload.queries.length === 0) {
    elements.queryPreview.className = "query-preview empty-state";
    elements.queryPreview.textContent = "아직 생성된 검색 쿼리가 없습니다.";
    return;
  }

  elements.queryPreview.className = "query-preview";
  elements.queryPreview.innerHTML = `
    <ul class="query-list">
      ${payload.queries.map((query) => `<li><code>${escapeHtml(query.query)}</code></li>`).join("")}
    </ul>
  `;
}

function renderReport(reportUrl, reportPath) {
  state.lastReportUrl = reportUrl;

  if (!reportUrl) {
    elements.reportActions.className = "report-actions empty-state";
    elements.reportActions.textContent = "아직 생성된 리포트가 없습니다.";
    return;
  }

  elements.reportActions.className = "report-actions";
  elements.reportActions.innerHTML = `
    <div class="report-path">${escapeHtml(reportPath || reportUrl)}</div>
    <div class="report-buttons">
      <a class="button button-primary" href="${escapeHtml(reportUrl)}" target="_blank" rel="noopener noreferrer">HTML 리포트 열기</a>
    </div>
  `;
}

function renderWarnings(warnings) {
  if (!warnings || warnings.length === 0) {
    return;
  }

  showMessages(warnings.map((warning) => warning.message || warning), "warning");
}

function renderSearchSummary(response) {
  const messages = [];
  const summary = response.summary || {};

  if (response.results.length === 0 && summary.rawCount > 0) {
    messages.push(`원본 후보 ${summary.rawCount}건 중 ${summary.dateMismatchCount || 0}건은 선택 날짜와 달라 제외했습니다.`);
  }

  if (summary.includedDateMismatchCount > 0) {
    messages.push(`날짜 확인이 필요한 후보 ${summary.includedDateMismatchCount}건을 함께 표시했습니다. 정확한 게시일은 원문에서 확인해주세요.`);
  }

  if (response.warnings && response.warnings.length > 0) {
    messages.push(...response.warnings.map((warning) => warning.message || warning));
  }

  if (messages.length > 0) {
    showMessages(messages, "warning");
  }
}

function renderResults(results) {
  state.lastResults = results || [];
  elements.resultCount.textContent = String(state.lastResults.length);

  if (state.lastResults.length === 0) {
    elements.resultList.className = "result-list empty-state";
    elements.resultList.textContent = "검색된 기사 후보가 없습니다.";
    return;
  }

  elements.resultList.className = "result-list";
  elements.resultList.innerHTML = state.lastResults.map((result, index) => `
    <article class="result-card">
      <div class="result-meta">
        <span class="result-badge ready">${escapeHtml(result.tier)}</span>
        <span class="result-badge ${result.excludedTerms?.length ? "warning" : ""}">${escapeHtml(result.priorityLabel)}</span>
        ${result.dateStatus ? `<span class="result-badge ${result.dateMatched ? "ready" : "warning"}">${escapeHtml(result.dateStatus)}</span>` : ""}
        ${result.urlResolutionStatus ? `<span class="result-badge">${escapeHtml(result.urlResolutionStatus)}</span>` : ""}
        <span class="result-badge">${escapeHtml(result.dateInfo)}</span>
      </div>
      <h3><a href="${escapeHtml(result.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(index + 1)}. ${escapeHtml(result.title)}</a></h3>
      <div class="result-source">${escapeHtml(result.source)} · ${escapeHtml(result.selectionReason)}</div>
      <p>${escapeHtml(result.snippet)}</p>
      <div class="result-meta">
        ${(result.matchedKeywords || []).map((item) => `<span class="result-badge">${escapeHtml(item)}</span>`).join("")}
        ${(result.matchedTopics || []).map((item) => `<span class="result-badge">${escapeHtml(item)}</span>`).join("")}
      </div>
      <div class="url-row"><a href="${escapeHtml(result.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(result.url)}</a></div>
      ${result.googleNewsUrl ? `<div class="url-row"><a href="${escapeHtml(result.googleNewsUrl)}" target="_blank" rel="noopener noreferrer">Google News 링크</a></div>` : ""}
    </article>
  `).join("");
}

async function loadStatus() {
  try {
    const status = await fetchJson("/api/status");
    renderStatus(status);
  } catch (error) {
    setBadge(elements.apiStatus, "상태 확인 실패", "error");
    setBadge(elements.guideStatus, "가이드 확인 실패", "error");
  }
}

async function previewQueries() {
  const payload = getSearchPayload();

  if (!payload.date) {
    renderQueryPreview({ queryCount: 0, queries: [] });
    return;
  }

  setRunState("미리보기 중", "muted");

  try {
    const preview = await fetchJson("/api/preview", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    state.lastQueries = preview.queries || [];
    renderQueryPreview(preview);
    setRunState("준비됨", "ready");
  } catch (error) {
    setRunState("미리보기 실패", "error");
    showMessages(error.message, "error");
  }
}

async function runSearch(event) {
  event.preventDefault();
  elements.messageArea.innerHTML = "";
  renderReport(null);
  setRunState("검색 중", "warning");
  elements.searchButton.disabled = true;
  elements.previewButton.disabled = true;

  try {
    const payload = getSearchPayload();
    const response = await fetchJson("/api/search", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    renderQueryPreview({
      queryCount: response.queries.length,
      queries: response.queries.slice(0, 20)
    });
    renderResults(response.results);
    renderReport(response.reportUrl, response.reportPath);
    renderSearchSummary(response);
    setRunState("리포트 생성됨", "ready");
    await loadStatus();
  } catch (error) {
    setRunState("검색 실패", "error");
    showMessages(error.message, "error");
  } finally {
    elements.searchButton.disabled = false;
    elements.previewButton.disabled = false;
  }
}

function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

function bindEvents() {
  const debouncedPreview = debounce(previewQueries, 350);

  elements.previewButton.addEventListener("click", previewQueries);
  elements.searchForm.addEventListener("submit", runSearch);
  elements.dateInput.addEventListener("change", debouncedPreview);
  elements.maxResultsInput.addEventListener("change", debouncedPreview);
  elements.includeDateMismatchesInput.addEventListener("change", debouncedPreview);

  for (const input of document.querySelectorAll("input[name='tierScope']")) {
    input.addEventListener("change", debouncedPreview);
  }
}

async function init() {
  elements.dateInput.value = getKoreanToday();
  bindEvents();
  await loadStatus();
}

init();
