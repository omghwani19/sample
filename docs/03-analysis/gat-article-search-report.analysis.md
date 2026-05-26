# Gap Analysis: gat-article-search-report

> Date: 2026-05-26 | Design: docs/02-design/features/gat-article-search-report.design.md

---

## Match Rate: 99%

## Summary

The implementation matches the approved design closely. The app is now a local Node web app with a task-first Korean search screen, default no-key Google News RSS search, GAT guide loading, media-specific `site:` query preview, article candidate filtering, duplicate URL handling, original article metadata verification, and standalone Korean HTML report generation.

The main intentional deviation is that the MVP uses plain HTML/CSS/JavaScript plus a dependency-free Node server instead of a React/TypeScript component structure. This keeps setup simpler while preserving the designed boundaries between UI, search, filtering, and reporting.

## Implemented Items

- [x] Local web app shell with top bar and setup status badges
- [x] Date picker for Korean local date search
- [x] Fixed GUIDE topic criteria search without per-run keyword input
- [x] Tier scope controls
- [x] Results per query control for quota management
- [x] Query preview endpoint and UI
- [x] No Google API key or CSE ID required
- [x] GAT guide file detection from `GAT_GUIDE_PATH` or default Downloads path
- [x] Built-in normalized GAT source, topic, and exclusion config
- [x] Google News RSS no-key search service as the default provider
- [x] Optional Google Custom Search JSON API provider remains available through `SEARCH_PROVIDER=google-cse`
- [x] Query builder with source tiers, media `site:` filters, date variants, aviation terms, and selected date range
- [x] URL normalization and duplicate removal
- [x] Search-result date verification against the selected Korean date
- [x] Best-effort Google News URL resolution to publisher article URLs
- [x] Original article metadata fetch for `meta`, JSON-LD, and `time` publication dates
- [x] Original article description/body excerpt used for topic and exclusion matching
- [x] Adjustable original article verification limit
- [x] Server-side date validation for `YYYY-MM-DD`
- [x] Smoke QA command for status, preview, search, report generation, and report fetch
- [x] Source and tier inference
- [x] Topic, keyword, and exclusion-term matching
- [x] Candidate scoring and sorting
- [x] A/B/Exclude priority buckets with score and exclusion reason
- [x] Result list with clickable article title and URL
- [x] Standalone HTML report generation in `reports/`
- [x] HTML report summary, query log, result cards, and clickable source links
- [x] `.env.example` without secrets
- [x] Basic run/check scripts in `package.json`
- [x] Warm cream, coffee ink, orange CTA, and 12px radius visual treatment from `design.md`
- [x] Responsive layout and visible form labels
- [x] Korean UI labels, status messages, errors, and generated report language
- [x] GUIDE topic groups are automatically converted into search queries
- [x] Date-only query preview creates GUIDE-wide search queries
- [x] Date-only search now runs without API-key setup or keyword validation
- [x] README and first-screen Korean text restored to clean UTF-8

## Missing Items

- [ ] Real editorial result quality still needs review across target dates because Google News RSS coverage can differ from general Google search.
- [ ] Some publisher sites can block metadata fetches or omit publication metadata; these cases are shown with verification notes.
- [ ] Browser-plugin visual verification could not run because the in-app browser backend was unavailable in this session, so verification used automated HTTP smoke checks instead.

## Changed Items (Deviations from Design)

- [x] Implemented as plain HTML/CSS/JS with a dependency-free Node server instead of React/TypeScript components.
- [x] Guide text file is detected and loaded for status, while filtering uses the normalized built-in guide config derived from the guide.
- [x] The UI and generated report are localized to Korean, while source code identifiers remain English for maintainability.
- [x] Per-run keyword input was removed because the GUIDE conditions are fixed for this workflow.

## Recommendations

1. Run real Google News RSS searches across several target dates.
2. Review A/B/Exclude outputs against editorial expectations and tune source/topic/exclusion terms if needed.
3. If Google coverage is weak for older dates or specific outlets, add source-specific RSS feeds or a second date-aware provider as a fallback.

## Next Steps

- [x] Proceed with MVP usage without Google API setup.
- [x] Run real search QA with RSS date filtering.
- [x] Switch default search provider to Google News RSS so API keys are not required.
- [x] Add final smoke QA command: `npm run qa`.
- [x] Add GPT-style media/date/topic query generation.
- [x] Add original article metadata verification.
- [x] Complete report phase documentation.
- [ ] Tune source/topic/exclusion terms after reviewing real RSS-backed results.
