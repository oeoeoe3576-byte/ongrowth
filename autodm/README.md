# 인스타 자동 답글 + DM (autodm)

댓글을 단 사람에게 ① 공개 답글 ② 비공개 답장(DM, 인사말 + 링크)을 자동으로 보낸다.
인스타 공식 API(인스타그램 로그인 방식) + Meta 앱 「Ongrowth Cardnews」 + Vercel 무료 함수. 유료 서비스·유료 AI 없음.

대상: 온그로스, 숙소어디감, 스테이킴, 요즘어디감, 뷰티레터, 카피마롱
보류(꺼 둠, 11/3 관제탑 지시): 글로우초이 한국·해외. 한국 문구 `phrases/glowchoi_kr.json`은 보관만 하고 서버는 쓰지 않음(`enabled: false`)
제외: 초이블러, 주말부부 (인포크 사용 중)

## 동작
| 상황 | 하는 일 |
|---|---|
| 링크 표(`config/links.json`)에 있는 게시물 | DM(인사말+본문(링크)+마무리) → 성공하면 "DM 보냈어요" 답글 |
| 링크 표에 없는 게시물 | DM 없이 "프로필 링크 확인" 답글만 |
| DM 실패(비공개·DM 제한 등) | "프로필 링크 확인" 답글 (개별 안내 대신 게시물 고정 댓글로 미리 안내) |
| 계정 본인 댓글, 대댓글, 7일 지난 댓글, 이미 답한 댓글 | 건너뜀 |

- 문구: `phrases/<계정>.json` — 계정별 인사말·본문·마무리 각 18개(DM), 16개(답글), 프로필 안내 16개, 고정 댓글 12개. 무작위 조합하고 **최근 50건과 같은 조합은 안 씀**(답글도 동일). 말투는 shopping-shorts `채널/<계정>.md` 규칙 기준(각 파일 `notes`에 근거 줄).
- 카피마롱 DM에는 쿠팡 파트너스 고지 문장이 자동으로 붙는다.
- 고정 댓글: `npm run pinned -- <계정> <게시물ID>`로 문구 미리보기, 승인 후 `--confirm`으로 댓글 달기. **인스타 API에는 '고정' 기능이 없어** 고정은 앱에서 직접 누른다.

## 계정별 규칙 (`config/rules.json`)
- `keywords`: 댓글에 이 중 하나가 있을 때만 DM(띄어쓰기·대소문자 무시). 빈 배열이면 모든 댓글.
- `defaultLink`: `links.json`에 없는 게시물에 보낼 기본 링크. 게시물별 링크가 있으면 그게 우선.
- `disclosure`: DM 맨 끝에 그대로 붙이는 고정 문구(카피마롱: 공정위 쿠팡 파트너스 문구).
- `nonKeywordReply`: 키워드 없는 댓글에 '프로필 링크 확인' 답글을 달지(false면 무시).
- 고친 뒤 `npm run build:data` → 커밋·푸시.

## 두 가지 받는 방법
1. **주기 확인(폴링) — 지금 바로 가능.** `/api/poll`을 무료 외부 크론(cron-job.org 등)이 5~10분마다 호출. 최근 게시물 10개의 댓글을 읽어 처리.
2. **웹훅 — 나중에.** Meta 문서상 댓글 웹훅은 앱이 Live(게시) 상태 + `comments` 고급 액세스(앱 검수)여야 온다. 코드는 준비됨(`/api/webhook`).

## 안전장치 (기본값은 아무것도 안 보냄)
- `AUTODM_MODE` = `off`(기본) / `test`(테스트 아이디 댓글에만) / `live`(모두)
- `AUTODM_ACCOUNTS` = 켤 계정 키 쉼표 목록 (예: `ongrowth`). 없으면 아무 계정도 안 켜짐
- `AUTODM_DRY_RUN=1` 이면 쓰기 호출 없이 로그만
- `AUTODM_MAX_PER_HOUR` 계정별 시간당 상한(기본 30)

