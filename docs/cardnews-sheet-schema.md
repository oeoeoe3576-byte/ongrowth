# 카드뉴스 시트 데이터 구조 (1단계)

흐름: 주제 입력 → AI 원고 생성 → **Google Sheets (카드뉴스 1세트 = 1행)** → Canva Bulk Create → 일괄 생성

이 문서는 1단계(데이터 구조 + 원고 생성 구조)만 다룬다. Canva API, 이미지 생성, 디자인은 포함하지 않는다.
컬럼 정의의 단일 출처는 `src/sheet/schema.ts` 다. 이 문서와 코드가 다르면 코드가 맞다.

## 1. 원래 구조 검토 결과

| # | 원래 구조의 문제 | 조치 |
|---|---|---|
| 1 | Canva Bulk Create는 한 번에 **템플릿 1개**에만 데이터를 넣는다. 브랜드가 늘어나면 한 시트에 여러 템플릿용 행이 섞인다 | `brand`, `template_key` 컬럼 추가. Canva용 CSV는 `brand/template_key` 별로 파일을 나눠 생성 |
| 2 | 규칙 9·10(사실 확인, 추측 금지)을 기록할 곳이 없음 | `source_notes` 컬럼 추가 (근거/출처 또는 "정보 부족: ...") |
| 3 | `caption`, `hashtags`, 관리 필드는 디자인에 들어가지 않음. Canva 연결 화면에 27개 필드가 모두 뜨면 연결 실수 위험 | 마스터 CSV(27컬럼)와 **Canva 전용 CSV(16컬럼: content_id + 카드 필드)** 분리 |
| 4 | Canva 텍스트 박스는 긴 텍스트가 들어오면 넘치거나 글자가 작아짐 | 필드별 최대 글자 수 지정 (아래 표). 검증기가 초과 시 에러 |
| 5 | 셀 안 줄바꿈은 Canva 텍스트 박스에서 예측하기 어렵게 표시될 수 있음 | Canva 연결 필드는 **줄바꿈 금지** (검증기 에러). 줄바꿈은 템플릿의 텍스트 박스 폭으로 처리. `caption`은 발행용이라 허용 |
| 6 | `=`, `+`, `-`, `@` 로 시작하는 값은 Google Sheets가 수식으로 해석 | 검증기 에러 (예: 본문을 `-`로 시작하는 목록 형태로 쓰지 않음) |
| 7 | `status`, `content_type` 값이 자유 입력이면 필터/자동화가 어려움 | 허용 값 목록 지정 |
| 8 | `cover_title/cover_subtitle` 만 `pageN_` 규칙과 이름이 다름 | 요청한 이름 그대로 유지 (스키마 파일에 페이지 번호를 명시해 코드에서는 문제 없음) |

그 외 요구 구조(1행 = 1세트, 카드별 제목/본문 독립 컬럼, 7장 고정)는 Canva Bulk Create의 "헤더 1행 + 데이터 N행" 표 구조에 그대로 맞으므로 유지했다.

## 2. 컬럼 (27개, 이 순서 고정)

`C` = Canva 전용 CSV에 포함되는 컬럼

