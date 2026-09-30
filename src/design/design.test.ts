// 디자인 렌더링 테스트.  npm run test:design   (Chromium 사용)
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { LAYOUT_COMPONENTS, resolveLayout } from "./layouts/index.js";
import { renderContent } from "./renderHtml.js";
import { renderPngs, launchBrowser } from "./renderPng.js";
import { buildPreviewHtml } from "./preview.js";
import { staticChecks, SPLIT_MESSAGE } from "./checks.js";
import { resolveTheme, extendTheme } from "./themes/index.js";
import { defaultTheme } from "./themes/default.js";
import { themeToCssVars } from "./tokens.js";
import { splitNumber, highlight } from "./parts.js";
import { loadStore } from "../planner/store.js";
import { LAYOUTS, type MasterRow, type PageRow } from "../planner/types.js";

const store = loadStore();
const master = (id: string) => store.master.find((m) => m.content_id === id)!;
const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "design-"));

function fakeContent(pages: Partial<PageRow>[]): { m: MasterRow; rows: PageRow[] } {
  const m: MasterRow = { ...master("CN-20260930-001"), content_id: "CN-20990101-001", page_count: String(pages.length) };
  const base: PageRow = { content_id: m.content_id, page_number: "1", page_role: "INFORMATION", layout_type: "TEXT", headline: "제목", subheadline: "", body: "", visual_focus: "", items: "", image_required: "FALSE", image_type: "", image_source: "", image_prompt: "", cta: "", source: "", fact_check: "NOT_REQUIRED" };
  return { m, rows: pages.map((p, i) => ({ ...base, page_number: String(i + 1), ...p })) };
}

