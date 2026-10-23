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
