import type { DesignTheme } from "../tokens.js";

/** 기존 테마 일부만 바꿔 새 테마를 만들 때 사용 */
export function extendTheme(base: DesignTheme, patch: { name: string } & { [K in keyof DesignTheme]?: Partial<DesignTheme[K]> | DesignTheme[K] }): DesignTheme {
  const out = structuredClone(base) as unknown as Record<string, unknown>;
  for (const [k, v] of Object.entries(patch)) {
    out[k] = v && typeof v === "object" && !Array.isArray(v) ? { ...(out[k] as object), ...v } : v;
  }
  return out as unknown as DesignTheme;
}
