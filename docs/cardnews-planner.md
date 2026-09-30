# 카드뉴스 기획 엔진 (2단계)

흐름: **브랜드 · 주제 · 참고자료 · 목적 입력 → AI 기획(JSON) → 규칙 검증 → (오류 시 AI에게 수정 요청) → MASTER / PAGES 시트**

1단계(`src/sheet`, 7장 고정 1행 구조)는 그대로 두었다. 2단계는 장수가 바뀌는 카드뉴스를 위해 `src/planner`에 별도로 만들고, CSV 입출력은 1단계 코드를 재사용한다.
Canva 연결, 디자인, 렌더링, 이미지 생성은 포함하지 않는다.

## 사용법

```bash
# Claude API로 기획 (ANTHROPIC_API_KEY 필요, 기본 모델 claude-opus-5-5, ANTHROPIC_PLANNER_MODEL로 변경 가능)
npm run planner -- plan --brand ongrowth --topic "한 달 치 SNS 콘텐츠 한 번에 기획하는 법" --objective 저장유도
npm run planner -- plan --brand my_stay --topic "11월 평일 할인" --objective 판매 --reference 자료.txt

# API 없이: 미리 준비한 AI 응답 파일로 같은 과정 실행 (재현/테스트)
npm run planner -- plan ... --response 응답1.json [응답2.json …]

npm run planner -- show CN-20260930-001   # 한 세트 보기
npm run planner -- validate               # MASTER ↔ PAGES 무결성 검사
npm run planner -- prompt                 # AI에게 보내는 시스템 프롬프트 보기
npm run test:planner
```

목적(`--objective`)은 한글/영문 모두 받는다: 정보전달 `INFORM`, 저장유도 `SAVE`, 팔로우 `FOLLOW`, 판매 `SALES`, 제휴 `PARTNERSHIP`, 참여유도 `ENGAGEMENT`.
`--category`, `--target`을 주지 않으면 AI가 판단한다.

## AI가 판단하는 것

| 항목 | 값 |
|---|---|
| content_type | INFO 정보형 · LIST 리스트형 · STEP STEP형 · ROADMAP 로드맵형 · COMPARE 비교형 · CASE 사례/성과형 · OFFER 혜택/서비스형 |
| 장수 | 5~12장 (고정 아님) |
| page_role | HOOK · PROBLEM · OVERVIEW · INFORMATION · STEP · RESULT · SUMMARY · CTA |
| layout_type | BIG_TITLE · BIG_NUMBER · TEXT · NUMBER_LIST · IMAGE_TEXT · SCREENSHOT · THREE_COLUMN · GRID · COMPARE · TIMELINE · GRAPH · RESULT · CTA |
| image_type | PHOTO · SCREENSHOT · ICON · AI_IMAGE · GRAPH · CHART · LOGO |
| fact_check | NOT_REQUIRED · REFERENCE(참고자료 근거, source 필수) · NEEDS_CHECK(사람 확인 필요) |

허용 값은 `src/planner/types.ts` 한 곳에서 관리한다. 프롬프트와 검증기가 모두 이 파일을 읽는다.

## 자동 검증 규칙 (`src/planner/validatePlan.ts`)

error가 있으면 오류 목록을 AI에게 보내 다시 쓰게 한다 (기본 3회). 끝까지 실패하면 저장하지 않는다.

- **구성:** 5~12장. 첫 장 HOOK, 마지막 장 CTA. page_number는 1부터 연속. page_count와 실제 장수가 같아야 함
- **문구:** 글자 수 한도(headline 24, subheadline 40, body 90, visual_focus 12, items 각 30자·최대 6개, cta 30). 줄바꿈 금지. 페이지 간 같은 headline/body 금지. 과장 표현(충격, 무조건, 100%, 대박, 역대급 …) 금지
- **visual_focus:** 그 페이지 문구 안에 있는 말이어야 함. 새 숫자를 만들어 강조하는 것을 막는다
- **레이아웃:** HOOK은 BIG_TITLE/BIG_NUMBER/IMAGE_TEXT/SCREENSHOT. CTA 레이아웃은 CTA 페이지에만. 한 레이아웃이 절반을 넘으면 error, 연속으로 같은 레이아웃이면 warning
- **레이아웃과 내용:** BIG_NUMBER는 숫자가 든 visual_focus, THREE_COLUMN은 items 3개, GRID 4개 이상, TIMELINE 3개 이상, NUMBER_LIST·COMPARE 2개 이상, SCREENSHOT은 image_type SCREENSHOT, GRAPH는 GRAPH/CHART
- **이미지:** 모든 페이지에 이미지 지정 금지. AI_IMAGE는 image_prompt 필수. image_required=false면 이미지 필드는 빈 값
- **사실 확인:** 참고자료가 없으면 REFERENCE와 그래프/차트를 쓸 수 없음. REFERENCE는 source 필수. NEEDS_CHECK가 하나라도 있으면 MASTER status가 `review`로 저장됨

## 데이터 구조

`data/planner/master.csv` — 1행 = 카드뉴스 1세트

`content_id, brand, topic, category, objective, content_type, target, status, page_count, caption, hashtags, created_at`

`data/planner/pages.csv` — 1행 = 카드 1장, `content_id`로 MASTER와 연결

`content_id, page_number, page_role, layout_type, headline, subheadline, body, visual_focus, items, image_required, image_type, image_source, image_prompt, cta, source, fact_check`

- `page_count`는 요청 목록에 없던 컬럼으로, MASTER와 PAGES 연결 검사를 위해 추가했다
- `items`는 한 셀에 ` | `로 구분해 저장한다 (예: `촬영은 촬영끼리 | 글은 글끼리`)
- `image_required`는 `TRUE` / `FALSE`
- `image_prompt`는 AI_IMAGE면 생성용 프롬프트, SCREENSHOT/PHOTO 등이면 준비할 이미지 설명
- `data/planner/plans/<content_id>.json`에 AI 원본(기획 이유 `planning_note` 포함)을 남긴다
- 같은 content_id로 다시 기획하면(`--id`) MASTER 1행과 PAGES 전체가 교체된다

## 테스트 데이터

`data/planner/test/`의 응답 파일은 API 키가 없는 환경에서 엔진을 끝까지 돌려보기 위해 만든 것이다.
`reference_stay_sample.txt`와 `sample_stay` 브랜드는 **가상 자료**다. 실제 업체 정보가 아니다.
