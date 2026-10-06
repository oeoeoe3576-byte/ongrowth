# 온그로스 카드뉴스 매일 작업 절차

평일 아침 예약 실행(Claude Code Routine)되는 세션이 이 문서를 읽고 그대로 수행한다.
사람의 확인은 두 번이다: **① 아침에 오늘 주제 컨펌 → ② 완성된 카드 검토(승인 / 수정 / 보류)**.
주제 컨펌 전에는 원고를 만들지 않는다 (주제가 바뀌면 만든 것을 버리게 되므로).

- **평일만** 운영: 월·화·목·금 블로그, 수요일은 인스타그램/스레드 격주 (`data/editorial/ongrowth.json`의 `weekly`)
- 검토 요청: 평일 오전 (약 9시) · 발행: 승인된 날 18:30 (KST)
- 디자인: 인사이트(검정 + 초록) — `data/brands/ongrowth.json`
- 원고 작성은 이 세션의 Claude가 직접 한다 (API 키 불필요, `--response` 방식)

## 1. 준비
```bash
cd <ongrowth 저장소>   # 없으면 add_repo(oeoeoe3576-byte/ongrowth)로 추가 후 clone
git fetch origin claude/cardnews-data-structure-vyne5l
git checkout claude/cardnews-data-structure-vyne5l && git pull
npm install
```

## 2. 오늘 주제
```bash
npm run editorial -- next --reserve
```
- 쉬는 날(종료 코드 3)이면 아무것도 하지 않고 끝낸다.
- 오늘 주제가 이미 `review`/`approved`/`published`면 새로 만들지 말고 현재 상태만 알려준다.
- 남은 주제가 없으면(종료 코드 2) 블로그 주제 5개를 새로 제안해 `editorial add`로 넣고 다시 실행한다. 최근 주제와 겹치지 않게.

## 2-1. 주제 컨펌 (원고 만들기 전)
사용자에게 오늘 주제를 보내고 답을 기다린다. 알림 첫 줄: "📌 오늘 주제 컨펌".
**휴대폰 푸시 알림을 반드시 보낸다**: `PushNotification` 도구(없으면 ToolSearch로 `select:PushNotification` 불러오기)로
`📌 오늘 주제 컨펌: '<주제>' — 좋아 / 다른 주제로 답해주세요` (200자 이내, 한 줄).
카드 검토 요청(5단계)과 18:30 발행 안내(7단계) 때도 같은 방식으로 푸시를 보낸다.
- 보낼 내용: 주제, 방향(angle), 채널, 다른 후보 1개 (`editorial next` 출력의 "다른 후보")
- 답이 **좋아 / OK / 진행** → 3단계로
- 답이 **다른 주제** → `npm run editorial -- swap` 후 새 주제로 다시 컨펌
- 답이 **후보로** → `npm run editorial -- swap --to <후보 ID>` 후 3단계로
- 사용자가 **직접 주제를 주면** → `editorial add --channel <채널> --topic "…"`로 추가하고 `swap --to <새 ID>` 후 3단계로
- 오전 중 답이 없으면 원고를 만들지 않는다.

## 3. 원고 작성
`npm run planner -- prompt`의 규칙 + 캘린더 `rules`를 지켜 기획 JSON을 직접 써서
`data/editorial/responses/<날짜>-<주제ID>.json`에 저장한다.

- **10장 이하.** 첫 장 `BIG_TITLE` (실제 사진이 있을 때만 `PHOTO_COVER`), 마지막 장 `FOLLOW`
- 핵심 구절은 `**구절**`로 강조 (칸당 1~2곳)
- 수치·통계·검색 알고리즘 설명은 참고자료가 없으면 쓰지 않는다. 방법과 원칙 중심
- 확인이 필요한 내용이 있으면 `fact_check: NEEDS_CHECK`로 표시하고 검토 요청 때 따로 알린다
- 같은 번호를 두 번 보여주지 않는다 (큰 숫자 `01`이 있으면 제목에 `01`을 또 쓰지 않음)

```bash
npm run planner -- plan --brand ongrowth --topic "<주제>" --objective SAVE --category marketing \
  --target "<캘린더 target>" --max-pages 10 --response data/editorial/responses/<파일>.json
npm run editorial -- link <주제ID> <content_id>
```
검증 오류가 나면 JSON을 고쳐 다시 실행한다 (같은 content_id로 고칠 때는 `--id <content_id>`).

## 4. 렌더링과 자체 점검
```bash
npm run design -- render <content_id>          # 오류 0이어야 함
npm run design -- sheet <content_id> --themes brand --out <임시 폴더>
```
견본 이미지를 **직접 보고** 확인: 같은 문구 반복, 자리표시 문구, 어두운 배경 위 안 보이는 글자, 잘린 글자.
문제가 있으면 원고를 고쳐 다시 렌더링.

