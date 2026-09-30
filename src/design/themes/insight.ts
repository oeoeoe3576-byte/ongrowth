import type { DesignTheme } from "../tokens.js";
import { extendTheme } from "./extend.js";
import { defaultTheme } from "./default.js";

// 인사이트: 검정 배경 + 형광 초록 포인트. 어두운 사진 위 글자가 잘 보이는 톤.
export const insightTheme: DesignTheme = extendTheme(defaultTheme, {
  name: "insight",
  color: {
    background: "#0F1012",
    surface: "#1A1C20",
    primary: "#000000",
    secondary: "#26292E",
    text: "#F4F4F5",
    textOnPrimary: "#F4F4F5",
    muted: "#A1A4AA",
    mutedOnPrimary: "#A1A4AA",
    accent: "#3DD68C",
    accentSoft: "rgba(61,214,140,.14)",
    line: "#2C2F35",
    onAccent: "#0B1F14",
    accentOnDark: "#3DD68C",
  },
  emphasis: { color: "var(--c-accent)", background: "none", weight: 800, colorOnDark: "var(--c-accent-dark)" },
});
