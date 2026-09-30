// 카드뉴스 기획 엔진 CLI
//   npm run planner -- plan --brand <b> --topic <t> --objective <정보전달|SAVE…> [--reference <file>] [--category c] [--target t]
//                           [--response <file…>]   AI 대신 미리 준비한 응답 파일 사용 (API 키 없이 재현/테스트)
//   npm run planner -- validate                    master.csv / pages.csv 무결성 검사
//   npm run planner -- prompt                      시스템 프롬프트 출력
//   npm run planner -- show <content_id>           한 세트를 페이지별로 보기

import "dotenv/config";
import fs from "node:fs";
import { Command } from "commander";
import { DateTime } from "luxon";
import { planCardnews, parseObjective, PlanError } from "./engine.js";
import { AnthropicProvider, FileProvider, type PlanProvider } from "./provider.js";
import { buildPlannerSystemPrompt } from "./prompt.js";
import { formatIssues } from "./validatePlan.js";
import { loadStore, writeStore, upsertResult, nextContentId, savePlanJson, validateStore } from "./store.js";
import type { PlanInput } from "./types.js";

const program = new Command().name("planner").description("카드뉴스 기획 엔진");

program
  .command("plan")
  .requiredOption("--brand <brand>")
  .requiredOption("--topic <topic>")
  .requiredOption("--objective <objective>")
  .option("--reference <file>", "참고자료 텍스트 파일")
  .option("--category <category>")
  .option("--target <target>")
  .option("--id <content_id>", "기존 content_id를 다시 기획 (교체)")
  .option("--max-pages <n>", "최대 장수 (인스타그램 캐러셀은 10)")
  .option("--response <files...>", "AI 응답 파일 (지정하면 API를 부르지 않음)")
  .action(async (o) => {
    const input: PlanInput = {
      brand: o.brand,
      topic: o.topic,
      objective: parseObjective(o.objective),
      reference: o.reference ? fs.readFileSync(o.reference, "utf8") : undefined,
      category: o.category,
      target: o.target,
      maxPages: o.maxPages ? Number(o.maxPages) : undefined,
    };
    let provider: PlanProvider;
    if (o.response) provider = new FileProvider(o.response);
    else if (process.env.ANTHROPIC_API_KEY) provider = new AnthropicProvider();
    else {
      console.error("ANTHROPIC_API_KEY가 없음. 키를 설정하거나 --response 로 응답 파일을 지정하세요.");
      process.exitCode = 1;
      return;
    }

    const store = loadStore();
    const now = DateTime.now().setZone("Asia/Seoul");
    const meta = { content_id: o.id ?? nextContentId(store, now.toISODate()!), created_at: now.toFormat("yyyy-MM-dd HH:mm") };
    console.log(`${meta.content_id} 기획 중 (${provider.name})`);
    try {
      const r = await planCardnews(input, provider, meta, { log: console.log });
      const next = upsertResult(store, r);
      const errors = validateStore(next);
      if (errors.length) throw new Error("시트 무결성 오류:\n" + errors.join("\n"));
      writeStore(next);
      const planFile = savePlanJson(r);
      console.log(`✓ ${r.master.content_id}: ${r.plan.content_type}, ${r.pages.length}장, 시도 ${r.attempts}회`);
      if (r.warnings.length) console.log("경고:\n" + formatIssues(r.warnings));
      console.log(`저장: data/planner/master.csv, data/planner/pages.csv, ${planFile}`);
    } catch (e) {
      console.error(e instanceof PlanError ? e.message : `실패: ${(e as Error).message}`);
      process.exitCode = 1;
    }
  });

program.command("validate").action(() => {
  const store = loadStore();
  const errors = validateStore(store);
  console.log(`MASTER ${store.master.length}행, PAGES ${store.pages.length}행`);
  if (errors.length) {
    console.log(errors.map((e) => "✗ " + e).join("\n"));
    process.exitCode = 1;
  } else console.log("✓ 무결성 오류 없음");
});

program.command("prompt").action(() => console.log(buildPlannerSystemPrompt()));

program
  .command("show")
  .argument("<content_id>")
  .action((id: string) => {
    const store = loadStore();
    const m = store.master.find((x) => x.content_id === id);
    if (!m) {
      console.error(`${id} 없음`);
      process.exitCode = 1;
      return;
    }
    console.log(`${m.content_id} | ${m.brand} | ${m.topic} | ${m.objective} | ${m.content_type} | ${m.page_count}장 | ${m.status}`);
    for (const p of store.pages.filter((x) => x.content_id === id)) {
      console.log(`\n[${p.page_number}] ${p.page_role} / ${p.layout_type}${p.image_required === "TRUE" ? ` / 이미지:${p.image_type}` : ""} / ${p.fact_check}`);
      console.log(`  headline: ${p.headline}`);
      if (p.subheadline) console.log(`  sub: ${p.subheadline}`);
      if (p.body) console.log(`  body: ${p.body}`);
      if (p.items) console.log(`  items: ${p.items}`);
      if (p.visual_focus) console.log(`  visual_focus: ${p.visual_focus}`);
      if (p.image_prompt) console.log(`  image_prompt: ${p.image_prompt}`);
      if (p.cta) console.log(`  cta: ${p.cta}`);
    }
  });

program.parseAsync();
