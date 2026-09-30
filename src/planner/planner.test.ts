// 기획 엔진 테스트.  npm run test:planner   (API 키 불필요)
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { validatePlan } from "./validatePlan.js";
import { planCardnews, planToRows, extractJson, parseObjective, PlanError } from "./engine.js";
import { ScriptedProvider } from "./provider.js";
import { buildPlannerSystemPrompt } from "./prompt.js";
import { loadStore, writeStore, upsertResult, nextContentId, validateStore } from "./store.js";
import { CONTENT_TYPES, LAYOUTS, IMAGE_TYPES, PAGE_ROLES, type CardnewsPlan, type PlanInput } from "./types.js";

const T = "data/planner/test";
const monthly: CardnewsPlan = JSON.parse(fs.readFileSync(`${T}/response_monthly_plan.json`, "utf8"));
const stay: CardnewsPlan = JSON.parse(fs.readFileSync(`${T}/response_stay_2_fixed.json`, "utf8"));
const monthlyInput: PlanInput = { brand: "ongrowth", topic: "한 달 치 SNS 콘텐츠 한 번에 기획하는 법", objective: "SAVE" };
const stayInput: PlanInput = { brand: "sample_stay", topic: "숲속스테이 11월 평일 연박 할인", objective: "SALES", reference: fs.readFileSync(`${T}/reference_stay_sample.txt`, "utf8") };
const meta = { content_id: "CN-20260930-001", created_at: "2026-09-30 10:00" };

const clone = (p: CardnewsPlan): CardnewsPlan => JSON.parse(JSON.stringify(p));
const errors = (plan: CardnewsPlan, input = monthlyInput) => validatePlan(plan, input).filter((i) => i.level === "error");
const hasError = (plan: CardnewsPlan, re: RegExp, input = monthlyInput) => errors(plan, input).some((e) => re.test(e.message));

