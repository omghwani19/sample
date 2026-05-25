# gat-article-search-report - Plan Document

> Version: 1.0.0 | Date: 2026-05-23 | Status: Approved
> Level: Starter

---

## 1. Overview

### 1.1 Purpose

개인 사용자가 날짜와 항공 매체/주제 조건을 매번 수동으로 조합해 Google 검색하는 번거로움을 줄이기 위해, GAT(Global Aviation Trend) 기준에 맞는 해외 항공 산업 기사 후보를 자동으로 찾고 로컬 HTML 리포트로 검토할 수 있게 한다.

### 1.2 Background

사용자는 특정 날짜에 배포된 GAT 기준 기사 후보를 찾고 싶다. 검색 대상은 아무 기사가 아니라 `GAT_SEARCH_GUIDE_v2026.txt`에 정의된 항공 산업 매체, 주제, 제외 조건을 만족하는 기사여야 한다.

초기 버전은 이메일 전송보다 HTML 리포트 검토를 우선한다. 사용자는 달력 UI에서 한국시간 기준 날짜를 선택한다. 프로그램은 GUIDE의 고정 매체/주제 조건을 Google News RSS 검색어로 자동 생성해 기사 후보를 검색하고, 결과를 브라우저에서 바로 열 수 있는 HTML 파일로 생성한다.

## 2. User Intent

- 조건에 맞는 기사 검색이 번거로우므로 자동화하고 싶다.
- 사용자는 개인이며, 프로그램은 본인 PC에서만 실행되면 된다.
- 날짜는 직접 입력보다 달력 UI로 지정하는 것이 좋다.
- 검색 기준은 `GAT_SEARCH_GUIDE_v2026.txt`를 따른다.
- 기준에 맞는 기사는 가능한 한 모두 보여줘야 한다.
- 기사 URL은 반드시 클릭 가능한 실제 링크로 제공되어야 한다.
- 결과는 이메일보다 HTML 파일로 바로 검토하는 흐름을 우선한다.
- 날짜 기준은 한국시간 기준으로 처리한다.

## 3. Alternatives Explored

### 3.1 Google Search URL + Local HTML Report

날짜, 키워드, 매체별 Google 검색 URL을 자동 생성하고 HTML에 정리하는 방식이다.

Pros:
- 가장 단순하고 빠르게 만들 수 있다.
- 무료이며 API 키가 필요 없다.
- 검색 가이드 자동화의 첫 단계로 적합하다.

Cons:
- 실제 기사 목록을 자동 수집하기 어렵다.
- 중복 제거와 정렬 자동화가 제한적이다.
- 사용자가 검색 결과를 직접 따라가야 할 수 있다.

Effort: Low

### 3.2 Google Programmable Search Engine + Local HTML Report

Google Programmable Search Engine을 이용해 제목, 링크, 스니펫을 수집하고 GAT 기준으로 필터링한 뒤 HTML 리포트를 생성하는 방식이다.

Pros:
- 실제 연결 가능한 기사 URL 목록을 자동 생성하기 좋다.
- HTML 리포트 생성, 중복 제거, 매체 Tier 정렬에 적합하다.
- 무료 범위에서 시작할 수 있다.
- 이번 MVP 요구사항의 균형점이다.

Cons:
- Google API 키와 검색 엔진 ID 설정이 필요하다.
- 무료 검색 호출량 제한이 있을 수 있다.
- Google 검색 결과의 날짜 정보가 항상 정확하지 않을 수 있다.

Effort: Medium

Selected: No

Superseded: Google API 키 없이 무료로 사용하기 위해 Google News RSS 방식으로 전환했다.

### 3.4 Google News RSS + Local HTML Report

Google News RSS 검색을 이용해 GUIDE 주제 조건에 맞는 글로벌 뉴스 후보를 무료로 검색하고 HTML 리포트를 생성하는 방식이다.

Pros:
- Google API 키와 검색 엔진 ID가 필요 없다.
- 무료로 시작할 수 있다.
- `after:` / `before:` 날짜 조건을 검색어에 포함할 수 있다.
- 기사 제목, 클릭 가능한 링크, 매체명, RSS 게시일 정보를 받을 수 있다.

