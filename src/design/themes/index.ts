// 테마 레지스트리. 새 브랜드 테마는 파일 하나 추가 + 여기 등록으로 끝난다.
// default(코발트), insight(검정+초록), life(크림+갈색), campaign(진초록+주황).

import type { DesignTheme } from "../tokens.js";
import { defaultTheme } from "./default.js";
import { insightTheme } from "./insight.js";
import { lifeTheme } from "./life.js";
import { campaignTheme } from "./campaign.js";
import { ongrowthTheme } from "./ongrowth.js";
export { extendTheme } from "./extend.js";

const THEMES: Record<string, DesignTheme> = {
  default: defaultTheme,
  marketing: defaultTheme,
  insight: insightTheme,
  life: lifeTheme,
  campaign: campaignTheme,
  // 계정 전용
  ongrowth: ongrowthTheme,
  // 분야 → 테마 기본 연결 (브랜드 설정의 theme가 있으면 그게 우선)
  travel: lifeTheme,
  stay: lifeTheme,
};

/** 브랜드/카테고리에서 테마를 고른다. 없으면 default */
export function resolveTheme(name?: string): { theme: DesignTheme; fallback: boolean } {
  if (name && THEMES[name]) return { theme: THEMES[name], fallback: false };
  return { theme: defaultTheme, fallback: !!name && name !== "default" };
}

export function listThemes(): string[] {
  return Object.keys(THEMES);
}

