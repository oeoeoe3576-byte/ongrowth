# 시안(스토리보드) 만드는 법
1. 사진: `npm run editorial -- photos "<검색어>" --id <contentid> --brand travel` (공식 사진만, `data/images/travel/<id>/`).
2. 후보 일괄 점검: `python3 -I tools/research/festival_photo_scan.py <목록파일> <결과파일>` (목록 한 줄 `시작|끝|이름|주소|contentid`, `festivals --from --to` 출력에서 뽑음). 통과 = 행사를 실제로 찍은 사진 제목 확인 후에만 사용.
3. 시안 그림: `storyboard_example.html`을 복사해 사진 경로·문구를 바꾸고 Playwright(`executablePath: /opt/pw-browsers/chromium`)로 전체 페이지 스크린샷. 사진 없는 칸은 사선 무늬로 비우고 "사진 자리" 표시. 생성 이미지 금지.
4. 시안을 채팅방에 올려 사용자 승인을 받은 뒤 `tools/video/build_reel.mjs`로 제작.
