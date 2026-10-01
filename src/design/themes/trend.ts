import type { DesignTheme } from "../tokens.js";
import { extendTheme } from "./extend.js";
import { defaultTheme } from "./default.js";

// 트렌드 (여행 계정용): 요즘 인스타 캐러셀 감성. 색 조합만 다른 버전을 makeTrendTheme로 만든다.
// 표지 = 사진 전체 + 아주 굵은 흰 제목, 강조 단어는 포인트색 글자, 가운데에 검정 박스 한 줄(질문/훅), 제목 위 흰 한 줄.
// 본문 = 흰 바탕(포인트 장만 연한 땡땡이), 가운데 정렬, 굵은 검정 제목 → 얇은 테두리 사진 → 가운데 본문, 핵심 문장은 형광펜.
// 쪽수는 인스타가 1/9로 보여주므로 카드에는 넣지 않고, 오른쪽 아래 화살표로 넘김을 알린다.
export interface TrendPalette {
  onPhoto: string; // 사진 위 강조 글자
  highlight: string; // 밝은 바탕 형광펜
  arrow: string;
  dot: string; // 배경 땡땡이
  accent: string; // 번호·글자 강조 (흰 바탕에서 읽히는 진한 색)
  onAccent: string;
  button?: string; // 마지막 장 프로필·팔로우 버튼 (없으면 accent). 화살표·표지 강조와 같은 톤으로 맞출 때
}

const dots = (c: string) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='90' height='90' viewBox='0 0 90 90'><circle cx='22' cy='22' r='6' fill='${c}'/><circle cx='67' cy='67' r='6' fill='${c}'/></svg>`)}")`;

