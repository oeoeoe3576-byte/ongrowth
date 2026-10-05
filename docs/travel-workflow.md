# 요즘어디감(@eodigam_yojeom) 매일 작업 절차

매일 아침 예약 실행되는 "요즘어디감 작업실" 세션이 이 문서를 읽고 그대로 수행한다.
사람의 확인은 세 번이다: **① 주제 컨펌 → ② 기획안 검토 → ③ 완성 카드 검토(승인/수정/보류)**.
앞 단계 답을 받기 전에는 다음 단계를 만들지 않는다. 업로드는 퇴근 시간 **18:30 (KST)**.

- 브랜드 키 `travel` (`data/editorial/travel.json`, `data/brands/travel.json`), 디자인 `trend-aqua`
- 요일: 월 시즌 · 화 숙소 · 수 정보 · 목 행사 · 금 코스 · 토 정보 · 일 숙소
- 주말분은 미리: **금요일 아침에 금 + 토 + 일 3개를 한 번에**. 월~목은 그날 1개. 토·일 아침에는 검토 요청을 하지 않는다
- 인스타 토큰: `META_ACCESS_TOKEN_TRAVEL`, `INSTAGRAM_ACCOUNT_ID_TRAVEL` (온그로스 토큰과 섞지 않는다)
- 원고 작성은 이 세션의 Claude가 직접 한다 (`--response` 방식)

## 1. 준비
```bash
cd <ongrowth 저장소>
git fetch origin claude/cardnews-data-structure-vyne5l
git checkout claude/cardnews-data-structure-vyne5l && git pull
npm install
```

## 2. 오늘 할 일 정하기
- **토·일:** 검토 요청 없음. `npm run editorial -- status --brand travel`로 오늘 날짜의 `approved` 건이 있으면
  18:30 KST에 "발행 단계 실행: <id>" 메시지를 예약(`send_later`)하고 끝. 승인 건이 없으면 푸시로
  "📌 오늘(토/일) 요즘어디감 업로드할 승인 건이 없어요"만 알리고 끝.
- **월~금:** `npm run editorial -- next --brand travel --reserve`
  - **금요일**은 토·일분도: `next --brand travel --date <토요일> --reserve`, `next --brand travel --date <일요일> --reserve`
    (주제 컨펌·기획안·카드 검토를 3개 한 번에 묶어서 보낸다)
  - 이미 `review`/`approved`/`published`면 새로 만들지 말고 상태만 알린다.
  - 남은 주제가 없으면(종료 코드 2) 그 채널 주제 5개를 시즌에 맞게 새로 만들어 `editorial add --brand travel`로 넣고 다시.

## 3. ① 주제 컨펌 (푸시 필수)
`PushNotification`으로 `📌 요즘어디감 주제 컨펌: '<주제>' — 좋아 / 다른 주제로 답해주세요` (한 줄, 200자 이내).
본문에는 주제, 방향, 채널, 다른 후보 1개(금요일은 금·토·일 3개 주제를 함께).
**주제 컨펌에는 항상 시안(카드 초안 이미지)을 함께 보낸다.** 조사해서 확인된 만큼 정보·사진을 채워 견본으로 첨부하고, 비어 있는 부분(사진 등)은 무엇이 비었는지와 구할 링크를 적는다.
- **좋아/OK/진행** → 4단계
- **다른 주제** → `editorial swap --brand travel [--date …]` 후 다시 컨펌
- **직접 주제를 주면** → `editorial add --brand travel --channel <채널> --topic "…"` → `swap --to <새 ID>`
- 오전 중 답이 없으면 진행하지 않는다.

## 4. 조사 (사실 확인)
- **행사·축제:** `npm run editorial -- festivals --from <YYYYMMDD> --to <YYYYMMDD>`(관광공사 공식 목록)에서 고르고,
  날짜·장소·시간을 **주최 측(지자체) 공식 페이지**에서 한 번 더 확인 (WebSearch/WebFetch).
- **팝업·전시:** 브랜드/주최 측 공식 채널에서 기간·장소·예약 방법 확인. 끝났거나 3일 안에 끝나는 건 제외.
- **숙소:** 공식 사이트 기준. 가격·예약 가능 여부는 쓰지 않거나 `fact_check: NEEDS_CHECK`.
- **시즌:** 개화·단풍 시기 등은 기상청·산림청·국립공원공단 같은 공식 자료.
- 확인한 출처 주소는 각 페이지 `source`에 적는다. 확인 못 한 사실은 쓰지 않는다.

## 5. ② 기획안 검토
원고를 만들기 전에 기획안을 보내고 답을 기다린다. 푸시: `📝 요즘어디감 기획안 검토: '<주제>'`.
- 장별 한 줄 (장 번호 · 역할 · 제목 · 핵심 내용), 소개할 장소/행사 목록과 출처
- 쓸 사진 후보: `npm run editorial -- photos "<검색어>"` 목록에서 고른 번호 (없으면 사용자 사진 요청)
- 답이 **좋아** → 6단계 / **수정: …** → 기획안 고쳐 다시

