# 카드뉴스 디자인 렌더링 (3단계)

흐름: **PAGES/MASTER 데이터(2단계) → layout_type별 HTML/CSS 컴포넌트 → 1080x1350 PNG + 미리보기 화면**

1·2단계 코드는 그대로 두었다. 기존 여행 카드 렌더러(`src/render`)와 같은 방식(Playwright + HTML/CSS)을 쓰지만, 코드는 `src/design`에 따로 둔다.
Canva, AI 이미지 생성, 이미지 검색, 업로드, 여러 브랜드 테마 완성, ZIP 다운로드는 포함하지 않는다.

## 사용법

```bash
npm run design -- render                      # 전체 카드뉴스 → PNG + 미리보기
npm run design -- render CN-20260930-003      # 한 세트만
npm run design -- preview                     # 미리보기 HTML만 (PNG 없이 빠르게)
npm run design -- layouts                     # 구현된 레이아웃 목록
npm run test:design
```

결과물 (`cardnews_output/`은 git에 올리지 않음):

- `cardnews_output/rendered/<content_id>/page-01-BIG_TITLE.png …` : 1080x1350 PNG
- `cardnews_output/rendered/<content_id>/report.json` : 카드별 검수 결과
- `cardnews_output/rendered/preview.html` : 미리보기 화면 (파일 하나, 폰트 포함. 더블클릭으로 열림)

대시보드 서버(`npm run dev:server`)를 켜면 `http://localhost:4000/rendered/preview.html`에서도 볼 수 있다.

## 미리보기 화면

- **카드별 보기:** 왼쪽 카드 목록 → 가운데 선택 카드(4:5) → 오른쪽 layout_type, headline, body, visual_focus, items, 이미지 정보, 검수 결과
- **전체 보기:** 모든 카드를 썸네일로. 누르면 카드별 보기로 이동
- 위쪽 선택 상자로 카드뉴스 세트 전환. 키보드 ←/→로 카드 이동
- 주소 끝에 `#CN-20260930-003/4`를 붙이면 그 카드가 바로 열린다 (`/overview`를 더하면 전체 보기)
- 폭 900px 이하(모바일): 카드 → 가로 썸네일 줄 → 정보 순서로 세로 배치

## 구조

| 파일 | 역할 |
|---|---|
| `tokens.ts` | 디자인 토큰 타입과 CSS 변수 변환 (색, 글자 크기, 여백, radius, border, shadow) |
| `themes/default.ts` | 기본(마케팅) 테마 값 |
| `themes/index.ts` | 테마 레지스트리. MASTER `category`로 테마를 고르고, 없으면 default. `extendTheme`로 일부만 바꾼 새 테마 생성 |
| `baseCss.ts` | 폰트(Pretendard, OFL), 카드 틀, 글자 위계, 강조, 이미지 자리 |
| `parts.ts` | 공통 조각: 카드 틀(브랜드·페이지 번호·진행 표시), 강조, 숫자/단위 분리, placeholder |
| `layouts/*.ts` | 레이아웃 13개, 파일 하나에 하나 (`BigTitleTemplate` …) |
| `layouts/index.ts` | `layout_type` → 컴포넌트. 모르는 값이면 TEXT로 대신 그리고 경고 |
| `checks.ts` | 검수 (정적 + 브라우저 측정) |
| `renderHtml.ts` | PAGES → 카드 HTML (PNG와 미리보기가 같은 HTML을 씀) |
| `renderPng.ts` | Playwright로 PNG 캡처 + overflow 측정 + report.json |
| `preview.ts` | 미리보기 화면 |

새 레이아웃은 `layouts/`에 파일 하나를 만들고 `layouts/index.ts`에 등록한다. 레이아웃 CSS에는 색을 직접 쓰지 않고 토큰 변수만 쓴다 (테스트로 확인).
새 테마는 `themes/`에 `DesignTheme` 객체를 만들고 `themes/index.ts`에 등록한다.

## 텍스트 검수 (폰트를 줄여 억지로 넣지 않음)

1. **정적 검사 → warning:** 레이아웃별 권장 글자 수(headline/subheadline/body/각 item), items 개수(예: NUMBER_LIST 2~5개, THREE_COLUMN 3개, GRID 4~6개). 두 가지 이상 넘으면 "이 카드의 내용이 너무 많아 분리하는 것이 좋습니다."
2. **실제 렌더링 측정 → error:** 각 텍스트는 레이아웃이 정한 줄 수까지만 보이고, 넘치면 잘린다(카드 밖으로 나가지 않음). 잘렸는지 브라우저에서 측정해 error로 표시한다. PNG 렌더러와 미리보기 화면이 같은 측정 코드를 쓴다.
3. **기타:** 이미지가 필요한데 아직 없으면 info(placeholder 표시), 폰트가 로드되지 않으면 warning.

`render` 명령은 error가 하나라도 있으면 종료 코드 1로 끝난다.
