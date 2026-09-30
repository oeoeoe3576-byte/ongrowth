// 카드뉴스 디자인 렌더링 CLI
//   npm run design -- render [content_id…]   PNG(1080x1350) + 미리보기 HTML. id를 안 주면 전체
//   npm run design -- preview [content_id…]  미리보기 HTML만 (PNG 없이, 빠름)
//   npm run design -- layouts                 구현된 레이아웃 목록
//   npm run design -- compare [content_id…] [--themes default,insight,life,campaign] [--png]   테마 비교 화면

import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import { loadStore } from "../planner/store.js";
import { renderContent, type RenderedContent } from "./renderHtml.js";
import { renderPngs, RENDER_DIR } from "./renderPng.js";
import { buildPreviewHtml } from "./preview.js";
import { LAYOUT_COMPONENTS } from "./layouts/index.js";
import { buildCompareHtml } from "./compare.js";

function loadContents(ids: string[], theme?: string): RenderedContent[] {
  const store = loadStore();
  const masters = ids.length ? ids.map((id) => {
    const m = store.master.find((x) => x.content_id === id);
    if (!m) throw new Error(`MASTER에 ${id} 없음`);
    return m;
  }) : store.master;
  if (!masters.length) throw new Error("렌더링할 카드뉴스가 없음 (data/planner/master.csv)");
  return masters.map((m) => renderContent(m, store.pages, theme));
}

function writePreview(contents: RenderedContent[]): string {
  fs.mkdirSync(RENDER_DIR, { recursive: true });
  const file = path.join(RENDER_DIR, "preview.html");
  fs.writeFileSync(file, buildPreviewHtml(contents), "utf8");
  return path.relative(process.cwd(), file);
}

const program = new Command().name("design").description("카드뉴스 디자인 렌더링");

program
  .command("render")
  .argument("[ids...]")
  .option("--theme <name>", "테마 강제 지정 (기본: MASTER category로 선택, 없으면 default)")
  .action(async (ids: string[], o: { theme?: string }) => {
    const contents = loadContents(ids, o.theme);
    let errors = 0;
    for (const c of contents) {
      const results = await renderPngs(c);
      console.log(`\n${c.master.content_id} · ${c.master.topic} (${results.length}장, 테마 ${c.theme.name}${c.themeFallback ? " - 전용 테마 없음" : ""})`);
      for (const r of results) {
        const e = r.checks.filter((x) => x.level === "error");
        const w = r.checks.filter((x) => x.level === "warning");
        const size = r.width === 1080 && r.height === 1350 ? "1080x1350" : `✗ ${r.width}x${r.height}`;
        console.log(`  ${String(r.page).padStart(2, "0")} ${r.layout.padEnd(13)} ${size}  ${e.length ? `✗ 오류 ${e.length}` : "✓"}${w.length ? ` · 경고 ${w.length}` : ""}`);
        for (const x of [...e, ...w]) console.log(`       ${x.level === "error" ? "✗" : "!"} ${x.field}: ${x.message}`);
        errors += e.length + (size.startsWith("✗") ? 1 : 0);
      }
      console.log(`  → cardnews_output/rendered/${c.master.content_id}/`);
    }
    console.log(`\n미리보기: ${writePreview(contents)}`);
    if (errors) process.exitCode = 1;
  });

program
  .command("preview")
  .argument("[ids...]")
  .option("--theme <name>")
  .action((ids: string[], o: { theme?: string }) => {
    console.log(`미리보기: ${writePreview(loadContents(ids, o.theme))}`);
  });

program
  .command("compare")
  .argument("[ids...]")
  .option("--themes <list>", "비교할 테마 (쉼표 구분)", "default,insight,life,campaign")
  .option("--png", "테마별 PNG도 저장 (cardnews_output/rendered/compare/<테마>/<id>/)")
  .action(async (ids: string[], o: { themes: string; png?: boolean }) => {
    const themes = o.themes.split(",").map((s) => s.trim()).filter(Boolean);
    const store = loadStore();
    const targets = ids.length ? ids : [store.master[store.master.length - 1]?.content_id].filter(Boolean) as string[];
    const rows = targets.map((id) => themes.map((t) => loadContents([id], t)[0]));
    for (const group of rows) for (const c of group) {
      if (c.themeFallback) console.log(`! 테마 '${c.theme.name}'를 찾지 못해 기본 테마로 그림`);
      if (o.png) {
        const res = await renderPngs(c, path.join(RENDER_DIR, "compare", c.theme.name, c.master.content_id));
        const errs = res.flatMap((r) => r.checks.filter((x) => x.level === "error").map((x) => `p${r.page} ${x.field}: ${x.message}`));
        console.log(`${c.master.content_id} [${c.theme.name}] ${res.length}장${errs.length ? ` ✗ ${errs.join(" / ")}` : " ✓"}`);
      }
    }
    fs.mkdirSync(RENDER_DIR, { recursive: true });
    const file = path.join(RENDER_DIR, "compare.html");
    fs.writeFileSync(file, buildCompareHtml(rows), "utf8");
    console.log(`비교 화면: ${path.relative(process.cwd(), file)}`);
  });

program.command("layouts").action(() => {
  for (const c of Object.values(LAYOUT_COMPONENTS)) console.log(`${c.name.padEnd(13)} ${c.label}`);
});

program.parseAsync().catch((e) => {
  console.error((e as Error).message);
  process.exitCode = 1;
});