const tests: [string, () => void | Promise<void>][] = [
  ["2단계의 layout_type 15개 모두 전용 컴포넌트가 있음", () => {
    assert.deepEqual(Object.keys(LAYOUT_COMPONENTS).sort(), Object.keys(LAYOUTS).sort());
    for (const [k, c] of Object.entries(LAYOUT_COMPONENTS)) assert.equal(c.name, k);
  }],
  ["모르는 layout_type은 TEXT로 대신 그리고 경고", () => {
    const r = resolveLayout("POSTER");
    assert.equal(r.fallback, true);
    assert.equal(r.component.name, "TEXT");
    const { m, rows } = fakeContent([{ layout_type: "POSTER" }]);
    const c = renderContent(m, rows);
    assert.ok(c.cards[0].checks.some((x) => /알 수 없는 layout_type/.test(x.message)));
  }],
  ["레이아웃 CSS에 색을 직접 쓰지 않음 (토큰만 사용)", () => {
    for (const c of Object.values(LAYOUT_COMPONENTS)) {
      const hex = (c.css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).filter((h) => h.toLowerCase() !== "#fff");
      assert.deepEqual(hex, [], `${c.name}: ${hex.join(",")}`);
    }
    const vars = themeToCssVars(defaultTheme);
    for (const v of ["--c-bg", "--c-accent", "--fs-focus", "--fs-headline", "--sp-page", "--sp-item", "--r-box", "--shadow-box"]) assert.ok(vars.includes(v), v);
  }],
  ["테마: 전용 테마가 없으면 default, extendTheme로 확장 가능", () => {
    assert.equal(resolveTheme("marketing").theme.name, "default");
    assert.equal(resolveTheme("stay").theme.name, "life");
    assert.equal(resolveTheme("beauty").fallback, true);
    for (const t of ["insight", "life", "campaign", "ongrowth"]) assert.equal(resolveTheme(t).theme.name, t);
    const beauty = extendTheme(defaultTheme, { name: "beauty", color: { accent: "#C2185B" } });
    assert.equal(beauty.color.accent, "#C2185B");
    assert.equal(beauty.color.background, defaultTheme.color.background);
    assert.equal(defaultTheme.color.accent, "#2F54EB");
  }],
  ["텍스트는 HTML로 이스케이프, visual_focus 강조, 숫자/단위 분리", () => {
    const { m, rows } = fakeContent([{ headline: "<script>alert(1)</script> 3단계", visual_focus: "3단계" }]);
    const html = renderContent(m, rows).cards[0].html;
    assert.ok(!html.includes("<script>"));
    assert.ok(html.includes('<em class="cn-hl">3단계</em>'));
    assert.deepEqual(splitNumber("140만원"), { pre: "", num: "140", unit: "만원" });
    assert.deepEqual(splitNumber("01"), { pre: "", num: "01", unit: "" });
    assert.equal(highlight("없음", "x"), "없음");
  }],
  ["정적 검수: 권장 길이 초과 / items 과다 → 경고 + 분리 권장", () => {
    const c = LAYOUT_COMPONENTS.NUMBER_LIST;
    const { m, rows } = fakeContent([{ layout_type: "NUMBER_LIST", headline: "가".repeat(30), items: Array.from({ length: 8 }, (_, i) => `항목 ${i + 1}`).join(" | ") }]);
    const checks = staticChecks(renderContent(m, rows).cards[0].page, c, false);
    assert.ok(checks.some((x) => /headline 권장 길이 초과 \(30\/20자\)/.test(x.message)));
    assert.ok(checks.some((x) => /items가 너무 많음 \(8\/5개\)/.test(x.message)));
    assert.ok(checks.some((x) => x.message === SPLIT_MESSAGE));
  }],
  ["테스트 카드뉴스 4세트 = 27장, 15개 레이아웃 모두 사용, MASTER-PAGES 연결", () => {
    const ids = ["CN-20260930-001", "CN-20260930-002", "CN-20260930-003", "CN-20261001-001"];
    const all = ids.map((id) => renderContent(master(id), store.pages));
    assert.deepEqual(all.map((c) => c.cards.length), [8, 6, 7, 6]);
    const used = new Set(all.flatMap((c) => c.cards.map((k) => k.component)));
    assert.equal(used.size, 15);
    assert.ok(new Set(all[2].cards.map((k) => k.component)).size >= 5);
    all.forEach((c) => c.cards.forEach((k, i) => assert.equal(k.page.number, i + 1)));
  }],
  ["미리보기 HTML: 전체 카드 + 데이터 + 측정 스크립트, 한글 그대로", () => {
    const html = buildPreviewHtml([renderContent(master("CN-20260930-003"), store.pages)]);
    assert.equal((html.match(/<article class="cn-card /g) ?? []).length, 7);
    assert.ok(html.includes("function cnMeasure"));
    assert.ok(html.includes("문의가 12건에서"));
    assert.ok(html.includes('name="viewport"'));
    assert.ok(!/<\/script>[^]*<\/script>[^]*<\/script>/.test(html.split("var DATA")[1] ?? ""), "DATA 안에 </script>가 섞이지 않음");
  }],
  ["**강조**: 강조 태그로 바뀌고, 글자 수에서 ** 는 빠짐", () => {
    const { m, rows } = fakeContent([{ headline: "첫 장에서 **얻는 것**을 보여주세요", body: "짝이 **맞는** 강조와 visual 3단계", visual_focus: "3단계" }]);
    const c = renderContent(m, rows).cards[0];
    assert.ok(c.html.includes('<strong class="cn-em">얻는 것</strong>'));
    assert.ok(c.html.includes('<em class="cn-hl">3단계</em>'));
    assert.ok(!c.html.includes("**"));
    const long = fakeContent([{ headline: "**" + "가".repeat(20) + "**" }]);
    assert.ok(!renderContent(long.m, long.rows).cards[0].checks.some((x) => /headline 권장 길이 초과/.test(x.message)));
  }],
  ["PHOTO_COVER: 로컬 사진은 data URL로 들어가고, 사진이 없으면 자리 표시", () => {
    const withPhoto = fakeContent([{ page_role: "HOOK", layout_type: "PHOTO_COVER", image_required: "TRUE", image_type: "PHOTO", image_source: "data/planner/test/images/sample-cover.jpg" }]);
    assert.ok(renderContent(withPhoto.m, withPhoto.rows).cards[0].html.includes('src="data:image/jpeg;base64,'));
    const noPhoto = fakeContent([{ page_role: "HOOK", layout_type: "PHOTO_COVER", image_required: "TRUE", image_type: "PHOTO", image_source: "data/없는파일.jpg" }]);
    assert.ok(renderContent(noPhoto.m, noPhoto.rows).cards[0].html.includes("사진 자리"));
  }],
  ["FOLLOW: 브랜드 프로필 표시, 숫자는 설정에 있을 때만", () => {
    const { m, rows } = fakeContent([{ page_role: "CTA", layout_type: "FOLLOW", cta: "팔로우하기" }]);
    const html = renderContent({ ...m, brand: "ongrowth" }, rows).cards[0].html;
    assert.ok(html.includes("@ongrowth"));
    assert.ok(html.includes("팔로우"));
    assert.ok(!html.includes('class="cn-stats"'), "stats가 없으면 게시물/팔로워 숫자를 표시하지 않음");
  }],
  ["테마 4종 × 체험 원고: 모두 1080x1350, overflow 없음", async () => {
    for (const t of ["default", "insight", "life", "campaign", "ongrowth"]) {
      const res = await renderPngs(renderContent(master("CN-20261001-001"), store.pages, t), tmpDir());
      assert.equal(res.length, 6);
      for (const r of res) {
        assert.deepEqual([r.width, r.height], [1080, 1350]);
        assert.deepEqual(r.checks.filter((x) => x.level === "error"), [], `${t} p${r.page}`);
      }
    }
  }],
  ["계정 설정: ongrowth는 본문 ongrowth + 첫/마지막 장 insight, --theme를 주면 한 가지로", () => {
    const c = renderContent(master("CN-20261001-001"), store.pages);
    assert.deepEqual(c.cards.map((k) => k.theme.name), ["insight", "ongrowth", "ongrowth", "ongrowth", "ongrowth", "insight"]);
    assert.equal(c.designLabel, "ongrowth + 표지·마무리 insight");
    assert.ok(c.cards[1].html.includes("cn-theme-ongrowth"));
    const forced = renderContent(master("CN-20261001-001"), store.pages, "life");
    assert.ok(forced.cards.every((k) => k.theme.name === "life"));
  }],
  ["실제 렌더링: 1080x1350 PNG, 한글 폰트 로드, 테스트 세트 overflow 없음", async () => {
    const dir = tmpDir();
    const res = await renderPngs(renderContent(master("CN-20260930-003"), store.pages), dir);
    assert.equal(res.length, 7);
    for (const r of res) {
      assert.deepEqual([r.width, r.height], [1080, 1350]);
      assert.deepEqual(r.checks.filter((x) => x.level === "error" || x.field === "font"), [], `p${r.page}`);
      assert.ok(fs.statSync(path.join(dir, r.file)).size > 10_000);
    }
    assert.ok(fs.existsSync(path.join(dir, "report.json")));
  }],
  ["실제 렌더링: 너무 긴 원고는 카드 밖으로 나가지 않고 overflow 오류로 잡힘", async () => {
    const long = "주제를 미리 정해두면 올리는 날이 일정해지고 급하게 만든 게시물이 줄어듭니다. ".repeat(6);
    const { m, rows } = fakeContent([
      { layout_type: "TEXT", headline: "짧은 제목", body: long },
      { layout_type: "BIG_NUMBER", headline: "숫자", visual_focus: "1,000,000,000원" },
      { layout_type: "NUMBER_LIST", headline: "목록", items: Array.from({ length: 9 }, (_, i) => `꽤 길게 쓴 체크리스트 항목 번호 ${i + 1}`).join(" | ") },
    ]);
    const res = await renderPngs(renderContent(m, rows), tmpDir());
    assert.ok(res[0].checks.some((x) => x.level === "error" && x.field === "body"), JSON.stringify(res[0].checks));
    assert.ok(res[1].checks.some((x) => x.level === "error" && x.field === "visual_focus"));
    assert.ok(res[2].checks.some((x) => x.level === "error"));
    assert.ok(res.every((r) => r.width === 1080 && r.height === 1350));
  }],
  ["미리보기 화면: 브라우저에서 오류 없이 열리고 카드 선택/전체 보기/모바일 동작", async () => {
    const dir = tmpDir();
    const file = path.join(dir, "preview.html");
    fs.writeFileSync(file, buildPreviewHtml(["CN-20260930-001", "CN-20260930-003"].map((id) => renderContent(master(id), store.pages))));
    const browser = await launchBrowser();
    try {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto("file://" + file);
      await page.waitForSelector("body[data-ready]");
      assert.equal(await page.locator("#list .item").count(), 8);
      await page.locator("#list .item").nth(4).click();
      assert.equal(await page.locator("#stage .cn-card").getAttribute("data-page"), "5");
      assert.match(await page.locator("#panel").innerText(), /BIG_NUMBER/);
      const ratio = await page.locator("#stage").evaluate((el) => el.clientWidth / el.clientHeight);
      assert.ok(Math.abs(ratio - 0.8) < 0.01, `stage 비율 ${ratio}`);
      await page.keyboard.press("ArrowRight");
      assert.equal(await page.locator("#stage .cn-card").getAttribute("data-page"), "6");
      await page.click("#btn-overview");
      assert.equal(await page.locator("#grid figure").count(), 8);
      await page.selectOption("#content", "1");
      assert.equal(await page.locator("#grid figure").count(), 7);
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(await page.evaluate("document.documentElement.scrollWidth"), 390, "모바일 가로 스크롤 없음");
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
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
