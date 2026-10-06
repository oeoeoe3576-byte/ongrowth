import type { DesignTheme } from "../tokens.js";

// 기본(마케팅) 테마: 따뜻한 오프화이트 + 잉크 블랙 + 코발트 포인트 한 가지.
// 그라데이션/큰 그림자 없이 여백과 글자 크기 차이로 위계를 만든다.
export const defaultTheme: DesignTheme = {
  name: "default",
  color: {
    background: "#F6F4EF",
    surface: "#FFFFFF",
    primary: "#15161A",
    secondary: "#E7E3DA",
    text: "#15161A",
    textOnPrimary: "#F6F4EF",
    muted: "#6E6B66",
    mutedOnPrimary: "#A9A7A2",
    accent: "#2F54EB",
    accentSoft: "#E3E8FC",
    line: "#DCD7CC",
    onAccent: "#FFFFFF",
    accentOnDark: "#3D6BFF",
    cardBg: "#FFFFFF",
    cardText: "#15161A",
  },
  emphasis: { color: "var(--c-accent)", background: "none", weight: 800, colorOnDark: "var(--c-accent-dark)" },
  font: {
    family: "'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif",
    weightRegular: 500,
    weightBold: 700,
    weightHeavy: 800,
  },
  typography: {
    visualFocusSize: 250,
    visualFocusUnitRatio: 0.42,
    displaySize: 100,
    headlineSize: 72,
    subheadlineSize: 38,
    bodySize: 36,
    itemSize: 36,
    captionSize: 26,
    headlineLineHeight: 1.24,
    bodyLineHeight: 1.6,
    headlineTracking: "-0.03em",
    displayWeight: 800,
  },
  spacing: {
    pagePadding: 96,
    sectionGap: 48,
    itemGap: 28,
    innerPadding: 40,
  },
  radius: { card: 0, box: 28, pill: 999 },
  border: { width: 2 },
  shadow: { box: "none" },
};
