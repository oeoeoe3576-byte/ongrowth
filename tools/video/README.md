# 릴스 제작 도구
- `node tools/video/build_reel.mjs data/reels/<이름>/spec.json` → video.mp4 + cover.jpg 생성 (사진은 data/images/travel/ 기준)
- 구성: 훅 3초(사진 3컷) → 곳별 장면 3.6초 × N → 마무리 3초(첫 장면과 같은 사진으로 루프)
- 음악: `tools/video/bgm.py`가 직접 합성(저작권 없음), 약 -20 LUFS로 정규화
- 필요: `npm ci`, ffmpeg, python3 + numpy, Chromium(/opt/pw-browsers/chromium)
- 규칙은 docs/travel-workflow.md '영상 규칙 업데이트' 참고
