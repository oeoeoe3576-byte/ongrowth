# 쇼츠 후처리 도구 (제목 자막 + 말 자막)

크레딧 없이 영상 위에 **상단 제목 2줄(2줄째 노랑)** 과 **하단 말 자막**을 얹는다. 분석에서 상위 영상 공통 요소였다 (`docs/shorts-analysis.md`).

```bash
npm run shorts-compose -- <spec.json>
```

spec 예:
```json
{ "video": "data/avatar/ep1-full.mp4", "out": "data/reels/ep1/video.mp4",
  "headline": { "line1": "글 잘 쓰면", "line2": "손해라고요?" },
  "captionsAuto": ["문장1", "문장2"],
  "captions": [{ "from": 0, "to": 3.2, "text": "문장" }] }
```
- `headline`: 영상 내내 표시 (`from`/`to`로 구간 지정 가능). 제목은 한 줄 12자 안팎.
- `captionsAuto`: 대본 문장을 **글자 수 비율로** 시간에 나눈다. **근사치**라 실제 말과 어긋날 수 있다 → 어긋나면 `captions`로 시간을 직접 준다.
- `captions`가 있으면 `captionsAuto`보다 우선.
- 출력은 H.264 재인코딩(crf 23)이라 용량이 줄어든다 (75MB → 약 25MB).

## 참고
- ffmpeg는 `ffmpeg-static`(devDependency)을 쓴다. `drawtext`가 없어서 글자는 Pretendard로 PNG를 만들어 `overlay`로 얹는다.
- 영상 정보는 `ffmpeg -i` 출력에서 읽는다 (ffprobe 없음).
- 환경에 따라 `FFMPEG_PATH`(ffmpeg 경로), `PLAYWRIGHT_CHROMIUM_PATH`(Chromium 경로)로 바꿀 수 있다.
- 자막 위치·크기는 `src/shorts/compose.ts`의 `css()`에서 조정한다 (896px 폭 기준 비율).
- 인스타그램 앱의 자체 자막 영역과 겹치지 않게 하단 자막은 화면 아래에서 약 13% 띄워 두었다.

## 장면 영상 모드 (일러스트용)
`video` 대신 `scenes`(장면 그림 + 초)와 `audio`를 주면 장면을 이어 붙여 기본 영상을 만든 뒤 자막을 얹는다. 장면마다 천천히 확대/축소한다 (인물이 직접 움직이지는 않는다).
`"theme": "light"`는 밝은 배경용: 제목 1줄 남색, 2줄 흰 글자 + 남색 상자, 하단 자막 남색 상자. 예: `data/avatar/ep2-intro-v2.mp4` 제작에 사용.

## 브랜드 색 (주의)
- **온그로스 메인 컬러는 남색 `#0B2443`** (로고 `data/brands/ongrowth-logo-sheet.png`에서 추출).
- 카드뉴스 `insight` 테마(검정 + 초록)는 이 남색과 다르다 → 카드뉴스 색 정리가 필요한지 사용자 확인 필요.
- 장면 그림 4장을 한 이미지(2×2, 9:16)로 만들어 잘라 쓰면 0.35크레딧에 4장면 (`data/avatar/ep2/`).
- 장면 옵션: `sceneScale`(0~1, 그림을 줄여 아래에 붙임, 남는 곳은 `sceneBg`로 채움, 기본 1), `zoom`(장면마다 확대/축소, 기본 꺼짐). 사용자 피드백으로 인물을 작게(0.78), 줌은 끈 상태가 기본 권장.
