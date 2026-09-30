// MASTER / PAGES 시트(CSV) 저장소. 1단계의 CSV 입출력(src/sheet/csv.ts)을 그대로 쓴다.
// - data/planner/master.csv : 카드뉴스 1세트 = 1행
// - data/planner/pages.csv  : 카드 1장 = 1행, content_id + page_number로 MASTER와 연결
// - data/planner/plans/<content_id>.json : AI 원본 기획 (planning_note 포함, 재현/검수용)

import fs from "node:fs";
import path from "node:path";
import { toCsv, parseCsv } from "../sheet/csv.js";
import { MASTER_COLUMNS, PAGE_COLUMNS, CONTENT_TYPES, PAGE_ROLES, LAYOUTS, IMAGE_TYPES, FACT_CHECK, OBJECTIVES, MASTER_STATUS, MIN_PAGES, MAX_PAGES, type MasterRow, type PageRow } from "./types.js";
import type { PlanResult } from "./engine.js";

export const STORE_DIR = path.resolve("data/planner");

export interface Store {
  master: MasterRow[];
  pages: PageRow[];
}

function readCsv<T>(file: string, columns: readonly string[]): T[] {
  if (!fs.existsSync(file)) return [];
  const parsed = parseCsv(new TextDecoder("utf-8", { fatal: true }).decode(fs.readFileSync(file)));
  if (parsed.header.join(",") !== columns.join(",")) throw new Error(`${file} 헤더가 스키마와 다름`);
  return parsed.rows as T[];
}

export function loadStore(dir = STORE_DIR): Store {
  return {
    master: readCsv<MasterRow>(path.join(dir, "master.csv"), MASTER_COLUMNS),
    pages: readCsv<PageRow>(path.join(dir, "pages.csv"), PAGE_COLUMNS),
  };
}

export function writeStore(store: Store, dir = STORE_DIR): void {
  fs.mkdirSync(dir, { recursive: true });
  const pages = [...store.pages].sort((a, b) => a.content_id.localeCompare(b.content_id) || Number(a.page_number) - Number(b.page_number));
  const master = [...store.master].sort((a, b) => a.content_id.localeCompare(b.content_id));
  fs.writeFileSync(path.join(dir, "master.csv"), toCsv(MASTER_COLUMNS, master), "utf8");
  fs.writeFileSync(path.join(dir, "pages.csv"), toCsv(PAGE_COLUMNS, pages), "utf8");
}

/** CN-YYYYMMDD-NNN. 같은 날짜의 마지막 번호 + 1 (1단계 시트 ID와 같은 형식) */
export function nextContentId(store: Store, date: string): string {
  const prefix = `CN-${date.replace(/-/g, "")}-`;
  const nums = store.master.filter((m) => m.content_id.startsWith(prefix)).map((m) => Number(m.content_id.slice(prefix.length)));
  return prefix + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, "0");
}

/** 같은 content_id가 있으면 교체, 없으면 추가 */
export function upsertResult(store: Store, r: PlanResult): Store {
  const id = r.master.content_id;
  return {
    master: [...store.master.filter((m) => m.content_id !== id), r.master],
    pages: [...store.pages.filter((p) => p.content_id !== id), ...r.pages],
  };
}

export function savePlanJson(r: PlanResult, dir = STORE_DIR): string {
  const file = path.join(dir, "plans", `${r.master.content_id}.json`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ provider: r.provider, attempts: r.attempts, plan: r.plan }, null, 2) + "\n", "utf8");
  return file;
}

/** 시트 전체 무결성: MASTER ↔ PAGES 연결, 허용 값, 페이지 번호 연속성 */
export function validateStore(store: Store): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const enumCheck = (where: string, field: string, v: string, allowed: readonly string[], allowEmpty = false) => {
    if (allowEmpty && v === "") return;
    if (!allowed.includes(v)) errors.push(`${where} ${field}='${v}' 허용 값 아님`);
  };

  for (const m of store.master) {
    const where = `MASTER ${m.content_id}`;
    if (!/^CN-\d{8}-\d{3}$/.test(m.content_id)) errors.push(`${where} content_id 형식 오류`);
    if (ids.has(m.content_id)) errors.push(`${where} content_id 중복`);
    ids.add(m.content_id);
    enumCheck(where, "objective", m.objective, Object.keys(OBJECTIVES));
    enumCheck(where, "content_type", m.content_type, Object.keys(CONTENT_TYPES));
    enumCheck(where, "status", m.status, MASTER_STATUS);
    for (const f of MASTER_COLUMNS) if (m[f] === undefined || m[f] === "") errors.push(`${where} ${f} 비어 있음`);

    const pages = store.pages.filter((p) => p.content_id === m.content_id);
    const n = Number(m.page_count);
    if (pages.length !== n) errors.push(`${where} page_count=${m.page_count}인데 PAGES에 ${pages.length}행`);
    if (n < MIN_PAGES || n > MAX_PAGES) errors.push(`${where} page_count ${n} 범위 밖`);
    const nums = pages.map((p) => Number(p.page_number)).sort((a, b) => a - b);
    if (nums.some((v, i) => v !== i + 1)) errors.push(`${where} page_number가 1부터 연속되지 않음: ${nums.join(",")}`);
  }
  for (const p of store.pages) {
    const where = `PAGES ${p.content_id} p${p.page_number}`;
    if (!ids.has(p.content_id)) errors.push(`${where} MASTER에 없는 content_id`);
    enumCheck(where, "page_role", p.page_role, Object.keys(PAGE_ROLES));
    enumCheck(where, "layout_type", p.layout_type, Object.keys(LAYOUTS));
    enumCheck(where, "image_required", p.image_required, ["TRUE", "FALSE"]);
    enumCheck(where, "image_type", p.image_type, IMAGE_TYPES, true);
    enumCheck(where, "fact_check", p.fact_check, Object.keys(FACT_CHECK));
    if (!p.headline) errors.push(`${where} headline 비어 있음`);
  }
  return errors;
}
