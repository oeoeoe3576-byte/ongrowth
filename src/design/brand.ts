// 브랜드 프로필 불러오기 + 원고의 이미지 경로를 카드에 넣을 수 있는 형태로 바꾸기.

import fs from "node:fs";
import path from "node:path";
import type { BrandProfile } from "./types.js";

/** 실행 위치 기준 data/brands (호출할 때마다 계산) */
export function brandDir(): string {
  return path.resolve("data/brands");
}

export function loadBrand(brand: string): BrandProfile {
  const file = path.join(brandDir(), `${brand}.json`);
  const fallback: BrandProfile = { handle: brand };
  if (!fs.existsSync(file)) return fallback;
  const data = JSON.parse(fs.readFileSync(file, "utf8")) as Partial<BrandProfile>;
  const profile = { ...fallback, ...data };
  if (profile.logo) profile.logo = toImageSrc(profile.logo);
  return profile;
}

const MIME: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml" };

/**
 * 로컬 이미지 경로(예: data/images/cover.jpg)는 파일 하나로 열리는 미리보기와 PNG 렌더링에서
 * 모두 보이도록 data URL로 바꾼다. URL이나 data URL은 그대로 둔다. 없는 파일이면 빈 값 (placeholder 표시).
 */
export function toImageSrc(src: string): string {
  const s = src.trim();
  if (!s || /^(https?:|data:)/.test(s)) return s;
  const file = path.resolve(s.replace(/^file:\/\//, ""));
  const mime = MIME[path.extname(file).toLowerCase()];
  if (!mime || !fs.existsSync(file)) return "";
  return `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
}
