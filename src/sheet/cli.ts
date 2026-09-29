// 카드뉴스 시트 데이터 CLI
//   npm run sheet -- sample                 샘플 입력(data/sheet/sample_input.json) → 행 JSON
//   npm run sheet -- export [rows.json]     행 JSON → 마스터 CSV + Canva용 CSV + 헤더 템플릿
//   npm run sheet -- validate <csv> [--kind master|canva] [--allow-empty]
//   npm run sheet -- prompt                 샘플 입력으로 만든 AI 생성 프롬프트 출력 (LLM 호출 없음)

import { Command } from "commander";
import fs from "node:fs";
import path from "node:path";
import { COLUMN_NAMES, CANVA_COLUMN_NAMES, type CardnewsRow } from "./schema.js";
import { toCsv } from "./csv.js";
import { validateRows, validateCsvBytes, validateCanvaBatch, type Issue } from "./validate.js";
import { buildGenerationPrompt, draftToRow } from "./generationSpec.js";

const DIR = path.resolve("data/sheet");
const SAMPLE_INPUT = path.join(DIR, "sample_input.json");
const ROWS_JSON = path.join(DIR, "cardnews_rows.json");

function printIssues(label: string, issues: Issue[]): boolean {
  const errors = issues.filter((i) => i.level === "error");
  console.log(`\n[${label}] error ${errors.length} / warning ${issues.length - errors.length}`);
  for (const i of issues) {
    const loc = [i.row ? `${i.row}행` : "", i.column ?? ""].filter(Boolean).join(" ");
    console.log(`  ${i.level === "error" ? "✗" : "!"} ${loc ? loc + ": " : ""}${i.message}`);
  }
  return errors.length === 0;
}

function loadSample() {
  return JSON.parse(fs.readFileSync(SAMPLE_INPUT, "utf8"));
}

const program = new Command().name("sheet").description("카드뉴스 시트 데이터 도구");

program.command("sample").action(() => {
  const s = loadSample();
  const row = draftToRow(s.draft, s.input, s.meta);
  const ok = printIssues("row", validateRows([row]));
  fs.writeFileSync(ROWS_JSON, JSON.stringify([row], null, 2) + "\n", "utf8");
  console.log(`→ ${path.relative(process.cwd(), ROWS_JSON)}`);
  if (!ok) process.exitCode = 1;
});

program
  .command("export")
  .argument("[rows]", "행 JSON 파일", ROWS_JSON)
  .option("--bom", "Excel용 BOM 포함 마스터 CSV도 함께 생성")
  .action((rowsPath: string, opts: { bom?: boolean }) => {
    const rows: CardnewsRow[] = JSON.parse(fs.readFileSync(rowsPath, "utf8"));
    if (!printIssues("rows", validateRows(rows))) {
      process.exitCode = 1;
      return;
    }
    const out: string[] = [];
    const write = (name: string, content: string) => {
      const p = path.join(DIR, name);
      fs.writeFileSync(p, content, "utf8");
      out.push(path.relative(process.cwd(), p));
    };

    write("header_template.csv", toCsv(COLUMN_NAMES, []));
    write("cardnews_master.csv", toCsv(COLUMN_NAMES, rows));
    if (opts.bom) write("cardnews_master_excel.csv", toCsv(COLUMN_NAMES, rows, { bom: true }));

    // Canva Bulk Create는 한 번에 템플릿 1개 → brand/template_key 별로 파일 분리
    const groups = new Map<string, CardnewsRow[]>();
    for (const r of rows) {
      const key = `${r.brand}__${r.template_key}`;
      groups.set(key, [...(groups.get(key) ?? []), r]);
    }
    for (const [key, groupRows] of groups) {
      printIssues(`canva ${key}`, validateCanvaBatch(groupRows));
      write(`canva_${key}.csv`, toCsv(CANVA_COLUMN_NAMES, groupRows));
    }
    console.log("\n생성 파일:\n" + out.map((o) => "  " + o).join("\n"));
  });

program
  .command("validate")
  .argument("<csv>")
  .option("--kind <kind>", "master | canva (기본: 파일명이 canva_ 로 시작하면 canva)")
  .option("--allow-empty", "데이터 행 없는 파일 허용 (header_template.csv 검사용)")
  .action((csvPath: string, opts: { kind?: "master" | "canva"; allowEmpty?: boolean }) => {
    const kind = opts.kind ?? (path.basename(csvPath).startsWith("canva_") ? "canva" : "master");
    const report = validateCsvBytes(fs.readFileSync(csvPath), kind, { allowEmpty: opts.allowEmpty });
    console.log(`${csvPath} (${kind}) rows=${report.rowCount} columns=${report.columnCount} bom=${report.hadBom}`);
    if (!printIssues("csv", report.issues)) process.exitCode = 1;
  });

program.command("prompt").action(() => {
  const { system, user } = buildGenerationPrompt(loadSample().input);
  console.log("=== system ===\n" + system + "\n\n=== user ===\n" + user);
});

program.parse();
