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

## 추가: 테마 4종 · 강조 표시 · 사진 표지 · 프로필 카드 (레퍼런스 반영 시험판)

**테마** (`src/design/themes/`) — 같은 원고를 테마만 바꿔 비교할 수 있다.

| 이름 | 느낌 | 본문 강조(`**…**`) 방식 |
|---|---|---|
| `default` | 오프화이트 + 코발트 블루 | 강조색 |
| `insight` | 검정 + 초록 | 강조색 |
| `life` | 크림 + 갈색 (여행·숙소 기본) | 굵기 (제목이 얇고 강조만 굵게) |
| `campaign` | 밝은 바탕 + 진초록 표지 + 주황 | 형광펜 |

테마 선택 순서: `--theme` 옵션 → 브랜드 설정의 `theme` → MASTER `category` → default.
어두운 카드/사진 위에서는 테마의 `accentOnDark`, `emphasis.colorOnDark`가 자동으로 쓰인다.

**본문 강조** — 원고에 `**구절**`로 표시하면 테마 방식대로 강조된다. 한 칸에 2곳까지, 글자 수에는 `**`가 빠진다 (2단계 검증기와 프롬프트에 반영).

**새 레이아웃**
- `PHOTO_COVER`: 사진이 카드 전체, 아래쪽을 어둡게 하고 큰 흰 제목. `image_source`에 로컬 경로(예: `data/images/cover.jpg`)나 URL을 넣으면 들어가고, 없으면 "사진 자리"로 표시.
- `FOLLOW`: 마지막 장 프로필 카드 + 팔로우 버튼. 목적이 팔로우일 때.

**브랜드 설정** `data/brands/<brand>.json`

```json
{ "handle": "ongrowth", "displayName": "표시 이름", "bio": ["소개 1줄", "소개 2줄"],
  "theme": "insight", "logo": "data/brands/ongrowth-logo.png", "categoryLabel": "MARKETING NOTE",
  "stats": { "posts": "120", "followers": "3,400", "following": "210" } }
```

`stats`는 넣었을 때만 표시한다 (숫자를 지어내지 않음). `ongrowth.json`의 소개 문구는 자리 표시용이니 실제 내용으로 바꿔야 한다.

**테마 비교 화면**

```bash
npm run design -- compare CN-20261001-001 CN-20260930-003 --png
# → cardnews_output/rendered/compare.html (+ compare/<테마>/<id>/*.png)
```

`data/planner/test/images/sample-cover.jpg`는 코드로 만든 임시 이미지(실제 사진 아님)다.