## 환경 변수 (이름만. 값은 Vercel 프로젝트 설정 > Environment Variables 에 사용자가 넣음)
| 이름 | 내용 |
|---|---|
| `IG_TOKEN_ONGROWTH` `IG_TOKEN_STAY` `IG_TOKEN_STAYKIM` `IG_TOKEN_YOJEOM` `IG_TOKEN_BEAUTYLETTER` `IG_TOKEN_COPYMARONG` | 계정별 인스타 토큰(인스타그램 로그인 방식, IG로 시작하는 장기 토큰). 60일마다 갱신 필요 |
| `POLL_SECRET` | 폴링 호출 암호(아무 긴 문자열). 크론 호출 시 헤더 `x-poll-key` 로 보냄 |
| `KV_REST_API_URL` `KV_REST_API_TOKEN` | Vercel Storage > Upstash Redis(무료) 연결하면 자동 생성. 중복 방지·최근 50건 기억용. 없으면 메모리(재시작 시 잊음) |
| `AUTODM_MODE` `AUTODM_ACCOUNTS` `AUTODM_TEST_USERNAMES` `AUTODM_DRY_RUN` | 위 안전장치 |
| `WEBHOOK_VERIFY_TOKEN` `IG_APP_SECRET` | 웹훅 쓸 때만(확인용 문자열, 앱의 인스타그램 앱 시크릿) |
| `IG_GRAPH_VERSION` | 선택, 기본 v23.0 |

## Meta 앱 설정 (「Ongrowth Cardnews」, developers.facebook.com)
1. 앱 역할 > 역할 > **Instagram 테스터**에 각 계정 추가 → 각 계정에서 인스타 웹 설정 > 앱 및 웹사이트 > 테스터 초대 수락 (메뉴 이름은 Meta 화면에서 확인)
2. Instagram > 인스타그램 로그인 API 설정 > 계정 추가 > 토큰 생성. 권한: `instagram_business_basic`, `instagram_business_manage_comments`, `instagram_business_manage_messages`
3. 각 계정 인스타 앱 설정 > 메시지 > 연결된 도구 > **메시지 접근 허용** 켜기
4. (실사용 전) 앱을 Live로 전환: 개인정보처리방침 URL·데이터 삭제 URL에 `https://<배포주소>/api/privacy` 입력
   - 개발 모드에서는 앱 역할이 없는 사람에게 DM이 안 갈 수 있다(미확인). 그래서 테스트는 테스터 계정 댓글로 한다.

## Vercel 배포 (무료 Hobby)
1. vercel.com > Add New Project > GitHub `oeoeoe3576-byte/ongrowth` 가져오기, **Root Directory = `autodm`**, 브랜치 지정
2. Environment Variables 입력 → Deploy
3. Storage > Upstash Redis(Free) 만들어 프로젝트에 연결
4. `https://<배포주소>/api/health` 에서 설정 여부 확인(값은 안 보임)
5. cron-job.org(무료) > 작업 추가: URL `https://<배포주소>/api/poll`, 5~10분마다, 헤더 `x-poll-key: <POLL_SECRET 값>`
- 주의: Vercel Hobby는 약관상 개인·비상업용. 수익 계정에 문제 되면 같은 코드를 Cloudflare Workers 무료로 옮길 수 있음.

## 테스트 순서 (온그로스 하나로)
1. `AUTODM_ACCOUNTS=ongrowth`, `AUTODM_MODE=test`, `AUTODM_DRY_RUN=1`, `AUTODM_TEST_USERNAMES=<테스트용 다른 계정>`
2. 테스트 계정으로 온그로스 게시물에 댓글 → `/api/poll` 결과·Vercel 로그에 `dm+reply`(드라이런) 확인
3. 사용자 승인 후 `AUTODM_DRY_RUN` 삭제 → 실제 답글·DM 1건 확인
4. 사용자 승인 후 `AUTODM_MODE=live` → 다른 계정을 `AUTODM_ACCOUNTS`에 하나씩 추가

## 로컬 명령
- `npm run build:data` 문구·링크 검사 후 `lib/data.generated.ts` 생성 (문구/링크 고친 뒤 꼭 실행하고 커밋)
- `npx tsx tools/simulate.ts [계정] [건수]` 문구 조합·중복 시뮬레이션
- `npx tsx tools/e2e-test.ts` 가짜 API로 전체 흐름 시험
- `npx tsx tools/status.ts` 토큰·구독·최근 게시물 ID(링크 표 작성용) 읽기 전용 점검
