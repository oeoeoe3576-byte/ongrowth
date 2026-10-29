# 뷰티레터 릴스 자동 업로드 (새 세션 인수인계, 2026-10-29)

사용자 결정(10/27): 무료 음원(Kevin MacLeod, CC BY 4.0)을 넣은 릴스를 하루 2편(11:30·20:30 KST 무렵) 자동 업로드.

## 준비물
- 환경 변수: `META_FB_ACCESS_TOKEN_BEAUTY`(뷰티레터 페이스북 페이지 토큰, EAA…), `INSTAGRAM_BUSINESS_ID_BEAUTY`
  - 값은 절대 출력하지 않는다. 있음/없음만 확인.
- 영상: 비공개 저장소 `oeoeoe3576-byte/beautyletter-media`의 `<폴더>/reel_music.mp4` (기사 사진이 들어 있어 공개 저장소 ongrowth에는 올리지 않음)
  → 받아서 `design/beauty_news/letters/<폴더>/output/auto/reel_music.mp4`에 둔다.
- 순서·곡: `design/beauty_news/auto_queue.json` (posted가 빈 첫 편이 다음 차례)

## 순서
1. 위 환경 변수 있음 확인 → `node design/beauty_news/post_reel.mjs --dry` (게시 없이 업로드·처리만 확인)
2. 성공하면 하루 2편 예약(scheduled task, 이 세션으로 깨우기): 매번 `node design/beauty_news/post_reel.mjs` 실행 → 결과 한 줄 보고 → `auto_queue.json` 변경 커밋·푸시
3. 실패하면 게시하지 말고 사용자에게 오류를 그대로 알린다.
4. 아침 확인 루틴(trig_01P3UTXmqqFg3vr3VE2dNSrn) 문구의 "인스타에 아무것도 올리지 않는다"는 자동 업로드 큐 이외엔 올리지 않는다로 바꾼다.
