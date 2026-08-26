---
name: domestic-travel-cardnews-publisher
description: >
  국내여행 카드뉴스를 자동으로 기획·제작하고 인스타그램에 예약 발행한다.
  "OO 카드뉴스 만들어줘", "OO 여행지 카드뉴스 만들어서 O월 O일 O시에 예약해줘",
  "이번 주 국내여행 카드뉴스 N개 만들어서 매일 저녁 O시에 예약해줘" 같은 요청에 사용한다.
---

# domestic-travel-cardnews-publisher

국내여행 카드뉴스 자동 제작 → 저장 → 예약 → SNS 자동 발행 시스템의 Claude Skill 진입점.
전체 설계는 저장소 루트 `README.md`를 참고. 이 문서는 "Claude가 자연어 요청을 받았을 때
정확히 무엇을 실행해야 하는지"만 규정한다.

## 큰 그림

```
사용자 자연어 요청
  → (1) Research: 이 Skill(Claude)이 WebSearch/WebFetch로 실제 장소를 조사해 data/places/*.json에 기록
  → (2) 그 다음부터는 코드(orchestrator)가 담당: Content → Render → Save → Caption
  → (3) 예약 시간이 언급되면 Queue에 등록까지 진행
  → (4) 스케줄러가 별도로 (또는 사용자가 수동으로) 예약 시간에 발행
```

**중요한 원칙**: 이 Skill(Claude, 즉 나)이 직접 카드뉴스 문구나 장소를 지어내지 않는다.
장소 사실 확인(주소/운영시간/가격 등)은 반드시 WebSearch로 조사하고, 결과를 `data/places/*.json`
스키마(아래 참고)에 맞춰 저장한 다음, 코드(`npm run cardnews`)가 그 라이브러리에서만 장소를
골라 카드뉴스를 만들도록 한다. 이렇게 해야 "존재하지 않는 관광지"가 생성되는 일이 없다.

## 1단계 - Research (WebSearch로 직접 수행)

사용자가 준 주제/지역/계절 키워드로 WebSearch를 실행해 실제 존재하는 장소를 조사한다.
우선순위 출처: 한국관광공사, 대한민국 구석구석, 지자체 공식 사이트, 관광재단, 공식 관광지
홈페이지, 네이버 지도, 공식 SNS.

조사한 장소마다 아래 필드를 채워 `data/places/{region_slug}.json`에 저장한다
(`src/research/verify.ts`의 `toVerifiedPlace()` 스키마와 동일):

```json
{
  "place_id": "지역-장소명(공백제거,소문자)",
  "place_name": "",
  "region": "",
  "address": "",
  "category": "관광지|축제|맛집|카페|숙소|여행코스|드라이브코스|꽃명소|단풍명소|바다|계곡|캠핑|데이트|가족여행",
  "description": "",
  "opening_hours": "",
  "price": "",
  "parking": "",
  "recommended_season": "",
  "rating": 4.x,           // 맛집/카페 카테고리일 때만. 4.0 미만이면 자동 제외되니 굳이 넣지 않아도 됨.
  "status": "open",
  "source": "실제 URL",
  "checked_at": "오늘 날짜(YYYY-MM-DD)",
  "verification": "verified"
}
```

- 주소/출처를 확인할 수 없는 장소는 절대 만들어내지 말고 제외하거나
  `"verification": "verification_required"`로 남긴다 (그런 장소는 카드뉴스 후보에서 자동 제외된다).
- 맛집/카페는 평점 4.0 미만이면 기본적으로 제외된다 (`config/config.yaml`의 `place_rules.minimum_rating`).
- 이미 `data/places/`에 검증된 장소가 있다면 (예: `gangneung.json`) 새로 조사하지 않고 재사용해도 된다.

Write 도구로 JSON 파일을 직접 쓰거나, 이미 있는 파일에 병합해서 써도 된다. 배열 형태이고
`place_id`가 같으면 덮어써도 무방하다 (중복 문제 없음).

## 2단계 - 카드뉴스 생성 (코드 실행)

리서치가 끝나면 CLI를 실행한다 (Bash 도구로):

```bash
npm run cardnews -- create "<주제>" --region "<지역>" [--season "<계절>"] \
  [--template <템플릿명>] [--cta "<CTA문구>"] [--slide-count <N>]
```

- `--region`을 주지 않으면 topic에서 자동 추정하지만, 방금 조사한 지역명을 명시적으로
  넘겨주는 편이 안전하다.
- 실행 결과에 저장된 폴더 경로와 caption.txt 내용이 출력된다. 이걸 사용자에게 요약해서 보여준다.
- 이미지는 Playwright로 렌더링되며 몇 초~십여 초 걸릴 수 있다.

## 3단계 - 예약 (사용자가 날짜/시간을 언급했다면)

자연어 날짜("내일 오후 7시", "9월 5일 저녁 7시", "매일 오후 7시")를 **오늘 날짜 기준으로**
`YYYY-MM-DD HH:mm` (Asia/Seoul 기준, 24시간제)로 직접 변환한 다음:

```bash
npm run cardnews -- schedule-folder "<2단계에서 나온 폴더 경로>" "2026-09-05 19:00" \
  --title "<주제>" [--auto]
```

- `--auto`를 안 붙이면 기본은 REVIEW 모드다: 큐에는 들어가지만 사람이 승인해야 실제 발행된다.
  사용자가 "바로 올려", "자동으로 발행해"라고 명시하지 않는 한 REVIEW가 기본이다.
- 승인: `npm run cardnews -- approve <postId>`
- 즉시 발행 시도: `npm run cardnews -- publish <postId>`
- 큐 확인: `npm run cardnews -- queue`

## 배치 제작 ("이번 주 카드뉴스 N개 만들어서 매일 O시에 예약해줘")

각 주제마다 1단계(Research)를 먼저 수행해 `data/places/`를 채워둔 다음:

```bash
npm run cardnews -- batch "강릉,평창,부산,경주,여수,전주,제주" \
  --start-date 2026-09-01 --hour 19 --minute 0
```

주제 순서대로 하루 간격으로 자동 배정된다. 각 주제의 지역명이 topic 문자열에 포함돼 있어야
지역 추정이 정확하다 (예: "강릉 여름 여행지 5곳"처럼 지역명을 topic 앞에 넣기).

## 참고 - Instagram 실제 업로드

`config/config.yaml`의 `instagram.enabled`가 `false`이거나 `.env`의 `DRY_RUN=true`인 동안은
실제 업로드 없이 "이 시간에 업로드될 예정" 로그만 남긴다 (안전 기본값). 사용자가 실제 계정
연동을 요청하면 `.env.example`을 참고해 `INSTAGRAM_ACCOUNT_ID`/`META_ACCESS_TOKEN`을 설정하고,
`src/publishers/instagram/imageHost.ts`의 `setImageUrlResolver()`를 배포 환경(S3/Cloudinary 등)에
맞게 구현해야 한다 (Graph API는 로컬 파일이 아니라 공개 HTTPS 이미지 URL만 받는다).

## 그 밖의 CLI 명령

`npm run cardnews -- --help` 로 전체 목록 확인. `cancel`, `calendar`, `inbox:scan`, `tick` 등이 있다.
