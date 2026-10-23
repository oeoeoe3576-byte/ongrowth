# 마지막 실행 (2026-10-23)

- 키 인식: 예 (환경변수 확인, 값은 기록하지 않음)
- 검색: 일일 검색 한도(검색 100회/일) 소진으로 `search`는 429 오류("Quota exceeded ... Search Queries per day"). 누적 검색 55회 기록
- 채널: 1,066개 (통계 확인 1,066 완료)
- 영상: 44,878개 수집 완료 (분석 대상 38,264개) → docs/research/youtube-travel-report.md 생성
- 오류/수정: 예정·라이브 영상에 duration이 없어 `videos`가 KeyError로 중단 → yt_collect.py에서 건너뛰도록 수정