## 5. 검토 요청
```bash
npm run editorial -- review <content_id>
git add -A && git commit -m "카드뉴스 <날짜> <주제ID> 검토 요청" && git push
```
사용자에게 보낸다:

**보내는 방식 (휴대폰에서 보기 쉽게):** `SendUserFile`(display: "render")로 **견본 이미지 1장(전체 카드를 한 장에)을 먼저** 보내고,
글은 5줄 안으로 짧게(주제 · 장수 · 확인 필요 사항 · 답하는 법). 카드 PNG 낱장은 사용자가 원할 때만 보낸다.
사용자가 "결과물 보여줘"라고 하면 상태와 상관없이 지금 있는 최신 견본을 바로 다시 보낸다.
- 견본 이미지 1장 + 카드 PNG 전체, 캡션과 해시태그
- 확인이 필요한 사실(NEEDS_CHECK)이 있으면 목록
- 알림: "오늘 카드뉴스 검토 요청 — 승인 / 수정: … / 보류"

## 6. 답에 따라
| 답 | 할 일 |
|---|---|
| **승인** | `npm run editorial -- approve <id>` → `npm run design -- export <id>` → 커밋·푸시 → 오늘 18:30 KST에 이 세션으로 "발행 단계 실행: <id>" 메시지 예약 (`send_later`) |
| **수정: …** | `editorial revise <id> --note "…"` → 원고 고쳐 3~5단계 반복 |
| **보류** | `editorial hold <id>` → 커밋·푸시 |

발행 시각까지 답이 없으면 **발행하지 않는다** (상태는 review 유지).

**도구가 없을 때 (예약 실행 세션에는 일부 도구가 빠질 수 있음)**
- `send_later`가 없으면: 승인 직후 7단계 발행 패키지를 바로 보내고 "18:30 이후에 업로드해 주세요"라고 안내한다.
- 푸시 알림 도구가 없으면: 메시지 본문 첫 줄에 "📌 오늘 카드뉴스 검토 요청"을 쓴다.
- 저장소 push가 거부되면: 작업은 그대로 진행하고, 사용자에게 결과 파일을 보낸 뒤 푸시 실패 사실과 이유를 알린다.

## 7. 발행 단계 (18:30)
인스타그램 자동 발행 (환경 변수 `META_ACCESS_TOKEN`, `INSTAGRAM_ACCOUNT_ID` + 네트워크 허용 `graph.instagram.com` 필요):
```bash
npm run editorial -- ig-check [--brand travel] # 토큰 확인 (게시 안 함). 계정별 토큰: META_ACCESS_TOKEN_<브랜드>, INSTAGRAM_ACCOUNT_ID_<브랜드>
npm run editorial -- publish <id>             # 승인 건만. JPEG를 data/publish/<id>/에 커밋·푸시 → 캐러셀 게시 → published 기록
git add -A && git commit -m "카드뉴스 <id> 발행" && git push
```
- 성공하면 푸시 알림: `✅ 오늘 카드뉴스 발행 완료: '<주제>'`
- 실패하면 **다시 시도하지 말고** 오류 문구를 그대로 알리고, 아래 수동 발행으로 넘어간다.
  (토큰 만료 `code 190` → 사용자에게 메타 개발자 화면에서 토큰 재발급 후 환경 변수 교체 요청)

수동 발행 (API가 안 될 때):
1. `npm run design -- export <id>` 결과(JPEG + caption.txt + ZIP)를 사용자에게 보내고 "지금 업로드해 주세요" 알림
2. 사용자가 "올렸어"라고 하면 `npm run editorial -- published <id>` → 커밋·푸시

## 발행 전 체크 (10/1 실수 방지)
- `npm install` 후 `npm run design -- render`가 오류 없이 끝나고, 견본에서 글씨체가 Pretendard인지 확인 (폰트 패키지가 없으면 시스템 글씨체로 조용히 대체됨)
- 캡션은 `data/planner/master.csv`의 caption이 실제 게시 문구다. 캡션을 고치면 master.csv도 같이 고친다
- 마지막 장 아이디는 `@ongrowth_marketing`, 이름 `온그로스 마케팅`, 프로필 로고 적용 상태인지 08번 카드 확인
- 인스타는 게시 후 사진·캡션 수정과 삭제가 API로 안 되므로, `publish`는 위 세 가지를 확인한 뒤 **한 번만** 실행한다 (재발행 금지)

## 메시지 순서 (사용자 요청)
- 시안(견본 이미지)은 **항상 마지막에** 보낸다. 설명·캡션·확인 사항 텍스트를 먼저 쓰고, 시안 파일 전송(SendUserFile)을 그 메시지의 맨 끝에 둬서 사용자가 바로 보고 판단하게 한다.
