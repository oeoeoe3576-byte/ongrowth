import type { DesignTheme } from "../tokens.js";
import { extendTheme } from "./extend.js";
import { defaultTheme } from "./default.js";

// 온그로스 마케팅: 본문은 기본(밝은 배경), 강조색은 인사이트의 초록으로 통일.
// 표지·마무리는 브랜드 설정의 coverTheme(insight)로 검정 + 초록.
// 밝은 배경 위 글자로 읽히도록 초록을 한 단계 진하게 쓰고, 어두운 카드에서는 원래 초록을 쓴다.
export const ongrowthTheme: DesignTheme = extendTheme(defaultTheme, {
  name: "ongrowth",
  color: {
    accent: "#0F9D58",
    accentSoft: "rgba(15,157,88,.12)",
    accentOnDark: "#3DD68C",
    onAccent: "#FFFFFF",
  },
});
