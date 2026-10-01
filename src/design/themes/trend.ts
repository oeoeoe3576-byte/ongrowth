import type { DesignTheme } from "../tokens.js";
import { extendTheme } from "./extend.js";
import { defaultTheme } from "./default.js";

// 트렌드 (여행 계정용): 요즘 인스타 캐러셀 감성.
// 표지 = 사진 전체 + 아주 굵은 흰 제목, 강조 단어는 연두 글자, 가운데에 검정 박스 한 줄(질문/훅), 제목 위 흰 한 줄.
// 본문 = 연회색 바탕, 가운데 정렬, 굵은 검정 제목 → 얇은 테두리 사진 → 가운데 본문, 핵심 문장은 연두 형광펜.
// 쪽수는 인스타가 1/9로 보여주므로 카드에는 넣지 않고, 오른쪽 아래 연두 화살표로 넘김을 알린다.
const GREEN = "#A6F2A2"; // 사진 위 강조 글자
const GREEN_HL = "#C7F5D4"; // 밝은 바탕 형광펜
const ARROW = "#74E3A4";

export const trendTheme: DesignTheme = extendTheme(defaultTheme, {
  name: "trend",
  color: {
    background: "#EFEFEF",
    surface: "#FFFFFF",
    primary: "#FFFFFF", // 표지(사진 없을 때)·마무리도 밝게
    secondary: "#DCDCDC",
    text: "#111111",
    textOnPrimary: "#111111",
    muted: "#2B2B2B",
    mutedOnPrimary: "#2B2B2B",
    accent: "#1FAF6B",
    accentSoft: GREEN_HL,
    line: "#D4D4D4",
    onAccent: "#0D2418",
    accentOnDark: "#1FAF6B",
    cardBg: "#FFFFFF",
    cardText: "#111111",
  },
  emphasis: { color: "currentColor", background: `linear-gradient(transparent 6%, ${GREEN_HL} 6%, ${GREEN_HL} 96%, transparent 96%)`, weight: 800, colorOnDark: GREEN },
  font: { weightRegular: 500, weightBold: 700, weightHeavy: 900 },
  typography: { displaySize: 108, headlineSize: 74, subheadlineSize: 36, displayWeight: 900, headlineTracking: "-0.05em", bodySize: 36, bodyLineHeight: 1.6 },
  radius: { card: 0, box: 0, pill: 999 },
  css: `
/* 상단 라벨·쪽수·진행 막대 없음. 오른쪽 아래 연두 화살표 */
.cn-theme-trend .cn-top { visibility: hidden; }
.cn-theme-trend .cn-progress { visibility: hidden; }
.cn-theme-trend .cn-swipe { font-size: 0; }
.cn-theme-trend .cn-foot::after { content: "→"; margin-left: auto; font-size: 96px; line-height: 1; font-weight: 900; color: ${ARROW}; }
.cn-theme-trend.cn-l-FOLLOW .cn-foot::after, .cn-theme-trend.cn-l-CTA .cn-foot::after { content: none; }

/* 본문 카드: 가운데 정렬, 굵은 제목, 얇은 테두리 사진 */
.cn-theme-trend.cn-tone-light .cn-main, .cn-theme-trend.cn-tone-dark .cn-main { text-align: center; align-items: center; }
.cn-theme-trend.cn-tone-light .cn-main > *, .cn-theme-trend.cn-tone-dark .cn-main > * { margin-left: auto; margin-right: auto; max-width: 100%; }
.cn-theme-trend .cn-focus { align-self: stretch; justify-content: center; }
.cn-theme-trend .cn-headline { font-weight: 900; line-height: 1.22; }
.cn-theme-trend .cn-sub { color: var(--c-muted); font-weight: 500; }
.cn-theme-trend .cn-body { color: #222; font-weight: 500; }
.cn-theme-trend .cn-em { padding: 0 .1em; }
.cn-theme-trend .cn-rule { display: none; }
.cn-theme-trend .cn-image { border-radius: 0; border: 2px solid #2A2A2A; }
.cn-theme-trend.cn-tone-dark { --c-line: #DDDDDD; --c-surface: #F4F4F4; }
.cn-theme-trend.cn-tone-dark .cn-em { background: var(--em-bg); color: inherit; }
.cn-theme-trend.cn-tone-photo .cn-em { background: none; color: ${GREEN}; }
.cn-theme-trend.cn-l-FOLLOW .cn-profile { border: 2px solid #E2E2E2; }
/* 이미지+글: 제목 → 사진 → 본문 순서 */
.cn-theme-trend.cn-l-IMAGE_TEXT .cn-main { justify-content: center; gap: 36px; }
.cn-theme-trend.cn-l-IMAGE_TEXT .cn-textblock { display: contents; }
.cn-theme-trend.cn-l-IMAGE_TEXT .cn-headline { order: -1; }
.cn-theme-trend.cn-l-IMAGE_TEXT .cn-image { flex: 0 1 auto; width: 74%; height: 520px; min-height: 0; }

/* 표지: 제목 위 흰 한 줄, 가운데 검정 박스(질문), 아주 굵은 제목 */
.cn-theme-trend.cn-l-PHOTO_COVER .cn-main, .cn-theme-trend.cn-l-BIG_TITLE .cn-main { position: relative; justify-content: flex-end; text-align: left; align-items: flex-start; gap: 18px; }
.cn-theme-trend.cn-l-PHOTO_COVER .cn-main > *, .cn-theme-trend.cn-l-BIG_TITLE .cn-main > * { margin-left: 0; }
.cn-theme-trend.cn-l-PHOTO_COVER .cn-sub, .cn-theme-trend.cn-l-BIG_TITLE .cn-sub { order: -1; font-size: 40px; font-weight: 500; letter-spacing: -0.04em; color: inherit; }
.cn-theme-trend.cn-l-PHOTO_COVER .cn-display, .cn-theme-trend.cn-l-BIG_TITLE .cn-display { font-size: 112px; line-height: 1.2; letter-spacing: -0.05em; font-weight: 800; }
.cn-theme-trend.cn-l-PHOTO_COVER .cn-display { text-shadow: 0 4px 30px rgba(0,0,0,.35); }
.cn-theme-trend.cn-l-PHOTO_COVER .cn-sub { text-shadow: 0 2px 14px rgba(0,0,0,.4); }
.cn-theme-trend .cn-cover-note {
  display: -webkit-box; position: absolute; left: 50%; top: 30%; transform: translateX(-50%); max-width: 100%; width: max-content;
  background: #000; color: #fff; border: 2px solid #fff; padding: 8px 18px; font-size: 32px; font-weight: 700; letter-spacing: -0.06em; line-height: 1.4; text-align: center;
}
.cn-theme-trend .cn-cover-note .cn-em { color: ${GREEN}; background: none; }
.cn-theme-trend.cn-l-PHOTO_COVER .cn-tag, .cn-theme-trend.cn-l-BIG_TITLE .cn-kicker { display: none; }
.cn-theme-trend.cn-l-PHOTO_COVER .cn-bg-shade { background: linear-gradient(180deg, rgba(0,0,0,.05) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,.45) 75%, rgba(0,0,0,.7) 100%); }
`,
});