const tests: [string, () => void | Promise<void>][] = [
  ["테스트 기획 2건 모두 규칙 통과 (8장 STEP형, 6장 혜택형)", () => {
    assert.deepEqual(errors(monthly), []);
    assert.deepEqual(errors(stay, stayInput), []);
    assert.equal(monthly.pages.length, 8);
    assert.equal(stay.pages.length, 6);
  }],
  ["장수: 7장 고정 아님, 5~12장 허용, 범위 밖/불일치 에러", () => {
    const p = clone(monthly);
    p.pages = p.pages.slice(0, 3).concat(p.pages.slice(-1)).map((x, i) => ({ ...x, page_number: i + 1 }));
    p.page_count = 4;
    assert.ok(hasError(p, /카드 장수 4장/));
    const q = clone(monthly);
    q.page_count = 7;
    assert.ok(hasError(q, /page_count\(7\)/));
  }],
  ["역할: 첫 장 HOOK, 마지막 CTA, CTA 페이지만 cta", () => {
    const p = clone(monthly);
    p.pages[0].page_role = "INFORMATION";
    assert.ok(hasError(p, /첫 페이지 page_role은 HOOK/));
    const q = clone(monthly);
    q.pages[3].cta = "지금 저장";
    assert.ok(hasError(q, /cta는 CTA 페이지에만/));
  }],
  ["레이아웃: HOOK 레이아웃 제한, 한 레이아웃 과다 사용, 연속 반복 경고", () => {
    const p = clone(monthly);
    p.pages[0].layout_type = "TEXT";
    assert.ok(hasError(p, /HOOK 페이지 레이아웃/));
    const q = clone(monthly);
    q.pages.forEach((x, i) => { if (i > 0 && i < 7) { x.layout_type = "TEXT"; x.image_required = false; x.image_type = ""; x.image_prompt = ""; } });
    assert.ok(hasError(q, /TEXT가 6\/8장/));
    assert.ok(validatePlan(q, monthlyInput).some((i) => i.level === "warning" && /연속으로 같은 레이아웃/.test(i.message)));
  }],
  ["레이아웃 ↔ 내용: THREE_COLUMN 3개, BIG_NUMBER 숫자, SCREENSHOT 이미지", () => {
    const p = clone(monthly);
    p.pages[3].items = p.pages[3].items.slice(0, 2);
    assert.ok(hasError(p, /THREE_COLUMN은 items 정확히 3개/));
    const q = clone(monthly);
    q.pages[0].visual_focus = "한 번에";
    assert.ok(hasError(q, /BIG_NUMBER는 숫자/));
    const r = clone(monthly);
    r.pages[5].image_type = "PHOTO";
    assert.ok(hasError(r, /SCREENSHOT 레이아웃은 image_type=SCREENSHOT/));
  }],
  ["visual_focus는 페이지 문구 안에 있어야 함 (숫자 지어내기 방지)", () => {
    const p = clone(monthly);
    p.pages[4].visual_focus = "50개";
    assert.ok(hasError(p, /visual_focus '50개'가 이 페이지 문구 안에 없음/));
  }],
  ["이미지: 전 페이지 이미지 금지, AI_IMAGE는 prompt 필수, false면 빈 값", () => {
    const p = clone(stay);
    p.pages.forEach((x) => { x.image_required = true; x.image_type = x.image_type || "ICON"; });
    assert.ok(hasError(p, /모든 페이지에 이미지/, stayInput));
    const q = clone(stay);
    q.pages[0].image_prompt = "";
    assert.ok(hasError(q, /AI_IMAGE는 image_prompt 필수/, stayInput));
    const r = clone(monthly);
    r.pages[1].image_type = "ICON";
    assert.ok(hasError(r, /image_required=false면/));
  }],
  ["사실 확인: 참고자료 없이 REFERENCE/그래프 불가, REFERENCE는 source 필수", () => {
    assert.ok(hasError(stay, /참고자료가 없는데 fact_check=REFERENCE/, { ...stayInput, reference: undefined }));
    const p = clone(stay);
    p.pages[3].source = "";
    assert.ok(hasError(p, /source 필수/, stayInput));
    const q = clone(monthly);
    q.pages[4].layout_type = "GRAPH";
    q.pages[4].image_required = true;
    q.pages[4].image_type = "CHART";
    assert.ok(hasError(q, /참고자료 없이 그래프/));
  }],
  ["문구: 과장 표현, 페이지 간 반복, 글자 수, 줄바꿈 금지", () => {
    const p = clone(monthly);
    p.pages[1].body = "무조건 이렇게 하세요.";
    assert.ok(hasError(p, /과장\/낚시성 표현 '무조건'/));
    const q = clone(monthly);
    q.pages[6].headline = q.pages[5].headline;
    assert.ok(hasError(q, /headline가 같음/));
    const r = clone(monthly);
    r.pages[1].body = "가".repeat(91);
    assert.ok(hasError(r, /글자 수 초과 \(91\/90\)/));
    const s = clone(monthly);
    s.pages[1].body = "첫 줄\n둘째 줄";
    assert.ok(hasError(s, /줄바꿈 금지/));
  }],
  ["엔진: 오류가 있으면 오류 목록을 AI에게 돌려주고 재시도", async () => {
    const bad = clone(monthly);
    bad.pages[0].layout_type = "TEXT";
    const provider = new ScriptedProvider(["```json\n" + JSON.stringify(bad) + "\n```", JSON.stringify(monthly)]);
    const r = await planCardnews(monthlyInput, provider, meta);
    assert.equal(r.attempts, 2);
    const repair = provider.calls[1].turns.at(-1)!.content;
    assert.match(repair, /HOOK 페이지 레이아웃/);
    assert.equal(provider.calls[1].turns.at(-2)!.role, "assistant");
  }],
  ["엔진: 끝까지 실패하면 PlanError (저장하지 않음)", async () => {
    await assert.rejects(planCardnews(monthlyInput, new ScriptedProvider(["JSON 아님"]), meta, { maxAttempts: 2 }), PlanError);
  }],
  ["MASTER/PAGES 변환: content_id 연결, items 구분자, 참고자료 기획은 status 유지", () => {
    const { master, pages } = planToRows(monthly, monthlyInput, meta);
    assert.equal(master.page_count, "8");
    assert.equal(master.content_type, "STEP");
    assert.equal(master.category, "marketing");
    assert.ok(pages.every((p) => p.content_id === meta.content_id));
    assert.deepEqual(pages.map((p) => p.page_number), ["1", "2", "3", "4", "5", "6", "7", "8"]);
    assert.equal(pages[2].items.split(" | ").length, 4);
    assert.equal(pages[5].image_required, "TRUE");
    const needs = clone(monthly);
    needs.pages[1].fact_check = "NEEDS_CHECK";
    assert.equal(planToRows(needs, monthlyInput, meta).master.status, "review");
  }],
  ["저장소: CSV 왕복, ID 증가, 교체(upsert), 연결 오류 감지", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "planner-"));
    let store = { master: [], pages: [] } as ReturnType<typeof loadStore>;
    const a = planToRows(monthly, monthlyInput, meta);
    store = upsertResult(store, { plan: monthly, ...a, warnings: [], attempts: 1, provider: "t" });
    assert.equal(nextContentId(store, "2026-09-30"), "CN-20260930-002");
    const b = planToRows(stay, stayInput, { ...meta, content_id: "CN-20260930-002" });
    store = upsertResult(store, { plan: stay, ...b, warnings: [], attempts: 1, provider: "t" });
    store = upsertResult(store, { plan: stay, ...b, warnings: [], attempts: 1, provider: "t" }); // 같은 ID 재기획
    writeStore(store, dir);
    const loaded = loadStore(dir);
    assert.equal(loaded.master.length, 2);
    assert.equal(loaded.pages.length, 14);
    assert.deepEqual(validateStore(loaded), []);
    assert.equal(loaded.pages.find((p) => p.content_id === "CN-20260930-002" && p.page_number === "1")!.headline, "평일에 2박 하면 20% 할인");
    loaded.pages.pop();
    assert.ok(validateStore(loaded).some((e) => /page_count=6인데 PAGES에 5행/.test(e)));
    loaded.pages.push({ ...loaded.pages[0], content_id: "CN-20260930-999" });
    assert.ok(validateStore(loaded).some((e) => /MASTER에 없는 content_id/.test(e)));
  }],
  ["입력/프롬프트: 한글 목적 입력, 코드블록 JSON 추출, 프롬프트에 모든 허용 값 포함", () => {
    assert.equal(parseObjective("저장유도"), "SAVE");
    assert.equal(parseObjective("sales"), "SALES");
    assert.throws(() => parseObjective("홍보"), /알 수 없음/);
    assert.deepEqual(extractJson('설명\n```json\n{"a":1}\n```'), { a: 1 });
    const sys = buildPlannerSystemPrompt();
    for (const k of [...Object.keys(CONTENT_TYPES), ...Object.keys(LAYOUTS), ...Object.keys(PAGE_ROLES), ...IMAGE_TYPES]) assert.ok(sys.includes(k), k);
  }],
];

let failed = 0;
for (const [name, fn] of tests) {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`✗ ${name}\n  ${(e as Error).message}`);
  }
}
console.log(`\n${tests.length - failed}/${tests.length} passed`);
if (failed) process.exit(1);
