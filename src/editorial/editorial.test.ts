// 콘텐츠 캘린더 테스트.  npm run test:editorial
import assert from "node:assert/strict";
import { channelFor, pickTopic, recentTopics, type Calendar } from "./calendar.js";
import { validatePlan } from "../planner/validatePlan.js";
import fs from "node:fs";
import { buildCaption } from "./instagram.js";
import { graphBaseFor } from "../publishers/instagram/instagramClient.js";

const base = (): Calendar => ({
  brand: "t", category: "marketing", objective: "SAVE", target: "t", maxPages: 10, reviewTime: "09:00", publishTime: "18:30", timezone: "Asia/Seoul",
  channels: { blog: "블로그", instagram: "인스타", threads: "스레드" },
  weekly: { mon: "blog", tue: "blog", wed: ["instagram", "threads"], thu: "blog", fri: "blog" },
  rules: [],
  backlog: [
    { id: "B01", channel: "blog", topic: "블로그1", angle: "", status: "todo" },
    { id: "B02", channel: "blog", topic: "블로그2", angle: "", status: "todo" },
    { id: "I01", channel: "instagram", topic: "인스타1", angle: "", status: "todo" },
  ],
});

const tests: [string, () => void][] = [
  ["인스타 발행: 캡션 + 해시태그(최대 30개), 토큰 종류별 API 주소", () => {
    assert.equal(buildCaption(" 본문 ", "#a #b 잡음"), "본문\n\n#a #b");
    const many = Array.from({ length: 35 }, (_, i) => `#t${i}`).join(" ");
    assert.equal(buildCaption("x", many).split("#").length - 1, 30);
    assert.throws(() => buildCaption("가".repeat(2300), ""));
    assert.equal(graphBaseFor("IGAAxyz"), "https://graph.instagram.com");
    assert.equal(graphBaseFor("EAAxyz"), "https://graph.facebook.com");
  }],
  ["요일 → 채널: 평일만, 수요일은 인스타/스레드 격주, 주말은 쉬는 날", () => {
    const c = base();
    assert.equal(channelFor(c, "2026-10-01"), "blog"); // 목
    const w1 = channelFor(c, "2026-10-07"); // 수
    const w2 = channelFor(c, "2026-10-14"); // 다음 주 수
    assert.deepEqual([w1, w2].sort(), ["instagram", "threads"]);
    assert.equal(channelFor(c, "2026-10-03"), null); // 토
    assert.equal(pickTopic(c, "2026-10-04").dayOff, true); // 일
  }],
  ["오늘 주제: 요일 채널 우선, 이미 맡은 주제가 있으면 같은 것 (여러 번 실행해도 동일)", () => {
    const c = base();
    const wedChannel = channelFor(c, "2026-10-07");
    assert.equal(pickTopic(c, "2026-10-07").topic?.channel, wedChannel === "instagram" ? "instagram" : "blog");
    c.backlog[0].date = "2026-10-01";
    c.backlog[0].status = "reserved";
    assert.equal(pickTopic(c, "2026-10-01").topic?.id, "B01");
    assert.equal(pickTopic(c, "2026-10-01").topic?.id, "B01");
  }],
  ["요일 채널 주제가 없으면 다른 채널로 대체, 전부 없으면 null", () => {
    const c = base();
    const threadsWed = channelFor(c, "2026-10-07") === "threads" ? "2026-10-07" : "2026-10-14";
    const r = pickTopic(c, threadsWed); // 스레드 차례인데 스레드 주제 없음
    assert.equal(r.fallback, true);
    assert.equal(r.topic?.channel, "blog");
    c.backlog.forEach((t) => (t.status = "published"));
    assert.equal(pickTopic(c, "2026-10-05").topic, null);
  }],
  ["최근 14일 주제 목록 (오늘·건너뛴 주제 제외)", () => {
    const c = base();
    c.backlog[0].date = "2026-09-25"; c.backlog[0].status = "published";
    c.backlog[1].date = "2026-09-01"; c.backlog[1].status = "published";
    c.backlog[2].date = "2026-10-01"; c.backlog[2].status = "reserved";
    assert.deepEqual(recentTopics(c, "2026-10-01").map((t) => t.id), ["B01"]);
  }],
  ["기획 장수 제한: maxPages 10이면 11장은 오류", () => {
    const plan = JSON.parse(fs.readFileSync("data/editorial/responses/2026-10-01-B01.json", "utf8"));
    const input = { brand: "ongrowth", topic: "t", objective: "SAVE" as const, maxPages: 10 };
    assert.deepEqual(validatePlan(plan, input).filter((i) => i.level === "error"), []);
    const big = JSON.parse(JSON.stringify(plan));
    while (big.pages.length < 11) big.pages.splice(1, 0, { ...big.pages[1], headline: `추가 ${big.pages.length}`, body: `본문 ${big.pages.length}` });
    big.pages.forEach((p: { page_number: number }, i: number) => (p.page_number = i + 1));
    big.page_count = big.pages.length;
    assert.ok(validatePlan(big, input).some((i) => /5~10장/.test(i.message)));
  }],
];

let failed = 0;
for (const [name, fn] of tests) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failed++; console.log(`✗ ${name}\n  ${(e as Error).message}`); }
}
console.log(`\n${tests.length - failed}/${tests.length} passed`);
if (failed) process.exit(1);
