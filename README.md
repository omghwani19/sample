# GAT 기사 검색 리포트

Google News RSS 검색으로 GAT(Global Aviation Trend) 기준에 맞는 글로벌 항공 산업 기사 후보를 찾고, 브라우저에서 바로 검토할 수 있는 HTML 리포트를 생성하는 로컬 웹 앱입니다. 기본 모드는 Google API 키가 필요 없습니다.

## 주요 기능

- 날짜 고정 검색: 선택한 날짜 기준으로 Google `after:` / `before:` 조건을 적용합니다.
- 매체별 `site:` 검색: GAT Guide의 Tier 1~6 및 확장 매체 DB를 Google News RSS 검색어에 적용합니다.
- 날짜 표현 확장: `"May 18, 2026"`, `"18 May 2026"`, `"2026-05-18"`, `"published 18 May 2026"`, `"W/C May 18, 2026"` 패턴을 생성합니다.
- GAT 주제 결합: 정책/규제, 항공사 전략, 공항 인프라, 항공기 기술, MRO, SAF/탄소, UAM/eVTOL, 보안, 디지털 기술 키워드를 결합합니다.
- 원문 검증: Google News 링크를 원문 URL로 변환하고, 원문 HTML의 `meta`, JSON-LD, `time` 태그에서 게시일을 확인합니다.
- 본문 보강 필터: 원문 HTML의 description과 본문 일부를 읽어 GAT 주제 및 제외 신호 판정에 함께 사용합니다.
- 후보 분류: `A 우선 검토`, `B 추가 검토`, `Exclude 제외/보류`로 점수화합니다.
- 리포트 출력: 검색 결과, 점수, GAT 주제, 제외 사유, 원문 날짜 확인 상태를 HTML 파일로 저장합니다.

## 실행 방법

가장 쉬운 방법은 `start-gat-search.cmd`를 더블클릭하는 것입니다.

터미널에서 직접 실행하려면 다음 순서를 따릅니다.

1. `.env.example`을 `.env`로 복사합니다.
2. 필요하면 `GAT_GUIDE_PATH`를 수정합니다.
3. 서버를 실행합니다.

```powershell
npm.cmd start
```

5. 브라우저에서 `http://localhost:4173`을 엽니다.

생성된 HTML 리포트는 `reports/` 폴더에 저장됩니다.

## 환경 변수

```text
GAT_GUIDE_PATH=C:\Users\hwani\Downloads\GAT_SEARCH_GUIDE_v2026.txt
PORT=4173
SEARCH_PROVIDER=google-news-rss
GOOGLE_API_KEY=
GOOGLE_CSE_ID=
```

- `GAT_GUIDE_PATH`: 선택 사항입니다. 파일을 찾지 못하면 앱의 내장 GAT 설정을 사용합니다.
- `PORT`: 선택 사항입니다. 기본값은 `4173`입니다.
- `SEARCH_PROVIDER`: 기본값은 `google-news-rss`입니다. API 키 없이 검색합니다. `google-cse`로 바꾸면 Custom Search API 모드를 사용할 수 있습니다.
- `GOOGLE_API_KEY`: `SEARCH_PROVIDER=google-cse`일 때만 필요합니다.
- `GOOGLE_CSE_ID`: `SEARCH_PROVIDER=google-cse`일 때만 필요합니다.

## 사용 흐름

1. 날짜를 선택합니다.
2. 필요한 매체 Tier를 선택합니다.
3. `쿼리 미리보기`로 생성될 검색 계획을 확인합니다.
4. `검색`을 누릅니다.
5. 결과 카드에서 우선순위, 점수, GAT 주제, 제외 사유, 원문 날짜 확인 상태를 검토합니다.
6. 생성된 HTML 리포트를 열어 편집 검토용 목록으로 사용합니다.

## 품질 기준

포함 대상:

- 항공 정책 및 규제
- 항공사 전략 및 산업 구조
- 공항 투자 및 인프라 개발
- 항공기 제조 및 기술
- 항공 MRO 산업
- SAF 및 탄소 정책
- UAM 및 eVTOL
- 항공 보안
- 항공 디지털 기술 및 데이터

제외 또는 보류 대상:

- 단순 여행 정보
- 관광 홍보
- 소비자 서비스
- 단순 기업 PR
- 광고성 또는 sponsored 콘텐츠
- 날짜 불일치 후보
- GAT 주제 직접성이 약한 후보

단, 정부/국제기구/공항/규제기관의 발표처럼 산업 정책성이 강한 보도자료는 무조건 제외하지 않고 검토 대상으로 둘 수 있습니다.

## 검증

문법 검사는 다음 명령으로 실행합니다.

```powershell
npm.cmd run check
```

서버 기동, 상태 API, 쿼리 미리보기, 검색/리포트 경로를 확인하려면 다음 명령을 실행합니다.

```powershell
npm.cmd run qa
```

QA는 기본 Google News RSS 모드로 실제 검색 경로와 리포트 생성 경로를 확인합니다. 결과 요약은 `reports/qa-smoke-last.json`에 저장됩니다.

## 현재 한계

- Google News RSS는 무료로 사용할 수 있지만 일반 Google 검색 전체 결과와 완전히 같지는 않습니다.
- 일반 Google 검색 결과 페이지를 직접 자동 수집하는 방식은 차단, 캡차, 페이지 구조 변경에 취약해서 기본 기능으로 넣지 않았습니다.
- 일부 유료 매체나 스크립트 렌더링 사이트는 원문 날짜 메타데이터를 가져오지 못할 수 있습니다.
- 자동 필터는 편집 보조용입니다. 최종 채택 여부는 HTML 리포트에서 사람이 확인하는 흐름을 권장합니다.