Cons:
- Google 검색과 결과 범위가 다를 수 있다.
- 일부 항공 전문 매체가 Google News RSS에 충분히 노출되지 않을 수 있다.
- 결과 품질은 실제 검색 후 쿼리 그룹 튜닝이 필요하다.

Effort: Medium

Selected: Yes

### 3.3 Browser Automation For Google Search Results

로컬 브라우저를 자동으로 열고 실제 Google 검색 결과 화면에서 기사 링크를 수집하는 방식이다.

Pros:
- 사용자가 보는 Google 검색 결과와 유사하다.
- 별도 검색 API 없이도 자동 수집이 가능할 수 있다.

Cons:
- CAPTCHA나 검색 제한에 걸릴 수 있다.
- Google 화면 구조 변경에 취약하다.
- 유지보수 부담이 크다.

Effort: Medium-High

## 4. YAGNI Review Results

### 4.1 Must Have

- 달력 UI로 검색 날짜 선택
- GUIDE 전체 주제 조건 자동 검색
- `GAT_SEARCH_GUIDE_v2026.txt` 기준 반영
- Google News RSS를 이용한 기사 후보 검색
- 기사 URL 중복 제거
- 결과 HTML 파일 생성
- HTML에서 기사 링크 클릭 가능
- 기사별 제목, 매체, 날짜, URL, 스니펫, GAT 관련성 표시

### 4.2 Nice To Have

- 이메일 전송
- 매체 Tier별 그룹핑 및 정렬
- CSV 저장
- 검색 이력 저장
- 기사별 채택/제외 체크 기능

### 4.3 Won't Do In MVP

- 매일 자동 실행
- 뉴스 API 별도 연동
- 로그인/다중 사용자
- 서버 배포
- 유료 검색 서비스
- 기사 전문 자동 분석 또는 요약

## 5. Scope

### 5.1 In Scope

- 개인 PC에서 실행하는 로컬 기사 검색 리포트 도구
- 한국시간 기준 날짜 선택
- 달력 UI 기반 날짜 입력
- GUIDE 전체 주제 조건 고정 적용
- Google News RSS 기반 기사 후보 검색
- `GAT_SEARCH_GUIDE_v2026.txt` 기반 매체 Tier, 산업 주제, 제외 조건 반영
- 검색 결과 중복 URL 제거
- GAT 관련성 또는 선정 사유 표시
- 클릭 가능한 기사 URL을 포함한 HTML 리포트 생성
- `reports/` 폴더에 결과 HTML 저장

### 5.2 Out Of Scope

- 이메일 발송
- 자동 스케줄링
- 서버 배포
- 다중 사용자 기능
- 유료 검색 서비스 사용
- 기사 전문 자동 분석
- 외부 뉴스 API 연동

## 6. Requirements

### 6.1 Functional Requirements

- 사용자는 달력 UI에서 검색 날짜를 선택할 수 있어야 한다.
- 사용자는 별도 키워드를 입력하지 않고 GUIDE 전체 기준으로 검색할 수 있어야 한다.
- 프로그램은 `GAT_SEARCH_GUIDE_v2026.txt`의 매체 Tier, 산업 주제, 제외 조건을 검색 기준으로 사용해야 한다.
- 프로그램은 Google News RSS를 이용해 기사 후보를 검색해야 한다.
- 프로그램은 선택 날짜 기준으로 검색 결과를 제한하거나 우선 필터링해야 한다.
- 프로그램은 중복 URL을 제거해야 한다.
- 프로그램은 GAT 주제와 관련 있는 기사 후보를 우선 표시해야 한다.
- 프로그램은 여행 정보, 관광 홍보, 소비자 서비스, 단순 PR, 광고성 콘텐츠를 제외하거나 낮은 우선순위로 처리해야 한다.
- 프로그램은 검색 결과를 HTML 파일로 생성해야 한다.
- HTML 리포트에는 기사 제목, 매체, 게시일 또는 검색상 날짜 정보, URL, 스니펫, 관련 주제 또는 선정 사유가 표시되어야 한다.
- HTML의 URL은 클릭 가능한 링크여야 한다.

### 6.2 Non-Functional Requirements

