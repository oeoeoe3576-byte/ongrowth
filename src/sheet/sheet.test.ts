// 시트 스키마 / CSV / 검증 테스트.  npm run test:sheet
import assert from "node:assert/strict";
import fs from "node:fs";
import { COLUMN_NAMES, CANVA_COLUMN_NAMES, PAGE_COUNT, COLUMNS } from "./schema.js";
import { toCsv, parseCsv } from "./csv.js";
import { validateRows, validateCsvBytes, validateCanvaBatch } from "./validate.js";
import { draftToRow, buildGenerationPrompt, AI_OUTPUT_FIELDS } from "./generationSpec.js";

const sample = JSON.parse(fs.readFileSync("data/sheet/sample_input.json", "utf8"));
const baseRow = () => draftToRow(sample.draft, sample.input, sample.meta);
const enc = (s: string) => new TextEncoder().encode(s);
const errorsOf = (issues: { level: string; column?: string; message: string }[]) => issues.filter((i) => i.level === "error");

const tests: [string, () => void][] = [
  ["스키마: 7페이지 × 제목/본문 독립 컬럼 + cta, 헤더 중복 없음", () => {
    assert.equal(new Set(COLUMN_NAMES).size, COLUMN_NAMES.length);
    for (let p = 1; p <= PAGE_COUNT; p++) assert.ok(COLUMNS.filter((c) => c.page === p).length >= 2, `${p}페이지 필드 부족`);
    assert.ok(COLUMN_NAMES.includes("cta"));
    assert.equal(CANVA_COLUMN_NAMES.length, 1 + 2 * PAGE_COUNT + 1);
  }],
  ["샘플 데이터: 검증 에러 없음", () => {
    assert.deepEqual(errorsOf(validateRows([baseRow()])), []);
  }],
  ["CSV 왕복: 한글/쉼표/큰따옴표/캡션 줄바꿈 보존", () => {
    const row = baseRow();
    const parsed = parseCsv(toCsv(COLUMN_NAMES, [row]));
    assert.deepEqual(parsed.header, [...COLUMN_NAMES]);
    assert.deepEqual(parsed.rows[0], row);
  }],
  ["CSV 바이트 검증: 마스터 / Canva 모두 통과", () => {
    const row = baseRow();
    assert.deepEqual(errorsOf(validateCsvBytes(enc(toCsv(COLUMN_NAMES, [row])), "master").issues), []);
    assert.deepEqual(errorsOf(validateCsvBytes(enc(toCsv(CANVA_COLUMN_NAMES, [row])), "canva").issues), []);
  }],
  ["BOM: 감지되고 헤더는 깨지지 않음", () => {
    const r = validateCsvBytes(enc(toCsv(COLUMN_NAMES, [baseRow()], { bom: true })), "master");
    assert.equal(r.hadBom, true);
    assert.deepEqual(errorsOf(r.issues), []);
  }],
  ["UTF-8 아닌 파일(CP949 바이트) 거부", () => {
    const cp949 = new Uint8Array([0x63, 0x6f, 0x6c, 0x0d, 0x0a, 0xc7, 0xd1, 0xb1, 0xdb]); // "col\r\n한글"(CP949)
    assert.match(validateCsvBytes(cp949, "master").issues[0].message, /UTF-8/);
  }],
  ["Canva 필드 줄바꿈 → 에러 (caption 줄바꿈은 허용)", () => {
    const row = { ...baseRow(), page3_body: "첫 줄\n둘째 줄" };
    const errs = errorsOf(validateRows([row]));
    assert.ok(errs.some((e) => e.column === "page3_body" && /줄바꿈/.test(e.message)));
    assert.ok(!errs.some((e) => e.column === "caption"));
  }],
  ["글자 수 초과 → 에러", () => {
    const errs = errorsOf(validateRows([{ ...baseRow(), page2_title: "가".repeat(21) }]));
    assert.ok(errs.some((e) => e.column === "page2_title" && /초과/.test(e.message)));
  }],
  ["수식 시작 문자 / 빈 필수값 / enum / 형식 오류", () => {
    const errs = errorsOf(validateRows([{ ...baseRow(), page4_body: "-대상을 좁히세요", cta: "", status: "done", content_id: "1", created_at: "2026/09/29" }]));
    for (const col of ["page4_body", "cta", "status", "content_id", "created_at"]) {
      assert.ok(errs.some((e) => e.column === col), `${col} 에러 없음`);
    }
  }],
  ["페이지 간 동일 내용 반복 → 에러", () => {
    const row = baseRow();
    const errs = errorsOf(validateRows([{ ...row, page5_body: row.page4_body }]));
    assert.ok(errs.some((e) => e.column === "page5_body" && /동일/.test(e.message)));
  }],
  ["content_id 중복 / 템플릿 혼합 배치 → 에러", () => {
    const a = baseRow();
    assert.ok(errorsOf(validateRows([a, { ...a }])).some((e) => /중복/.test(e.message)));
    assert.equal(errorsOf(validateCanvaBatch([a, { ...a, content_id: "CN-20260929-002", template_key: "travel_7p" }])).length, 1);
  }],
  ["헤더 불일치 → 에러", () => {
    const bad = toCsv([...COLUMN_NAMES.slice(1), "Cover Title"], []);
    assert.ok(errorsOf(validateCsvBytes(enc(bad), "master", { allowEmpty: true }).issues).length >= 2);
  }],
  ["생성 구조: 프롬프트에 모든 출력 필드/규칙 포함, AI 출력 누락 시 예외", () => {
    const { system } = buildGenerationPrompt(sample.input);
    for (const f of AI_OUTPUT_FIELDS) assert.ok(system.includes(`- ${f}:`), f);
    const { cta, ...missing } = sample.draft;
    assert.throws(() => draftToRow(missing, sample.input, sample.meta), /누락: \[cta\]/);
  }],
];

let failed = 0;
for (const [name, fn] of tests) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`✗ ${name}\n  ${(e as Error).message}`);
  }
}
console.log(`\n${tests.length - failed}/${tests.length} passed`);
if (failed) process.exit(1);
