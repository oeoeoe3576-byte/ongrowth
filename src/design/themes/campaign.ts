import type { DesignTheme } from "../tokens.js";
import { extendTheme } from "./extend.js";
import { defaultTheme } from "./default.js";

// 캠페인: 밝은 바탕 + 진초록 표지/마무리 + 주황 포인트. 형광펜 느낌의 강조.
export const campaignTheme: DesignTheme = extendTheme(defaultTheme, {
  name: "campaign",
  color: {
    background: "#F6F4EE",
    surface: "#FFFFFF",
    primary: "#1D5B4A",
    secondary: "#E4E9E3",
    text: "#1B1F1D",
    textOnPrimary: "#F6F4EE",
    muted: "#66706B",
    mutedOnPrimary: "#B5CBC2",
    accent: "#F0932B",
    accentSoft: "rgba(240,147,43,.28)",
    line: "#DCE1DA",
    onAccent: "#FFFFFF",
    accentOnDark: "#F5A54A",
  },
  emphasis: { color: "currentColor", background: "linear-gradient(transparent 58%, var(--c-accent-soft) 58%)", weight: 800, colorOnDark: "var(--c-accent-dark)" },
});
