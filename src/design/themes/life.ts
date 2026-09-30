import type { DesignTheme } from "../tokens.js";
import { extendTheme } from "./extend.js";
import { defaultTheme } from "./default.js";

// 라이프: 크림 배경 + 짙은 갈색. 강조는 색 대신 굵기로 (얇은 줄 + 굵은 줄).
export const lifeTheme: DesignTheme = extendTheme(defaultTheme, {
  name: "life",
  color: {
    background: "#F3EEE5",
    surface: "#FBF8F3",
    primary: "#3E322B",
    secondary: "#E5DCCD",
    text: "#3E322B",
    textOnPrimary: "#F3EEE5",
    muted: "#857567",
    mutedOnPrimary: "#C9BBAA",
    accent: "#5A4336",
    accentSoft: "#E9DFD0",
    line: "#DDD2C2",
    onAccent: "#F3EEE5",
    accentOnDark: "#E3C6A2",
  },
  emphasis: { color: "currentColor", background: "none", weight: 800, colorOnDark: "currentColor" },
  typography: { headlineTracking: "-0.035em", displayWeight: 500 },
  font: { weightRegular: 400 },
});
