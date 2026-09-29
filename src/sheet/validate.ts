// 카드뉴스 행 / CSV 파일 검증.
// error: Canva Bulk Create 또는 Sheets 사용 시 실제로 문제가 되는 것 → 반드시 수정
// warning: 동작은 하지만 확인이 필요한 것

import { parseCsv } from "./csv.js";
import { COLUMNS, COLUMN_NAMES, CANVA_COLUMN_NAMES, type CardnewsRow } from "./schema.js";

export interface Issue {
  level: "error" | "warning";
  row?: number; // 1부터 (헤더 제외 데이터 행 번호)
  column?: string;
  message: string;
}

const CONTENT_ID_RE = /^CN-\d{8}-\d{3}$/;
const CREATED_AT_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
const HEADER_NAME_RE = /^[a-z][a-z0-9_]*$/;
// Google Sheets가 수식으로 해석하는 시작 문자
const FORMULA_START_RE = /^[=+\-@]/;
// 인코딩이 깨졌을 때 나타나는 대체 문자 / 제어 문자 (탭, 줄바꿈 제외)
const BROKEN_CHAR_RE = /[�\u0000-\u0008\u000B\u000C\u000E-\u001F]/;

/** 사람이 보는 글자 수 (서로게이트 쌍을 1자로 계산) */
export function charLength(s: string): number {
  return [...s].length;
}

export function validateRows(rows: CardnewsRow[], columns: readonly string[] = COLUMN_NAMES): Issue[] {
  const issues: Issue[] = [];
  const defs = COLUMNS.filter((c) => columns.includes(c.name));
  const seenIds = new Map<string, number>();

  rows.forEach((row, idx) => {
    const r = idx + 1;
    const push = (level: Issue["level"], column: string | undefined, message: string) => issues.push({ level, row: r, column, message });

    for (const key of Object.keys(row)) {
      if (!columns.includes(key)) push("error", key, "스키마에 없는 컬럼");
    }

    for (const def of defs) {
      const v = row[def.name];
      if (v === undefined) {
        push("error", def.name, "컬럼 누락");
        continue;
      }
      if (def.required && v.trim() === "") {
        push("error", def.name, "필수 값이 비어 있음");
        continue;
      }
      if (v !== v.trim()) push("warning", def.name, "앞뒤 공백 있음");
      if (BROKEN_CHAR_RE.test(v)) push("error", def.name, "깨진 문자(U+FFFD) 또는 제어 문자 포함 - 인코딩 확인 필요");
      if (def.maxLength && charLength(v) > def.maxLength) {
        push("error", def.name, `글자 수 초과 (${charLength(v)}/${def.maxLength})`);
      }
      if (def.enum && v !== "" && !def.enum.includes(v)) {
        push("error", def.name, `허용되지 않은 값 '${v}' (허용: ${def.enum.join(", ")})`);
      }
      if (FORMULA_START_RE.test(v)) {
        push("error", def.name, "=, +, -, @ 로 시작하면 Google Sheets가 수식으로 해석함");
      }
      if (def.canva && /[\r\n]/.test(v)) {
        push("error", def.name, "Canva 연결 필드에 줄바꿈 포함 - 한 줄로 작성 (줄바꿈은 Canva 텍스트 박스 폭으로 처리)");
      }
    }

    if (row.content_id !== undefined) {
      if (!CONTENT_ID_RE.test(row.content_id)) push("error", "content_id", "형식은 CN-YYYYMMDD-NNN");
      const prev = seenIds.get(row.content_id);
      if (prev) push("error", "content_id", `${prev}행과 content_id 중복`);
      seenIds.set(row.content_id, r);
    }
    if (row.created_at !== undefined && !CREATED_AT_RE.test(row.created_at)) {
      push("error", "created_at", "형식은 YYYY-MM-DD HH:mm");
    }
    if (row.hashtags !== undefined && row.hashtags.trim() !== "") {
      const bad = row.hashtags.trim().split(/\s+/).filter((t) => !/^#[^\s#,]+$/.test(t));
      if (bad.length) push("error", "hashtags", `해시태그 형식 오류: ${bad.join(" ")} (공백 구분, 각 태그는 #으로 시작)`);
    }

    // 규칙 6: 같은 내용을 여러 페이지에서 반복하지 않는다
    const cardDefs = defs.filter((d) => d.group === "card");
    const seenText = new Map<string, string>();
    for (const d of cardDefs) {
      const v = (row[d.name] ?? "").replace(/\s+/g, "");
      if (!v) continue;
      const other = seenText.get(v);
      if (other) push("error", d.name, `${other}와 내용이 동일함 (페이지 간 반복 금지)`);
      else seenText.set(v, d.name);
    }
  });

  return issues;
}

export interface CsvReport {
  kind: "master" | "canva";
  hadBom: boolean;
  rowCount: number;
  columnCount: number;
  issues: Issue[];
}

/** CSV 파일 바이트를 검증한다. kind에 따라 기대 헤더가 다르다. */
export function validateCsvBytes(bytes: Uint8Array, kind: "master" | "canva", opts: { allowEmpty?: boolean } = {}): CsvReport {
  const issues: Issue[] = [];
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    return { kind, hadBom: false, rowCount: 0, columnCount: 0, issues: [{ level: "error", message: "UTF-8로 디코딩할 수 없음 (CP949/EUC-KR 등으로 저장된 파일)" }] };
  }

  const parsed = parseCsv(text);
  const expected = kind === "master" ? COLUMN_NAMES : CANVA_COLUMN_NAMES;

  if (parsed.hadBom) {
    issues.push({ level: "warning", message: "UTF-8 BOM 있음 - Excel용. Canva/Sheets 업로드에는 BOM 없는 파일 사용 권장" });
  }
  for (const h of parsed.header) {
    if (!HEADER_NAME_RE.test(h)) issues.push({ level: "error", column: h, message: "헤더는 영문 소문자/숫자/_ 만 사용" });
  }
  const dup = parsed.header.filter((h, i) => parsed.header.indexOf(h) !== i);
  if (dup.length) issues.push({ level: "error", message: `중복 헤더: ${dup.join(", ")}` });
  if (parsed.header.join(",") !== expected.join(",")) {
    const missing = expected.filter((h) => !parsed.header.includes(h));
    const extra = parsed.header.filter((h) => !expected.includes(h));
    issues.push({ level: "error", message: `헤더가 스키마와 다름. 누락: [${missing.join(", ")}] 초과: [${extra.join(", ")}] (순서 포함 비교)` });
  }
  if (parsed.rows.length === 0 && !opts.allowEmpty) issues.push({ level: "error", message: "데이터 행이 없음" });

  issues.push(...validateRows(parsed.rows, expected));
  return { kind, hadBom: parsed.hadBom, rowCount: parsed.rows.length, columnCount: parsed.header.length, issues };
}

/** Canva 업로드 전 배치 단위 검사: 한 번의 Bulk Create는 템플릿 1개에만 적용된다 */
export function validateCanvaBatch(rows: CardnewsRow[]): Issue[] {
  const issues: Issue[] = [];
  const keys = new Set(rows.map((r) => `${r.brand}/${r.template_key}`));
  if (keys.size > 1) {
    issues.push({ level: "error", message: `한 Canva CSV에 여러 템플릿이 섞여 있음: ${[...keys].join(", ")} - brand/template_key별로 나눠서 내보낼 것` });
  }
  const notApproved = rows.filter((r) => r.status !== "approved").map((r) => r.content_id);
  if (notApproved.length) {
    issues.push({ level: "warning", message: `status가 approved가 아닌 행 포함: ${notApproved.join(", ")}` });
  }
  return issues;
}
