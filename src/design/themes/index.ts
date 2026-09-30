// 테마 레지스트리. 새 브랜드 테마는 파일 하나 추가 + 여기 등록으로 끝난다.
// 이번 단계에서는 default(마케팅)만 실제 구현한다.

import type { DesignTheme } from "../tokens.js";
import { defaultTheme } from "./default.js";

const THEMES: Record<string, DesignTheme> = {
  default: defaultTheme,
  marketing: defaultTheme,
  // beauty: beautyTheme,   // 4단계 이후
  // travel: travelTheme,
};

/** 브랜드/카테고리에서 테마를 고른다. 없으면 default */
export function resolveTheme(name?: string): { theme: DesignTheme; fallback: boolean } {
  if (name && THEMES[name]) return { theme: THEMES[name], fallback: false };
  return { theme: defaultTheme, fallback: !!name && name !== "default" };
}

export function listThemes(): string[] {
  return Object.keys(THEMES);
}

/** 기존 테마 일부만 바꿔 새 테마를 만들 때 사용 */
export function extendTheme(base: DesignTheme, patch: { name: string } & { [K in keyof DesignTheme]?: Partial<DesignTheme[K]> | DesignTheme[K] }): DesignTheme {
  const out = structuredClone(base) as unknown as Record<string, unknown>;
  for (const [k, v] of Object.entries(patch)) {
    out[k] = v && typeof v === "object" && !Array.isArray(v) ? { ...(out[k] as object), ...v } : v;
  }
  return out as unknown as DesignTheme;
}
