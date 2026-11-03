# 글로우 초이 글별 이미지 + 서식 페이지 만드는 법 (11/3 정리)

원고(.md)의 `[이미지 ① … → 파일명]` 자리마다 1000×1000 jpg를 만들고, 붙여넣기용 서식 페이지(아티팩트)를 만든다.
이미지 생성 AI(크레딧)는 쓰지 않는다. 업로드·발행은 사용자 승인 후에만.

## 1. 준비
- `pip install "rembg[cpu]"` → `from rembg import remove, new_session; s = new_session('u2net')` (첫 실행 때 모델 176MB 받음)
- 규칙: `.claude/skills/glow-choi-master/references/design-template.md` (1·3·5·6·7절)

## 2. 세트와 카드
- 썸네일 1번 `thumbs.podium` ↔ 본문 style "A"(로지 베이지 + 모카 #AE8977)
- 썸네일 2번 `thumbs.label_photo` ↔ 본문 style "B"(그레이지 + 토프 #9C8574)
- 글마다 번갈아 쓰고 `glowchoi_posts/thumbnail_log.md`에 한 줄 추가
- 본문 카드(`body.py`): `check_grid`(2×2 체크), `compare_columns`(3열 비교), `checklist`(번호 목록), `ingredients`(한눈에 보기), `product`(제품), `steps_flow`(단계, 아이콘 drop/tap/water/sun, 3단계까지), `pick`(선택 가이드)
- 같은 글 안 정보 카드는 서로 다른 함수로. 카드 문구는 원고와 같게(원고에 없는 효능·수치·할인율 금지)
- 제품 없는 글(정보형) 썸네일: 브랜드 없는 오브젝트(쇼핑백·선물상자·무지 용기)를 PIL로 그려 받침대에 올림 → `build_2026-10-31_blackfriday.py`, `build_2026-11-03_dryness.py`
- 원고의 "직접 촬영" 사진 자리가 비면 원고 문구로 만든 카드로 대체하고, 원고의 [이미지] 설명·파일명도 같이 고친다

## 3. 제품 누끼
- 공식몰(없으면 컬리 등) 상세의 **제품 단독** 사진을 curl로 받기(-L, User-Agent 지정)
- 세트 배너·모델컷·여러 색 라인업·할인 배지 컷은 쓰지 않는다. 해당 색 단독 컷 확인
- rembg로 배경 제거 → `crop(getbbox())`. 무늬 상자처럼 rembg가 깨지면 흰 배경 제거 + 가장 큰 덩어리만
- 원본·누끼는 저장소 밖(작업 폴더 src/)에 두고, 결과 jpg만 `glowchoi_posts/images/<날짜_번호_주제>/`에 quality 92로 저장
- 2번 썸네일 배경: 제품 없는 공식 제형 사진 우선, 없으면 `vgrad` 그레이지 + `light()`

## 4. 검수
- 다 만든 뒤 축소 모아보기(contact sheet)를 직접 보고 글자 잘림·겹침·누끼 잔상·빈 공간 과다를 고친다
- 채팅방에는 글마다 모아보기 1장을 파일로 올린다(드라이브 X, 11/3 규칙)

## 5. 서식 페이지
```
python3 tools/glowchoi/format_html.py glowchoi_posts/<원고>.md img "<#AE8977 또는 #9C8574>" <출력>.html
```
- `<title>글로우 초이 서식</title>`을 `<title><주제> 원고 서식</title>`로 바꾼다
- 아티팩트로 게시할 때 `index.html` + `img/<파일명>`으로 이미지를 함께 올린다(클렌징밤·11월 8편과 같은 구조)
- 페이지 위 '전체 복사' → 네이버 글쓰기에 붙여넣기. 붙여넣기에서 이미지가 빠지면 같은 자리에 원본 jpg를 넣는다

## 6. 임시저장
- 클라우드 방은 네이버·마피아넷에 못 들어간다. PC 방(💻 [PC] 네이버 블로그)에 send_message로 맡긴다(제목·링크·태그·대표 이미지·쇼핑커넥트 문구 유지·발행 금지 명시)