export function makeTrendTheme(name: string, P: TrendPalette): DesignTheme {
  const T = `.cn-theme-${name}`;
  return extendTheme(defaultTheme, {
  name,
  color: {
    background: "#FFFFFF",
    surface: "#FFFFFF",
    primary: "#FFFFFF", // 표지(사진 없을 때)·마무리도 밝게
    secondary: "#DCDCDC",
    text: "#111111",
    textOnPrimary: "#111111",
    muted: "#2B2B2B",
    mutedOnPrimary: "#2B2B2B",
    accent: P.accent,
    accentSoft: P.highlight,
    line: "#D4D4D4",
    onAccent: P.onAccent,
    accentOnDark: P.accent,
    cardBg: "#FFFFFF",
    cardText: "#111111",
  },
  emphasis: { color: "currentColor", background: `linear-gradient(transparent 6%, ${P.highlight} 6%, ${P.highlight} 96%, transparent 96%)`, weight: 800, colorOnDark: P.onPhoto },
  font: { weightRegular: 500, weightBold: 700, weightHeavy: 900 },
  typography: { displaySize: 108, headlineSize: 74, subheadlineSize: 36, displayWeight: 900, headlineTracking: "-0.05em", bodySize: 36, bodyLineHeight: 1.6 },
  radius: { card: 0, box: 0, pill: 999 },
  css: `
/* 줄바꿈: 제목은 줄 길이를 고르게(한 글자만 다음 줄로 떨어지지 않게), 본문은 마지막 줄이 너무 짧지 않게 */
${T} .cn-display, ${T} .cn-headline, ${T} .cn-sub, ${T} .cn-cover-note { text-wrap: balance; }
${T} .cn-body { text-wrap: pretty; }
/* 상단 라벨·쪽수·진행 막대 없음. 오른쪽 아래 연두 화살표 */
${T} .cn-top { visibility: hidden; }
${T} .cn-progress { visibility: hidden; }
${T} .cn-swipe { font-size: 0; }
${T} .cn-foot::after { content: "→"; margin-left: auto; font-size: 96px; line-height: 1; font-weight: 900; color: ${P.arrow}; }
${T}.cn-l-FOLLOW .cn-foot::after, ${T}.cn-l-CTA .cn-foot::after { content: none; }

/* 본문 카드: 가운데 정렬, 굵은 제목, 얇은 테두리 사진 */
${T}.cn-tone-light .cn-main, ${T}.cn-tone-dark .cn-main { text-align: center; align-items: center; }
${T}.cn-tone-light .cn-main > *, ${T}.cn-tone-dark .cn-main > * { margin-left: auto; margin-right: auto; max-width: 100%; }
${T} .cn-focus { align-self: stretch; justify-content: center; }
${T} .cn-headline { font-weight: 900; line-height: 1.22; }
${T} .cn-sub { color: var(--c-muted); font-weight: 500; }
${T} .cn-body { color: #222; font-weight: 500; }
${T} .cn-em { padding: 0 .1em; }
${T} .cn-rule { display: none; }
${T} .cn-image { border-radius: 0; border: 2px solid #2A2A2A; }
${T}.cn-tone-dark { --c-line: #DDDDDD; --c-surface: #F4F4F4; }
/* 땡땡이는 포인트 장에만: 사진이 들어간 장, 사진 없는 표지, 마무리(CTA·FOLLOW). 글자만 있는 장은 흰 바탕 그대로 */
${T}.cn-l-IMAGE_TEXT, ${T}.cn-l-SCREENSHOT, ${T}.cn-l-BIG_TITLE, ${T}.cn-l-FOLLOW, ${T}.cn-l-CTA { background-image: ${dots(P.dot)}; }
${T}.cn-tone-dark .cn-em { background: var(--em-bg); color: inherit; }
${T}.cn-tone-photo .cn-em { background: none; color: ${P.onPhoto}; }
${T}.cn-l-FOLLOW .cn-profile { border: 2px solid #E2E2E2; ${P.button ? `--c-accent: ${P.button}; --c-on-accent: #FFFFFF;` : ""} }
${P.button ? `${T}.cn-l-FOLLOW .cn-cta-line { color: ${P.button}; }` : ""}
/* 이미지+글: 제목 → 사진 → 본문 순서 */
${T}.cn-l-IMAGE_TEXT .cn-main { justify-content: center; gap: 36px; }
${T}.cn-l-IMAGE_TEXT .cn-textblock { display: contents; }
${T}.cn-l-IMAGE_TEXT .cn-headline { order: -1; }
/* 사진 전체가 보이도록 잘라내지 않고 비율대로 넣는다 */
${T}.cn-l-IMAGE_TEXT .cn-image { flex: 0 0 auto; width: auto; height: auto; max-width: 80%; min-height: 0; align-self: center; background: none; }
${T}.cn-l-IMAGE_TEXT .cn-image img { width: auto; height: auto; max-width: 100%; max-height: 460px; object-fit: contain; }

/* 표지: 제목 위 흰 한 줄, 가운데 검정 박스(질문), 아주 굵은 제목 */
${T}.cn-l-PHOTO_COVER .cn-main, ${T}.cn-l-BIG_TITLE .cn-main { position: relative; justify-content: flex-end; text-align: left; align-items: flex-start; gap: 18px; }
${T}.cn-l-PHOTO_COVER .cn-main > *, ${T}.cn-l-BIG_TITLE .cn-main > * { margin-left: 0; }
${T}.cn-l-PHOTO_COVER .cn-sub, ${T}.cn-l-BIG_TITLE .cn-sub { order: -1; font-size: 40px; font-weight: 500; letter-spacing: -0.04em; color: inherit; }
${T}.cn-l-PHOTO_COVER .cn-display, ${T}.cn-l-BIG_TITLE .cn-display { font-size: 92px; line-height: 1.22; letter-spacing: -0.05em; font-weight: 800; }
${T}.cn-l-PHOTO_COVER .cn-display { text-shadow: 0 4px 30px rgba(0,0,0,.35); }
${T}.cn-l-PHOTO_COVER .cn-sub { text-shadow: 0 2px 14px rgba(0,0,0,.4); }
${T} .cn-cover-note {
  display: -webkit-box; position: absolute; right: 0; top: 4%; max-width: 100%; width: max-content;
  background: ${P.highlight}; color: #111; border: 2px solid #111; padding: 10px 22px; font-size: 36px; font-weight: 800; letter-spacing: -0.05em; line-height: 1.4; text-align: center;
}
${T} .cn-cover-note .cn-em { color: inherit; background: none; }
/* 이미지+글: 이름(축제명 등)을 연한 하늘색 박스 + 얇은 검정 테두리로 사진 아래에 */
${T}.cn-l-TEXT .cn-sub { align-self: center; background: ${P.highlight}; color: #111; border: 2px solid #111; padding: 8px 26px; font-size: 44px; font-weight: 800; letter-spacing: -0.04em; line-height: 1.35; }
${T}.cn-l-TEXT .cn-body { text-align: center; line-height: 1.7; }
${T}.cn-l-TEXT.cn-tone-photo .cn-main { text-align: center; align-items: center; }
${T}.cn-l-TEXT.cn-tone-photo .cn-main > * { margin-left: auto; margin-right: auto; }
${T}.cn-l-TEXT.cn-tone-photo .cn-headline { color: #fff; text-shadow: 0 4px 24px rgba(0,0,0,.5); font-size: 92px; }
${T}.cn-l-TEXT.cn-tone-photo .cn-body { color: #fff !important; font-weight: 700; font-size: 38px; text-shadow: 0 2px 14px rgba(0,0,0,.6); }
${T}.cn-l-IMAGE_TEXT .cn-sub { background: ${P.highlight}; color: #111; border: 2px solid #111; padding: 8px 26px; font-size: 44px; font-weight: 800; letter-spacing: -0.04em; line-height: 1.35; }
${T}.cn-l-PHOTO_COVER .cn-tag, ${T}.cn-l-BIG_TITLE .cn-kicker { display: none; }
${T}.cn-l-PHOTO_COVER .cn-bg-shade { background: linear-gradient(180deg, rgba(0,0,0,.05) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,.45) 75%, rgba(0,0,0,.7) 100%); }
`,
});
}

export const trendTheme = makeTrendTheme("trend", { onPhoto: "#A6F2A2", highlight: "#C7F5D4", arrow: "#74E3A4", dot: "#D9F5E3", accent: "#1FAF6B", onAccent: "#0D2418" });
export const trendSkyTheme = makeTrendTheme("trend-sky", { onPhoto: "#9FD8FF", highlight: "#CFE8FF", arrow: "#6CB8FF", dot: "#DDEEFF", accent: "#2C86E8", onAccent: "#FFFFFF" });
export const trendAquaTheme = makeTrendTheme("trend-aqua", { onPhoto: "#86ECF2", highlight: "#C6F1F5", arrow: "#4CC9DB", dot: "#D6F3F6", accent: "#2BB8D4", onAccent: "#FFFFFF", button: "#2BB8D4" });
