// 기획 엔진: 입력 → AI 기획(JSON) → 검증 → (오류 시 AI에게 수정 요청, 최대 N회) → MASTER/PAGES 행

import { buildPlannerSystemPrompt, buildPlannerUserPrompt, buildRepairPrompt } from "./prompt.js";
import { validatePlan, formatIssues, type PlanIssue } from "./validatePlan.js";
import { OBJECTIVES, ITEM_SEPARATOR, type CardnewsPlan, type PlanInput, type MasterRow, type PageRow, type Objective } from "./types.js";
import type { PlanProvider, Turn } from "./provider.js";

export interface PlanResult {
  plan: CardnewsPlan;
  master: MasterRow;
  pages: PageRow[];
  warnings: PlanIssue[];
  attempts: number;
  provider: string;
}

export class PlanError extends Error {
  constructor(message: string, readonly issues: PlanIssue[], readonly lastResponse: string) {
    super(message);
  }
}

/** AI 응답에서 JSON 객체만 꺼낸다 (코드블록/앞뒤 설명이 섞여도 처리) */
export function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("응답에서 JSON 객체를 찾지 못함");
  return JSON.parse(text.slice(start, end + 1));
}

/** '정보전달' 같은 한글 입력도 받는다 */
export function parseObjective(v: string): Objective {
  const up = v.trim().toUpperCase();
  if (up in OBJECTIVES) return up as Objective;
  const found = (Object.entries(OBJECTIVES) as [Objective, string][]).find(([, ko]) => ko === v.trim());
  if (!found) throw new Error(`콘텐츠 목적 '${v}'을 알 수 없음. 가능: ${Object.entries(OBJECTIVES).map(([k, ko]) => `${k}(${ko})`).join(", ")}`);
  return found[0];
}

export async function planCardnews(
  input: PlanInput,
  provider: PlanProvider,
  meta: { content_id: string; created_at: string },
  opts: { maxAttempts?: number; log?: (msg: string) => void } = {},
): Promise<PlanResult> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const log = opts.log ?? (() => {});
  const system = buildPlannerSystemPrompt();
  const turns: Turn[] = [{ role: "user", content: buildPlannerUserPrompt(input) }];
  let lastIssues: PlanIssue[] = [];
  let lastText = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    lastText = await provider.complete(system, turns);
    let plan: CardnewsPlan;
    try {
      plan = extractJson(lastText) as CardnewsPlan;
      lastIssues = validatePlan(plan, input);
    } catch (e) {
      lastIssues = [{ level: "error", message: `JSON 파싱 실패: ${(e as Error).message}` }];
      plan = undefined as unknown as CardnewsPlan;
    }
    const errors = lastIssues.filter((i) => i.level === "error");
    log(`[attempt ${attempt}] error ${errors.length}, warning ${lastIssues.length - errors.length}`);
    if (errors.length === 0) {
      const { master, pages } = planToRows(plan, input, meta);
      return { plan, master, pages, warnings: lastIssues, attempts: attempt, provider: provider.name };
    }
    turns.push({ role: "assistant", content: lastText });
    turns.push({ role: "user", content: buildRepairPrompt(formatIssues(errors)) });
  }
  throw new PlanError(`${maxAttempts}번 시도했지만 규칙을 통과하지 못함\n${formatIssues(lastIssues)}`, lastIssues, lastText);
}

export function planToRows(plan: CardnewsPlan, input: PlanInput, meta: { content_id: string; created_at: string }): { master: MasterRow; pages: PageRow[] } {
  const needsCheck = plan.pages.some((p) => p.fact_check === "NEEDS_CHECK");
  const master: MasterRow = {
    content_id: meta.content_id,
    brand: input.brand,
    topic: input.topic,
    category: input.category || plan.category.trim(),
    objective: input.objective,
    content_type: plan.content_type,
    target: input.target || plan.target.trim(),
    // 사실 확인이 필요한 페이지가 있으면 바로 검수 단계로
    status: needsCheck ? "review" : "draft",
    page_count: String(plan.pages.length),
    caption: plan.caption.trim(),
    hashtags: plan.hashtags.trim(),
    created_at: meta.created_at,
  };
  const pages: PageRow[] = plan.pages.map((p) => ({
    content_id: meta.content_id,
    page_number: String(p.page_number),
    page_role: p.page_role,
    layout_type: p.layout_type,
    headline: p.headline.trim(),
    subheadline: p.subheadline.trim(),
    body: p.body.trim(),
    visual_focus: p.visual_focus.trim(),
    items: p.items.map((s) => s.trim()).join(ITEM_SEPARATOR),
    image_required: p.image_required ? "TRUE" : "FALSE",
    image_type: p.image_type,
    image_source: p.image_source.trim(),
    image_prompt: p.image_prompt.trim(),
    cta: p.cta.trim(),
    source: p.source.trim(),
    fact_check: p.fact_check,
  }));
  return { master, pages };
}
