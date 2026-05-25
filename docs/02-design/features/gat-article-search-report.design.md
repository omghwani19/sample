# gat-article-search-report - Design Document (Starter)

> Version: 1.0.0 | Date: 2026-05-24 | Status: Approved
> Level: Starter | Plan: docs/01-plan/features/gat-article-search-report.plan.md
> Visual Reference: design.md

---

## 1. Overview

`gat-article-search-report`는 개인 PC에서 실행하는 로컬 기사 검색 리포트 도구다. 사용자는 달력 UI로 한국시간 기준 검색 날짜를 선택한다. 앱은 GUIDE의 고정 매체/주제 조건으로 Google News RSS를 호출해 GAT 기준에 맞는 해외 항공 산업 기사 후보를 검색하고, 클릭 가능한 기사 URL이 포함된 HTML 리포트를 생성한다.

초기 버전은 업무용 도구 성격이 강하므로 랜딩 페이지가 아니라 바로 사용할 수 있는 검색 화면을 첫 화면으로 제공한다. `design.md`의 Zapier 스타일 토큰은 따뜻한 크림 배경, 커피색 텍스트, 오렌지 CTA, 12px 반경을 중심으로 차용하되, 기사 검토 화면은 조밀하고 읽기 쉬운 작업 UI로 설계한다.

## 2. Design Principles

- **Task first**: 첫 화면에서 날짜 선택과 GUIDE 기준 검색 실행이 바로 가능해야 한다.
- **Review ready**: 검색 결과는 HTML 리포트와 동일한 정보 구조로 화면에서도 검토 가능해야 한다.
- **URL trust**: 모든 기사 항목은 클릭 가능한 원문 URL을 가장 중요한 정보로 다룬다.
- **Explainable filtering**: 왜 GAT 후보인지, 어떤 Tier와 주제에 걸렸는지 표시한다.
- **Config aware**: 무료 검색 엔진 상태와 가이드 파일 상태를 사용자가 이해할 수 있게 보여준다.
- **Warm but utilitarian**: `design.md`의 따뜻한 색감은 유지하되, 장식보다 검색과 검토 효율을 우선한다.

## 3. Page Structure

### 3.1 Main App Screen

Single-page local web app으로 구성한다.

1. **Top Bar**
   - App name: `GAT Article Search`
   - Small status area: 무료 검색 준비 상태, guide file loaded 여부
   - 최근 생성 리포트 열기 버튼

2. **Search Control Band**
   - Date picker: 한국시간 기준 날짜 선택
   - Guide criteria summary: GUIDE 전체 주제 조건을 고정 검색 기준으로 표시
   - Optional controls:
     - Tier range selector: 기본값 `Tier 1-6 + 확장 매체`
     - Max results per query: RSS 검색 요청량 관리를 위한 숫자 입력
   - Primary action: `Search`

3. **Search Plan / Query Preview**
   - 실행 전 또는 실행 중 생성될 검색 쿼리 요약 표시
   - 사용된 날짜, GUIDE 주제 그룹, Tier, site/domain 조건 표시
   - RSS 검색 호출 예상 수 표시

4. **Progress And Feedback**
   - 검색 중 상태: queued, searching, filtering, report generated
   - 오류 상태: search failed, guide missing, no results

5. **Results Review Area**
   - 기사 결과 테이블 또는 리스트
   - 정렬 기준: Tier 우선, 날짜 근접도, GAT 관련성, 매체명
   - 중복 URL은 하나로 병합
   - 각 기사 항목은 제목, 매체, 날짜 정보, Tier, 관련 주제, 스니펫, 원문 링크, 사용 쿼리를 포함

6. **Report Actions**
   - 생성된 HTML 리포트 파일 경로 표시
   - `Open HTML Report` 버튼
   - `Regenerate Report` 버튼

### 3.2 Generated HTML Report

`reports/` 폴더에 저장되는 standalone HTML 파일이다. 서버 없이 브라우저에서 직접 열 수 있어야 한다.

Report structure:
- Header: 검색 날짜, GUIDE 기준, 생성 시각, 총 후보 수
- Summary: Tier별 결과 수, 제외/낮은 우선순위 처리 수
- Query Log: 사용된 검색 쿼리 목록
- Results:
  - 제목
  - 매체
  - 날짜 정보 또는 RSS 게시 날짜 정보
  - Tier
  - GAT 주제
  - 선정 사유
  - 스니펫
  - 클릭 가능한 원문 URL

## 4. Visual Design

### 4.1 Color Tokens

`design.md`를 기준으로 다음 토큰을 사용한다.

| Token | Value | Use |
|-------|-------|-----|
| `--color-canvas` | `#fffefb` | App background |
| `--color-canvas-soft` | `#f8f4f0` | Control band, report summary, result metadata areas |
| `--color-ink` | `#201515` | Primary headings and text |
| `--color-ink-soft` | `#2f2a26` | Secondary headings |
| `--color-body` | `#605d52` | Body text |
| `--color-body-mid` | `#939084` | Metadata and helper text |
| `--color-mute` | `#c5c0b1` | Borders and low-priority labels |
| `--color-primary` | `#ff4f00` | Primary search action and active indicator |
| `--color-on-primary` | `#fffefb` | Text on primary button |

