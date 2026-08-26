# travel-cardnews-auto-publisher (국내여행 카드뉴스 자동 제작·예약발행)

주제 입력 → 국내여행 정보 조사 → 카드뉴스 기획/문구 → 이미지 렌더링 → 폴더 저장 →
캡션 작성 → 예약 큐 등록 → 예약 시각 자동 발행 → 성공/실패 기록·재시도 까지
하나로 묶은 재사용 가능한 시스템/Claude Skill입니다.

Claude Code에서 자연어로 쓰는 방법은 `.claude/skills/domestic-travel-cardnews-publisher/SKILL.md`
참고 (예: "강릉 여름 여행지 카드뉴스 만들어서 내일 오후 7시에 예약해줘").

## 모듈 구성 (요구사항의 10개 기능을 각각 독립 폴더로 분리)

| # | 모듈 | 경로 |
|---|------|------|
| 1 | Research | `src/research/` (장소 스키마·라이브러리, `data/places/*.json`) |
| 2 | Content Generator | `src/content/` |
| 3 | Card Renderer | `src/render/` (Playwright + `templates/*`) |
| 4 | File Manager | `src/files/outputFolder.ts` |
| 5 | Caption Generator | `src/caption/` |
| 6 | Publish Queue | `src/queue/` (queueStore + inboxWatcher) |
| 7 | Scheduler | `src/scheduler/` |
| 8 | Instagram Publisher | `src/publishers/` (`PublisherInterface` + `instagram/*`) |
| 9 | Logging / Retry | `src/logging/`, `src/validate/preflight.ts` |
| 10 | Skill Interface | `src/skill/orchestrator.ts`, `src/cli.ts`, `.claude/skills/...` |

각 모듈은 독립적으로 테스트 가능합니다. Instagram이 `enabled: false`(기본값)여도
생성→저장→예약 큐 등록까지는 항상 정상 동작합니다.

## 빠른 시작

```bash
npm install
cp .env.example .env      # 필요시 ANTHROPIC_API_KEY 등 채워넣기 (없어도 규칙 기반 폴백으로 동작)

# 1) 카드뉴스 생성 (리서치는 이미 data/places/gangneung.json에 예시 데이터가 있음)
npm run cardnews -- create "강릉 여름 여행지 5곳" --region "강원 강릉시" --season 여름

# 2) 예약
npm run cardnews -- schedule-folder "cardnews_output/2026-xx-xx_강릉_여름_여행지_5곳" "2026-09-05 19:00"

# 3) 승인 (REVIEW 모드 기본값)
npm run cardnews -- approve <postId>

# 4) 발행 시도 (DRY_RUN=true 기본 - 실제 업로드 없이 로그만)
npm run cardnews -- publish <postId>

# 큐 확인
npm run cardnews -- queue
```

관리 대시보드: `npm run dev:server` → http://localhost:4000

상시 스케줄러(로컬/서버용, 폴링): `npm run scheduler`

## 예시로 검증된 것 (MVP 성공 조건, 지시사항 38)

"강릉 여름 여행지 5곳" 주제로 `data/places/gangneung.json`(한국관광공사/강원관광/공식
안내 페이지 등에서 WebSearch로 실제 조사한 5곳: 경포해변, 안목해변 커피거리,
정동심곡 바다부채길, 안반데기, 주문진항)을 가지고 실제로 다음을 확인했습니다.

- `content.json` 생성 → Playwright로 7장(01_cover ~ 07_cta) PNG 렌더링(1080×1350 @2x)
- `cardnews_output/{날짜}_{슬러그}/`에 번호순 파일 + `caption.txt` + `metadata.json` 저장
- `schedule-folder`로 큐 등록 → REVIEW 모드에서 미승인 발행 시도는 preflight가 차단
- 승인 후 발행 시 DRY_RUN 로그만 남고(`[DRY_RUN] ... 업로드될 예정입니다`) 실제 업로드는 하지 않음
- 이미 발행된 게시물의 재발행 시도는 큐 저장소 레벨에서 차단(중복 발행 방지, 지시사항 28)
- `batch` 명령으로 여러 주제를 하루 간격으로 자동 분배 예약

## 설정 (`config/config.yaml`)

브랜드/CTA, 카드뉴스 슬라이드 수·크기·템플릿, 장소 선정 기준(평점 등), 캡션 톤,
발행 timezone(Asia/Seoul 고정 권장)·REVIEW 모드, Instagram 활성화 여부, 스케줄러
폴링 주기, 폴더 경로를 코드 수정 없이 여기서 바꿉니다.

## 안전장치 (지시사항 36) 구현 위치

- 중복 업로드 방지: `queueStore.enqueue`(content hash) + `reschedulePost`(published 재예약 차단) + `preflight`
- 이미지/캡션 누락, 업로드 순서, 파일 손상: `files/outputFolder.verifyOutputFolder`
- 예약 시간/timezone: `validate/preflight.ts` (luxon, Asia/Seoul)
- API 인증 체크: `publishers/instagram/auth.ts`
- 재시도: `logging/retry.ts` (5분→15분→failed), 실패해도 원본 파일은 절대 삭제하지 않음
- 로그의 민감정보 마스킹: `logging/logger.ts`

## 아직 사람이 해야 하는 것 (Instagram 실 연동)

1. `.env`에 `INSTAGRAM_ACCOUNT_ID` / `META_ACCESS_TOKEN` 설정, `config.yaml`의
   `instagram.enabled: true`로 변경, `DRY_RUN=false`.
2. `src/publishers/instagram/imageHost.ts`의 `setImageUrlResolver()`를 실제 배포
   환경(S3/Cloudinary/Vercel Blob 등)에 맞게 구현 — Graph API는 로컬 파일이 아니라
   공개 HTTPS 이미지 URL만 받습니다.
3. Meta 공식 문서에서 계정 유형/권한/Carousel 지원 여부/API 버전을 배포 시점 기준으로
   재확인 (`META_GRAPH_API_VERSION`).

## 확장 포인트 (지시사항 39)

- 새 카드뉴스 스타일: `src/render/templates/{new_name}/`에 html+css+config만 추가
- 새 SNS: `src/publishers/{platform}/`을 `PublisherInterface` 구현체로 추가하고
  `src/publishers/registry.ts`에 등록
