# GAT 기사 검색 리포트

Google News RSS로 GAT 기사 후보를 무료 검색하고, 단독 실행 가능한 HTML 리포트를 생성하는 로컬 웹 앱입니다. Google API 키가 필요 없습니다.
검색 결과는 RSS 게시일을 한국 날짜 기준으로 다시 확인해, 선택한 날짜와 맞는 기사만 리포트에 남깁니다.
Google News 링크는 가능한 경우 원문 기사 URL로 변환해 표시합니다.

## 실행

가장 쉬운 방법은 `start-gat-search.cmd`를 더블클릭하는 것입니다.
이 파일은 로컬 서버를 실행하고 브라우저에서 `http://localhost:4173`을 엽니다.

터미널에서 직접 실행하려면 아래 순서를 따릅니다.

1. `.env.example`을 `.env`로 복사합니다.
2. 필요하면 `GAT_GUIDE_PATH`를 수정합니다.
3. 실행합니다.

```powershell
npm start
```

4. `http://localhost:4173`을 엽니다.

생성된 리포트는 `reports/` 폴더에 저장됩니다.

## 확인

문법 검사는 다음 명령으로 실행합니다.

```powershell
npm run check
```

실제 검색, 리포트 생성, 리포트 열기까지 한 번에 확인하려면 다음 명령을 실행합니다.

```powershell
npm run qa
```

QA 결과 요약은 `reports/qa-smoke-last.json`에 저장됩니다.

## 현재 범위

- 날짜는 한국 날짜 기준으로 검증합니다.
- GUIDE 전체 조건을 고정 검색 기준으로 사용합니다.
- 기본 검색은 RSS 게시일이 선택 날짜와 일치하는 기사만 표시합니다.
- 필요할 때만 `선택 날짜와 다른 RSS 후보도 참고용으로 표시` 옵션을 켜서 날짜 확인 후보를 볼 수 있습니다.
- 가능한 경우 Google News 링크를 원문 기사 URL로 변환합니다.
- 변환 실패 시에도 클릭 가능한 Google News 링크를 남깁니다.