- 무료 도구만 사용해야 한다.
- 로컬 PC에서 실행 가능해야 한다.
- 초기 버전은 서버 배포 없이 동작해야 한다.
- 검색 결과 HTML은 브라우저에서 바로 열 수 있어야 한다.
- 민감 정보는 코드에 직접 저장하지 않아야 한다.
- 결과가 없거나 API 설정이 잘못된 경우 사용자가 이해할 수 있는 오류 메시지를 보여줘야 한다.
- 검색 로직은 매체 목록과 GUIDE 주제 기준을 나중에 수정하기 쉽게 구성해야 한다.

## 7. Success Criteria

- [ ] 사용자는 달력으로 날짜를 선택해 GUIDE 전체 기준 검색을 실행할 수 있다.
- [ ] 선택 날짜 기준의 기사 후보가 HTML 파일로 생성된다.
- [ ] GAT 기준에 맞는 기사 후보가 가능한 한 누락 없이 표시된다.
- [ ] 각 결과에는 실제로 열 수 있는 기사 URL이 포함된다.
- [ ] HTML 리포트에서 기사 링크를 클릭하면 원문 기사로 이동한다.
- [ ] 결과에는 제목, 매체, 날짜 정보, 스니펫, GAT 관련성 또는 선정 사유가 포함된다.
- [ ] 중복 URL은 하나로 정리된다.
- [ ] 검색 실패, 가이드 파일 문제, 결과 없음 같은 상황에서 사용자가 이해 가능한 메시지가 표시된다.
- [ ] 검색 결과를 이메일이나 별도 프로그램 없이 브라우저에서 바로 검토할 수 있다.

## 8. Architecture Considerations

- 로컬 PC에서 실행되는 작은 웹 앱 또는 로컬 GUI 앱으로 구성한다.
- 초기 구현은 간단한 로컬 웹 앱 형태가 적합하다.
- 프론트엔드는 날짜 선택 달력, GUIDE 기준 요약, 검색 실행 버튼, 최근 생성 HTML 열기 기능을 제공한다.
- 백엔드 또는 로컬 실행 스크립트는 Google News RSS 검색을 호출한다.
- 검색 기준은 코드에 고정하지 않고 `GAT_SEARCH_GUIDE_v2026.txt` 또는 별도 설정 파일에서 관리한다.
- 검색 결과는 중복 제거, 매체 Tier 판정, GAT 주제 판정, 제외 조건 판정을 거쳐 정렬된다.
- 최종 결과는 `reports/` 폴더에 HTML 파일로 저장한다.
- 검색 기준 파일 경로와 포트 같은 로컬 설정은 환경 변수 또는 `.env` 파일로 관리한다.
- 향후 이메일 전송, CSV 저장, 검색 이력 기능을 붙일 수 있도록 검색, 필터링, 리포트 생성을 분리한다.

## 9. Risks And Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Google News RSS 검색 결과 범위 제한 | Medium | Medium | GUIDE 주제 그룹을 조정하고 필요 시 매체별 RSS 보강을 검토한다. |
| 선택 날짜와 실제 기사 게시일 불일치 | High | Medium | 검색 쿼리에 날짜 조건을 포함하고 HTML에 날짜 신뢰도 또는 검색상 날짜 정보를 표시한다. |
| 일부 매체의 Google News RSS 노출 제한 | Medium | Medium | 결과를 보고 항공 전문 매체 RSS 보강을 검토한다. |
| 광고성 또는 PR 기사 자동 제외의 한계 | Medium | High | 제외 키워드와 낮은 우선순위 표시를 적용하고 최종 판단은 사용자가 HTML에서 검토한다. |
| 외부 검색 서비스 응답 실패 | Medium | Medium | 검색 실패 메시지를 표시하고 생성된 쿼리를 HTML/화면에서 확인 가능하게 한다. |
| Google News RSS 검색 결과 품질 변동 | Medium | Medium | 결과 HTML에 검색 시각과 사용 쿼리를 기록한다. |

## 10. Schedule

| Phase | Target Date | Status |
|-------|-------------|--------|
| Plan | 2026-05-23 | Approved |
| Design | TBD | Pending |
| Implementation | TBD | Pending |
| Check | TBD | Pending |
| Report | TBD | Pending |

## 11. References

- `GAT_SEARCH_GUIDE_v2026.txt`
- Google News RSS
- User-approved Plan Plus discussion from 2026-05-23
