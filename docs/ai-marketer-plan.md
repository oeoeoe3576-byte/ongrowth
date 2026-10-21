# AI 마케터 영상 기획 (탑뷰) — 크레딧 최소화

## 원칙
- 얼굴 고정: 기준 사진 **1장만** 만들고, 이후 모든 영상은 그 사진(`templateImageFileId`/저장한 `avatarId`)만 쓴다. 얼굴을 다시 생성하지 않는다.
- 값비싼 영상 생성 모델(text_to_video 등)은 쓰지 않는다. **정지 사진 + 말하는 아바타(avatar4Fast, offPeak)** 만 쓴다.
- 대본 먼저 → 승인 → 영상 1회 생성. 재생성 금지(수정은 대본 단계에서).

## 인물 설정
8년차 여성 마케터, 전문적·신뢰 톤. 방 안(책상·노트북·화이트보드가 은은히 보이는 밝은 작업실), 상반신 정면, 9:16.

## 제작 순서
1. 기준 사진 1장: Nano Banana 2 Lite(1K, 1장). 후보 마음에 들 때까지 반복하지 않고 1장 확정.
2. 목소리 1개 고정(한국어 여성, 데모 듣고 선택) — `voiceId` 저장.
3. 대본: 30~40초(한국어 약 150~200자), 후크 → 핵심 3가지 → 저장/팔로우 유도. 수치·통계는 쓰지 않음.
4. 영상: `topview_avatar_video` mode=`avatar4Fast`, offPeak=true, scriptMode=text, customMotion="방에서 설명하듯 가끔 손짓, 자연스러운 눈 맞춤".
5. 업로드: 인스타 릴스(이미지 카드뉴스와 같은 계정).

## 비용 통제
- 시작 잔액 477.67 크레딧. 첫 시험(사진 1장 + 10초 영상)으로 실제 소모량 확인 → 이후 영상당 소모량을 기록하고 예산 안에서만 진행.
- 영상은 주제당 1개, 30~40초 이내.

## 진행 기록
- 기준 얼굴(고정): `data/avatar/marketer-face.png` (Topview fileId `a3b94d81d18f4d70b1d12270241e23e2`, Nano Banana 2 Lite 1K, 0.3 크레딧). **이 얼굴만 계속 사용, 재생성 금지.**
- 목소리: 🇰🇷 Eunji (`kKTntBsdDuheAZ0N6LTEVkDrAlQL7icT`, minimax-v2.5)
- 시험 영상 task: `b4ba2344f93b4d35ac979011efa20a83` (avatar4Fast, offPeak). 크레딧은 완료 시 차감.
- 시험 결과: 첫 시도 실패(TTS 오류, 0.2 크레딧 차감 의심) → `voiceSettings`(stability 50, similarity 75, styleExaggeration 0, volume 100)를 반드시 지정해 재시도 성공. 대본 약 55자 영상 1개 = 1.0 크레딧(477.17 → 476.17). 사진 0.3 포함 시험 총 약 1.5 크레딧.
- 영상 파일은 용량(약 9MB) 때문에 저장소에 올리지 않고 `data/avatar/*.mp4`는 .gitignore.
- 피드백(10/21): AI 티·나이·배경·노트북 화면·입모양 문제 → 얼굴 재선정. 조건: 20대 중후반, 현실적 피부결, 가슴 위 클로즈업, 배경 최소, 입 다문 표정(입모양 동기화 유리), 노트북 없음. Nano Banana 2.1 3장(평범/나이 들어 보임) → Seedream 5.0 Pro 3장(1.2 크레딧)이 조건에 맞음. 후보 중 사용자 선택 후 `data/avatar/marketer-face.png` 교체.