Usage rules:
- Orange is reserved for primary action, active focus, and important links.
- Warm cream surfaces are used for panels, not decorative sections.
- Result rows stay mostly light and readable; color is used for hierarchy, not decoration.

### 4.2 Typography

`design.md`의 Degular Display는 proprietary font이므로 MVP에서는 Inter를 사용한다. 나중에 Degular Display 대체가 필요하면 display heading만 Mona Sans 또는 Inter 500으로 조정한다.

| Role | Font | Size | Weight | Line Height |
|------|------|------|--------|-------------|
| App title | Inter | 24px | 700 | 30px |
| Section heading | Inter | 20px | 700 | 26px |
| Form label | Inter | 14px | 600 | 20px |
| Body | Inter | 16px | 400 | 24px |
| Metadata | Inter | 14px | 400 | 20px |
| Button | Inter | 16px | 700 | 22px |
| Result title | Inter | 18px | 700 | 25px |

Letter spacing is `0` except small uppercase metadata labels, which may use `0.04em`.

### 4.3 Layout

- App max width: `1280px`
- Page padding: `24px` desktop, `16px` mobile
- Grid:
  - Desktop: search controls in a 4-column responsive grid
  - Tablet: 2-column controls
  - Mobile: 1-column controls
- Main content:
  - Desktop: left search/control column and right results column can be used if needed
  - MVP default: single-column stacked layout for simplicity and readability
- Cards and panels use `12px` radius from `design.md`.
- Inputs use `6px` radius.
- Result table/list has stable row spacing and avoids layout shifts during loading.

### 4.4 Responsive Behavior

| Breakpoint | Behavior |
|------------|----------|
| `< 768px` | One-column controls, result cards instead of dense table |
| `768-1023px` | Two-column controls, compact result list |
| `>= 1024px` | Full control grid, table-like result list |

## 5. Components

### 5.1 `AppShell`

Root layout for the local web app.

Responsibilities:
- Render top bar
- Render main content
- Keep app width and page background consistent

### 5.2 `StatusBadge`

Small pill for setup and runtime states.

States:
- `Ready`
- `RSS unavailable`
- `Guide loaded`
- `Searching`
- `Report generated`
- `Error`

### 5.3 `SearchForm`

Primary input area.

Fields:
- `date`: required, native date input or calendar component
- `keywords`: hidden/internal override only
- `tierScope`: optional, default all tiers
- `maxResultsPerQuery`: optional, default conservative value for free quota

Validation:
- date is required
- normal UI uses GUIDE topic groups without keyword input
- RSS search must be reachable before returning results

### 5.4 `QueryPreview`

Shows generated search plan before and during execution.

Fields:
- selected date
- keyword list
- selected tiers
- generated query count
- sample queries

### 5.5 `SearchProgress`

Displays current runtime progress.

States:
- idle
- preparing queries
- searching Google News RSS
- filtering candidates
- writing HTML report
- complete
- failed

### 5.6 `ResultList`

Displays filtered article candidates.

Each result item:
- title
- source/media
- tier
- date info
- GAT topic
- matched keyword
- selection reason
- snippet
- original URL
- query used

Primary interaction:
- title and URL open the original article in a new browser tab.

### 5.7 `ReportActions`

Shows generated report path and actions.

Actions:
- open HTML report
- regenerate HTML report from current result set

### 5.8 `ErrorPanel`

Readable error display.

Examples:
- Google News RSS request failed
- No matching articles
- No matching articles
- Guide file not found

## 6. Data Model

### 6.1 `SearchInput`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `date` | string | yes | `YYYY-MM-DD`, Korean local date |
| `keywords` | string[] | no | internal override only; normal UI uses GUIDE topic groups |
| `tierScope` | string[] | no | defaults to all configured tiers |
| `maxResultsPerQuery` | number | no | controls API usage |

### 6.2 `GuideConfig`

| Field | Type | Notes |
|-------|------|-------|
| `tiers` | object[] | media tier definitions |
| `extendedSources` | string[] | optional media database |
| `includedTopics` | string[] | GAT article topics |
| `excludedContentTypes` | string[] | travel, tourism promo, consumer service, simple PR, advertising |
| `recommendedQueries` | string[] | guide-provided query examples |

### 6.3 `SearchQuery`

| Field | Type | Notes |
|-------|------|-------|
| `query` | string | final RSS search query string |
| `keyword` | string | source keyword |
| `tier` | string | target tier |
| `source` | string | target media/source if site-specific |
| `date` | string | selected date |

