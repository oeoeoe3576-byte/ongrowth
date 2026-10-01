import type { DesignTheme } from "../tokens.js";
import { extendTheme } from "./extend.js";
import { defaultTheme } from "./default.js";

// 트렌드: 요즘 인스타 캐러셀 스타일.
// 표지 = 사진 전체 + 아주 굵은 흰 제목, 강조 단어는 민트 글자, 작은 문구는 검정/민트 박스 라벨.
// 본문 = 연회색 바탕, 가운데 정렬, 굵은 검정 제목, 핵심 문장은 민트 형광펜, 오른쪽 아래 초록 화살표.
const MINT = "#3EE8C0";

export const trendTheme: DesignTheme = extendTheme(defaultTheme, {
  name: "trend",
  color: {
    background: "#EEEEEE",
    surface: "#FFFFFF",
    primary: "#FFFFFF", // 표지·마무리 카드도 밝게 (레퍼런스처럼 어두운 면 없이)
    secondary: "#DADADA",
    text: "#111111",
    textOnPrimary: "#111111",
    muted: "#4A4A4A",
    mutedOnPrimary: "#4A4A4A",
    accent: "#13B48C",
    accentSoft: "rgba(62,232,192,.55)",
    line: "#D4D4D4",
    onAccent: "#0B1F19",
    accentOnDark: "#13B48C",
    cardBg: "#FFFFFF",
    cardText: "#111111",
  },
  emphasis: { color: "currentColor", background: "linear-gradient(transparent 12%, var(--c-accent-soft) 12%, var(--c-accent-soft) 94%, transparent 94%)", weight: 800, colorOnDark: MINT },
  font: { weightRegular: 500, weightBold: 700, weightHeavy: 900 },
  typography: { displaySize: 108, headlineSize: 70, displayWeight: 900, headlineTracking: "-0.045em", bodySize: 35, bodyLineHeight: 1.62 },
  radius: { card: 0, box: 18, pill: 999 },
  css: `
/* 상단 라벨·진행 막대는 숨기고 쪽수만 오른쪽 위 둥근 칩으로 (인스타 1/10 표시와 겹치지 않게 작게) */
.cn-theme-trend .cn-brand { opacity: 0; }
.cn-theme-trend .cn-pn { font-size: 24px; font-weight: 700; padding: 8px 20px; border-radius: 999px; background: rgba(0,0,0,.08); }
.cn-theme-trend.cn-tone-photo .cn-pn { background: rgba(0,0,0,.45); color: #fff; }
.cn-theme-trend .cn-pn-total { color: inherit; opacity: .7; }
.cn-theme-trend .cn-progress { visibility: hidden; }
.cn-theme-trend .cn-swipe { font-size: 0; }
.cn-theme-trend .cn-foot::after { content: "→"; margin-left: auto; font-size: 92px; line-height: 1; font-weight: 900; color: #5BE38A; }
.cn-theme-trend.cn-l-FOLLOW .cn-foot::after, .cn-theme-trend.cn-l-CTA .cn-foot::after { content: none; }

/* 본문 카드: 가운데 정렬 */
.cn-theme-trend.cn-tone-light .cn-main { text-align: center; align-items: center; }
.cn-theme-trend.cn-tone-light .cn-main > * { margin-left: auto; margin-right: auto; max-width: 100%; }
/* 큰 숫자는 폭을 꽉 채운 채 가운데로 (넘치면 검수기가 잡도록) */
.cn-theme-trend .cn-focus { align-self: stretch; justify-content: center; }
.cn-theme-trend .cn-headline { font-weight: 900; }
.cn-theme-trend .cn-sub { color: var(--c-muted); font-weight: 600; }
.cn-theme-trend .cn-em { padding: 0 .12em; }
.cn-theme-trend.cn-tone-photo .cn-em { color: ${MINT}; }
/* "어두운" 역할 카드(표지·마무리)도 이 테마에선 흰 바탕: 강조는 형광펜 그대로 */
.cn-theme-trend.cn-tone-dark { --c-line: #DDDDDD; --c-surface: #F4F4F4; }
.cn-theme-trend.cn-tone-dark .cn-em { background: var(--em-bg); color: inherit; }
.cn-theme-trend.cn-tone-dark .cn-pn { background: rgba(0,0,0,.08); }
.cn-theme-trend .cn-image { border-radius: 4px; box-shadow: 0 2px 0 rgba(0,0,0,.08); }

/* 표지: 작은 문구는 박스 라벨로 제목 위에, 제목은 아주 굵게 */
.cn-theme-trend.cn-l-PHOTO_COVER .cn-main, .cn-theme-trend.cn-l-BIG_TITLE .cn-main { justify-content: flex-end; text-align: left; align-items: flex-start; gap: 22px; }
.cn-theme-trend.cn-l-PHOTO_COVER .cn-sub, .cn-theme-trend.cn-l-BIG_TITLE .cn-sub {
  order: -1; width: fit-content; max-width: 100%; align-self: flex-start; background: #000; color: #fff; font-weight: 700;
  font-size: 34px; line-height: 1.5; padding: 4px 16px;
}
.cn-theme-trend.cn-l-PHOTO_COVER .cn-rule, .cn-theme-trend.cn-l-BIG_TITLE .cn-rule { display: none; }
.cn-theme-trend.cn-l-PHOTO_COVER .cn-tag, .cn-theme-trend.cn-l-BIG_TITLE .cn-kicker {
  order: -2; align-self: flex-start; background: ${MINT}; color: #0B1F19; border-radius: 0; padding: 6px 16px; font-size: 34px; font-weight: 800; letter-spacing: 0; text-transform: none;
}
.cn-theme-trend.cn-l-PHOTO_COVER .cn-display, .cn-theme-trend.cn-l-BIG_TITLE .cn-display { font-size: 112px; line-height: 1.2; letter-spacing: -0.05em; }
.cn-theme-trend.cn-l-PHOTO_COVER .cn-display { text-shadow: 0 4px 28px rgba(0,0,0,.35); }
.cn-theme-trend.cn-l-FOLLOW .cn-profile { border: 2px solid #E2E2E2; }
`,
});