| # | 컬럼 | 그룹 | C | 최대 | 설명 |
|---|---|---|---|---|---|
| 1 | content_id | 관리 | ✓ | | `CN-YYYYMMDD-NNN`, 중복 불가 |
| 2 | brand | 관리 | | | 브랜드/계정 키 |
| 3 | template_key | 관리 | | | Canva 템플릿 식별자 |
| 4 | topic | 관리 | | | 입력 주제 |
| 5 | category | 관리 | | | 분야 (marketing, travel, beauty, stay …) 자유 입력 |
| 6 | content_type | 관리 | | | tips / howto / checklist / list / comparison / case / guide |
| 7 | target | 관리 | | | 대상 독자 |
| 8 | status | 관리 | | | draft / review / approved / designed / published / hold |
| 9 | created_at | 관리 | | | `YYYY-MM-DD HH:mm` (KST) |
| 10 | source_notes | 관리 | | | 근거/출처, 또는 "해당 없음", "정보 부족: …" |
| 11 | cover_title | 1p 표지 | ✓ | 22 | |
| 12 | cover_subtitle | 1p 표지 | ✓ | 32 | |
| 13–14 | page2_title / page2_body | 2p 문제 제기 | ✓ | 20 / 80 | |
| 15–16 | page3_title / page3_body | 3p 핵심 1 | ✓ | 20 / 80 | |
| 17–18 | page4_title / page4_body | 4p 핵심 2 | ✓ | 20 / 80 | |
| 19–20 | page5_title / page5_body | 5p 핵심 3 | ✓ | 20 / 80 | |
| 21–22 | page6_title / page6_body | 6p 요약/적용 | ✓ | 20 / 80 | |
| 23–24 | page7_title / page7_body | 7p 마무리 | ✓ | 20 / 80 | |
| 25 | cta | 7p CTA | ✓ | 25 | |
| 26 | caption | 발행 | | 2200 | 줄바꿈 허용 |
| 27 | hashtags | 발행 | | | `#태그 #태그` 공백 구분 |

글자 수 한도는 모바일 가독성 기준의 초기값이다. 실제 Canva 템플릿 텍스트 박스 크기가 정해지면 `schema.ts`에서 조정한다.

## 3. 파일 / 명령

| 파일 | 용도 |
|---|---|
| `src/sheet/schema.ts` | 컬럼 정의 (단일 출처) |
| `src/sheet/csv.ts` | RFC 4180 CSV 읽기/쓰기, UTF-8 |
| `src/sheet/validate.ts` | 행 / CSV 파일 / Canva 배치 검증 |
| `src/sheet/generationSpec.ts` | AI 원고 생성 프롬프트 + 출력(JSON) → 시트 행 변환 (LLM 호출 없음) |
| `src/sheet/cli.ts` | CLI |
| `src/sheet/sheet.test.ts` | 테스트 |
| `data/sheet/sample_input.json` | 테스트용 입력 + 원고 1건 |
| `data/sheet/cardnews_rows.json` | 시트 행 JSON |
| `data/sheet/header_template.csv` | 빈 시트 헤더 (Google Sheets 시작용) |
| `data/sheet/cardnews_master.csv` | 마스터 시트 CSV (UTF-8, BOM 없음) |
| `data/sheet/cardnews_master_excel.csv` | Excel에서 직접 열 때용 (UTF-8 BOM) |
| `data/sheet/canva_<brand>__<template_key>.csv` | Canva Bulk Create 업로드용 |

```bash
npm run sheet -- sample                 # sample_input.json → cardnews_rows.json
npm run sheet -- export --bom           # rows.json → CSV 파일들
npm run sheet -- validate data/sheet/canva_ongrowth__marketing_basic_7p.csv
npm run sheet -- prompt                 # AI 생성 프롬프트 확인
npm run test:sheet
```

## 4. 사용 방법

**Google Sheets**: 파일 → 가져오기 → `cardnews_master.csv` 업로드 (또는 `header_template.csv`로 빈 시트 시작).
시트에서 CSV로 다시 내보내면 UTF-8로 저장된다. `created_at`이 날짜 형식으로 자동 변환될 수 있으나 Canva 전용 CSV에는 포함되지 않는다.

**Canva Bulk Create**:
1. 7페이지 템플릿을 만들고 각 텍스트 박스에 필드를 연결 (`cover_title` … `cta`)
2. `canva_<brand>__<template_key>.csv` 업로드 → 행마다 7페이지 세트가 생성됨
3. `content_id`는 추적용. 템플릿에 연결하지 않아도 된다

**Excel 주의**: BOM 없는 UTF-8 CSV를 Excel에서 더블클릭으로 열면 한글이 깨질 수 있다. 이 경우 `*_excel.csv`를 사용하고, Canva/Sheets에는 BOM 없는 파일을 쓴다. Excel에서 저장할 때는 반드시 "CSV UTF-8" 형식으로 저장한다 (일반 "CSV"는 CP949로 저장되어 검증기에서 거부됨).