### 6.4 `ArticleCandidate`

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | stable hash of canonical URL |
| `title` | string | article title from RSS |
| `url` | string | required original URL |
| `displayUrl` | string | normalized display URL |
| `source` | string | inferred media/source |
| `tier` | string | inferred from guide |
| `dateInfo` | string | search result date when available |
| `snippet` | string | RSS description/source context |
| `matchedKeywords` | string[] | matched user keywords |
| `matchedTopics` | string[] | matched GAT topics |
| `selectionReason` | string | human-readable reason |
| `priority` | number | sort score |
| `queryUsed` | string | traceability |

## 7. Search And Filtering Flow

1. Load environment config.
2. Load and parse `GAT_SEARCH_GUIDE_v2026.txt` or the normalized guide config.
3. User selects a date.
4. Generate Google News RSS queries:
   - GUIDE topic groups
   - date condition
   - aviation/GAT topic terms where useful
   - site/source constraints from Tier media list when possible
5. Call Google News RSS.
6. Normalize result URLs.
7. Remove duplicate URLs.
8. Infer source and Tier from URL/title/display link.
9. Validate RSS publish date against the selected Korean date.
10. Score each article:
   - source appears in GAT tier list
   - keyword appears in title/snippet
   - included topic appears in title/snippet
   - excluded content type does not appear
   - date appears close to selected date
11. Sort candidates by Tier, score, and date confidence.
12. Resolve Google News result links to publisher article URLs when possible.
13. Render results in the app.
14. Generate standalone HTML report in `reports/`.

## 8. Local File Structure

Recommended implementation structure:

```text
.
├── docs/
│   ├── 01-plan/features/gat-article-search-report.plan.md
│   └── 02-design/features/gat-article-search-report.design.md
├── reports/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   └── styles.css
│   ├── components/
│   │   ├── SearchForm.tsx
│   │   ├── QueryPreview.tsx
│   │   ├── SearchProgress.tsx
│   │   ├── ResultList.tsx
│   │   └── ReportActions.tsx
│   ├── services/
│   │   ├── google-news-rss.ts
│   │   ├── guide-config.ts
│   │   ├── search-query-builder.ts
│   │   ├── article-filter.ts
│   │   └── report-writer.ts
│   └── types/
│       └── article.ts
├── .env.example
└── package.json
```

If the project stays even smaller, the same boundaries can be implemented with fewer files, but search, filtering, and report generation should remain separated.

## 9. API And Configuration

### 9.1 Environment Variables

| Name | Required | Purpose |
|------|----------|---------|
| `GAT_GUIDE_PATH` | no | path to guide text file |

Secrets must not be committed. Provide `.env.example` only.

### 9.2 Local API Boundary

If implemented as a local web app with a small backend, expose one local endpoint:

`POST /api/search`

Request:

```json
{
  "date": "2026-05-24",
  "keywords": ["SAF", "aviation policy"],
  "tierScope": ["Tier 1", "Tier 2", "Tier 3"],
  "maxResultsPerQuery": 10
}
```

Response:

```json
{
  "results": [],
  "reportPath": "reports/gat-report-2026-05-24.html",
  "queries": [],
  "warnings": []
}
```

## 10. HTML Report Design

The generated report should reuse the same visual tokens as the app:

- Warm canvas background
- Coffee ink text
- Orange links and action accents
- 12px summary panels
- Dense result cards for scanability

Report result card:

```text
[Tier 1] [SAF] [Date info]
Article title
Source · Matched keyword · Selection reason
Snippet...
Open original article: https://...
Query used: ...
```

The article title and URL must both be clickable.

## 11. Accessibility

- All form controls have visible labels.
- Buttons have clear text labels and sufficient contrast.
- Keyboard users can complete search and open links.
- Focus states use orange outline with enough contrast.
- Error messages are text-based, not color-only.
- Generated HTML report uses semantic headings and links.

## 12. Implementation Order

1. Create project skeleton and local run command.
2. Add design tokens and app shell.
3. Build `SearchForm` with date picker and fixed GUIDE criteria summary.
4. Add `.env.example` and config validation.
5. Implement guide config loader or normalized guide data.
6. Implement Google News RSS service.
7. Implement query builder.
8. Implement result normalization, dedupe, scoring, and filtering.
9. Build result list and progress/error states.
10. Generate standalone HTML report.
11. Add basic manual QA checklist.

## 13. Manual QA Checklist

- Date picker accepts a Korean local date.
- Date is required before search starts.
- RSS/search failure shows a clear error message.
- Search results include clickable title and URL.
- Duplicate URLs are merged.
- Tier and GAT topic labels appear where inferable.
- Generated HTML opens directly in browser.
- HTML report includes search date, keywords, created time, query log, and results.
- No secrets are written into generated report or committed files.

## 14. Learning Points

- Separating UI, API calls, filtering, and report generation
- Managing local environment variables safely
- Designing explainable search filters
- Building standalone HTML reports from structured data
- Translating a visual design reference into a compact work-focused tool UI
