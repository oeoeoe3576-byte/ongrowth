// 1. Research 모듈 - 장소 라이브러리 저장/조회
//
// 실제 관광지 사실 확인(공식 출처 조회)은 LLM이 매번 지어내면 안 되는 작업이므로,
// 이 시스템은 "미리 검증해서 저장해 둔 장소 라이브러리"를 신뢰 소스로 사용한다.
// - Claude(Skill)가 WebSearch/공식 출처로 조사한 뒤 이 스키마에 맞춰 data/places/*.json 에 저장하고,
// - Content Generator는 이 라이브러리에서만 장소를 골라 카드뉴스를 만든다 (지시사항 5, 7).
// 이렇게 조사 단계와 생성 단계를 분리해야 "존재하지 않는 관광지"가 생성물에 섞이지 않는다.

import { promises as fs } from "node:fs";
import path from "node:path";
import type { Place } from "../types.js";
import { validatePlace } from "./placeSchema.js";

const PLACES_DIR = path.resolve(process.cwd(), "data", "places");

function slugifyRegion(region: string): string {
  return region
    .normalize("NFKC")
    .replace(/\s+/g, "_")
    .replace(/[^\p{L}\p{N}_]/gu, "");
}

/** region(예: "강원 강릉시")별로 나뉜 JSON 파일에서 장소를 읽는다. */
export async function loadPlacesByRegionFile(regionFileSlug: string): Promise<Place[]> {
  const file = path.join(PLACES_DIR, `${regionFileSlug}.json`);
  try {
    const raw = await fs.readFile(file, "utf8");
    const list = JSON.parse(raw) as Place[];
    return list.map((p) => validatePlace(p).place);
  } catch (err: any) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

/** data/places/ 아래 모든 파일을 읽어 합친다. */
export async function loadAllPlaces(): Promise<Place[]> {
  let files: string[] = [];
  try {
    files = (await fs.readdir(PLACES_DIR)).filter((f) => f.endsWith(".json"));
  } catch (err: any) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
  const all: Place[] = [];
  for (const f of files) {
    const raw = await fs.readFile(path.join(PLACES_DIR, f), "utf8");
    const list = JSON.parse(raw) as Place[];
    all.push(...list.map((p) => validatePlace(p).place));
  }
  return all;
}

/** 장소 목록을 region 슬러그 파일에 병합 저장한다 (Claude Skill이 조사 결과를 기록할 때 사용). */
export async function upsertPlaces(regionFileSlug: string, places: Place[]): Promise<void> {
  await fs.mkdir(PLACES_DIR, { recursive: true });
  const file = path.join(PLACES_DIR, `${regionFileSlug}.json`);
  const existing = await loadPlacesByRegionFile(regionFileSlug);
  const byId = new Map(existing.map((p) => [p.place_id, p]));
  for (const p of places) {
    const { place } = validatePlace(p);
    byId.set(place.place_id, place);
  }
  const merged = Array.from(byId.values());
  await fs.writeFile(file, JSON.stringify(merged, null, 2) + "\n", "utf8");
}

export function regionSlug(region: string): string {
  return slugifyRegion(region);
}

/** 지역명/키워드로 라이브러리에서 후보를 검색한다. */
export async function findPlaces(query: { region?: string; category?: string; season?: string }): Promise<Place[]> {
  const all = await loadAllPlaces();
  return all.filter((p) => {
    if (query.region && !p.region.includes(query.region) && !query.region.includes(p.region)) return false;
    if (query.category && p.category !== query.category) return false;
    if (query.season && p.recommended_season && !p.recommended_season.includes(query.season)) return false;
    return true;
  });
}
