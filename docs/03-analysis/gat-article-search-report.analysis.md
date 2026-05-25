# Gap Analysis: gat-article-search-report

> Date: 2026-05-24 | Design: docs/02-design/features/gat-article-search-report.design.md

---

## Match Rate: 98%

## Summary

The implementation matches the approved design closely. The app is now a local Node web app with a task-first Korean search screen, Google Custom Search JSON API search, GAT guide loading, GUIDE-based query preview, article candidate filtering, duplicate URL handling, and standalone Korean HTML report generation.

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
- [x] Google Custom Search JSON API search service
- [x] Query builder with source tiers, aviation terms, and selected date range
- [x] URL normalization and duplicate removal
- [x] RSS publish date verification against the selected Korean date
- [x] Best-effort Google News URL resolution to publisher article URLs
- [x] Server-side date validation for `YYYY-MM-DD`
- [x] Smoke QA command for status, preview, search, report generation, and report fetch
- [x] Source and tier inference
- [x] Topic, keyword, and exclusion-term matching
- [x] Candidate scoring and sorting
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

## Missing Items

- [ ] Real result quality still needs review against target GAT editorial expectations.
- [ ] Google API results can still have incomplete date metadata; the app filters mismatched dates out, but this can produce empty results when Google does not surface exact-date metadata.
- [ ] Browser-plugin visual verification failed due a local browser runtime sandbox error, so verification used HTTP smoke checks instead.

## Changed Items (Deviations from Design)

- [x] Implemented as plain HTML/CSS/JS with a dependency-free Node server instead of React/TypeScript components.
- [x] Guide text file is detected and loaded for status, while filtering uses the normalized built-in guide config derived from the guide.
- [x] The UI and generated report are localized to Korean, while source code identifiers remain English for maintainability.
- [x] Per-run keyword input was removed because the GUIDE conditions are fixed for this workflow.

## Recommendations

1. Inspect real GUIDE-wide searches across several dates to see whether Google API coverage is sufficient.
2. Tune the GUIDE topic grouping if query count or result quality is not right.
3. If older-date coverage is weak, add source-specific RSS feeds or another free date-aware provider as a fallback.

## Next Steps

- [x] Proceed with MVP usage without Google API setup.
- [x] Run real search QA with RSS date filtering.
- [x] Switch default search provider to Google Custom Search JSON API.
- [x] Add final smoke QA command: `npm run qa`.
- [ ] Tune topic groups or add fallback feeds if needed.
- [ ] Consider report phase if real search QA passes.