## 6. 원고 + 사진 + 렌더링
```bash
npm run editorial -- photos "<검색어>" --brand travel --id <임시ID 또는 content_id> --pick 1,4,7
```
- 사용자가 보낸 사진이 있으면 그것을 1순위로 `data/images/travel/<id>/`에 넣는다.
- `npm run planner -- prompt` 규칙 + 캘린더 `rules`대로 기획 JSON을 써서 `data/editorial/responses/<날짜>-<주제ID>.json`에 저장.
  - 첫 장 `PHOTO_COVER`(사진 필수): subheadline = 이모지 + 한 줄, body = 검정 박스에 들어갈 질문 한 줄
  - 사진 장은 `IMAGE_TEXT`, `image_source`에 `data/images/travel/<id>/NN.jpg`
  - 마지막 장 `FOLLOW`, 업로드 횟수(매주/매일)를 말하지 않는 멘트
  - 제목은 뜻 단위 줄바꿈(\n), 강조는 `**구절**`
  - **제목은 카드 내용을 포괄하는 핵심만** 쓴다 (낚시·과장 문구, '이번 주말 여기 가면 됩니다' 같은 시점 수식 금지). 표지는 무엇의 모음인지, 장 제목은 그 장의 핵심 정보
  - 관광공사 사진을 썼으면 캡션 마지막 줄에 `사진: 한국관광공사 포토코리아`
```bash
npm run planner -- plan --brand travel --topic "<주제>" --objective SAVE --category travel \
  --target "<캘린더 target>" --max-pages 10 --response data/editorial/responses/<파일>.json
npm run editorial -- link --brand travel <주제ID> <content_id>
npm run design -- render <content_id>                  # 오류 0
npm run design -- sheet <content_id> --themes brand --out <임시 폴더>
```
견본을 직접 보고 확인: 반복 문구, 잘린 글자, 사진과 내용이 맞는지, 이모지 깨짐.

## 7. ③ 카드 검토
```bash
npm run editorial -- review --brand travel <content_id>
git add -A && git commit -m "요즘어디감 <날짜> <주제ID> 검토 요청" && git push
```
푸시: `🗂 요즘어디감 카드 검토: '<주제>' — 승인 / 수정: … / 보류`. 견본 1장 + 카드 PNG 전체 + 캡션 + 확인 필요 목록을 보낸다.
**보내는 방식 (휴대폰에서 보기 쉽게):** `SendUserFile`(display: "render")로 **견본 이미지 1장(전체 카드를 한 장에)을 먼저** 보내고,
글은 5줄 안으로 짧게(주제 · 장수 · 확인 필요 사항 · 답하는 법). 카드 PNG 낱장은 사용자가 원할 때만 보낸다.
사용자가 "결과물 보여줘"라고 하면 상태와 상관없이 지금 있는 최신 견본을 바로 다시 보낸다.


| 답 | 할 일 |
|---|---|
| **승인** | `editorial approve --brand travel <id> --at "<발행일> 18:30"` → 커밋·푸시 → 발행일 18:30 KST에 "발행 단계 실행: <id>" 예약 (`send_later`) |
| **수정: …** | `editorial revise --brand travel <id> --note "…"` → 고쳐서 7단계 다시 |
| **보류** | `editorial hold --brand travel <id>` → 커밋·푸시 |

발행 시각까지 승인이 없으면 올리지 않는다.

## 8. 발행 (18:30)
```bash
npm run editorial -- ig-check --brand travel
npm run editorial -- publish --brand travel <id>
git add -A && git commit -m "요즘어디감 <id> 발행" && git push
```
- 성공: 푸시 `✅ 요즘어디감 업로드 완료: '<주제>'`
- 실패: 다시 시도하지 말고 오류를 그대로 알리고, `npm run design -- export <id>` 패키지를 보내 수동 업로드 요청.
  토큰 만료(code 190)면 메타 개발자 화면에서 재발급 후 `META_ACCESS_TOKEN_TRAVEL` 교체 요청.

## 부록. 정보·소개 장(여러 곳 소개 리스트) 양식 3종
팝업·행사 모음처럼 장마다 한 곳을 소개하는 카드는 아래 중 하나로 만든다. 견본: `docs/design-presets/travel-info-*.png`
- **A. 글자만** (`TEXT`, 사진 없음): 제목 → 하늘색 이름 박스(축제·팝업명) → 📍주소 / 📅기간 / 💰요금 3줄
- **B. 사진 + 글자** (`IMAGE_TEXT`, 기본): 제목 → 사진 → 이름 박스 → 3줄. 지금 기본값
- **C. 사진 배경** (`TEXT` + `image_source`): 사진을 카드 전체에 깔고(어둡게) 흰 글씨, 구성은 A와 같다
- 표지는 `PHOTO_COVER`(사진 한 장, 콜라주 금지), 부제 + 2줄 제목, 박스는 오른쪽 위
- 리스트형은 항목 장이 같은 레이아웃을 반복해도 된다 (표지·정리·마무리 3장 제외)
- 주소는 도로명까지 정확히, 확인 못 하면 장소명만. 사진 출처는 이미지에 넣지 않고 캡션에만
- **사진 출처 제한**: 업체(주최 측) 제공 사진(네이버 플레이스에서 업체가 등록한 사진, 공식 홈페이지 무료 이미지, 관광공사 포토코리아)만 쓴다. 블로그·포스트·카페·뉴스·이용자 업로드·지도 이용자 사진은 개인 저작물이라 금지
- **정보 장 글 구성(양식 B·C 공통)**: 큰 제목 = 장소·행사 이름(한 줄), 박스 = 그 장소를 설명하는 짧은 문구. 사진 배경(C)은 글자를 표지처럼 왼쪽 아래로 모은다
- **사진 요청 방식**: 사진을 쓸 수 없어 사용자에게 캡처를 부탁할 때는 장소별로 **바로 열리는 링크**(공식 홈페이지, 네이버 검색 주소)를 같이 보낸다. 사용자에게 직접 찾으라고 하지 않는다
