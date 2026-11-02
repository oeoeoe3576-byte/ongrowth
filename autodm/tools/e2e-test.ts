// 가짜 Meta API(fetch 대체)로 웹훅·폴링 전체 흐름 점검. 실제 네트워크 호출 없음.
//   npx tsx tools/e2e-test.ts
import { createHmac } from "node:crypto";
process.env.AUTODM_ACCOUNTS = "ongrowth";
process.env.IG_TOKEN_ONGROWTH = "IGtest";
process.env.IG_APP_SECRET = "s";
process.env.WEBHOOK_VERIFY_TOKEN = "v";
process.env.POLL_SECRET = "p";
const calls: string[] = [];
let failDm = false;
globalThis.fetch = (async (url: string, init?: RequestInit) => {
  const u = String(url);
  calls.push(`${init?.method ?? "GET"} ${u.replace(/https:\/\/graph.instagram.com\/v[\d.]+\//, "").split("?")[0]}`);
  const j = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s });
  if (u.includes("/messages")) return failDm ? j({ error: { message: "user cannot receive", code: 10, error_subcode: 2534022 } }, 400) : j({ message_id: "m1" });
  if (u.includes("/replies")) return j({ id: "r1" });
  if (u.includes("/me/media")) return j({ data: [{ id: "900", timestamp: new Date().toISOString(), comments_count: 3 }] });
  if (u.includes("/900/comments")) return j({ data: [
    { id: "c-own", text: "a", timestamp: new Date().toISOString(), from: { id: "17841410465575346", username: "ongrowth_marketing" } },
    { id: "c-tester", text: "b", timestamp: new Date().toISOString(), from: { id: "1", username: "tester_acc" } },
    { id: "c-other", text: "c", timestamp: new Date().toISOString(), from: { id: "2", username: "stranger" } },
  ] });
  if (u.includes("/me")) return j({ user_id: "17841410465575346", username: "ongrowth_marketing" });
  return j({ error: { message: "unexpected " + u } }, 500);
}) as any;

const { LINKS } = await import("../lib/data.generated.js");
LINKS.ongrowth["900"] = "https://example.com/guide";
const poll = await import("../api/poll.js");
const hook = await import("../api/webhook.js");
const run = async (label: string, env: Record<string, string>) => {
  Object.assign(process.env, env);
  calls.length = 0;
  const r = await poll.GET(new Request("https://x/api/poll?key=p"));
  console.log(`\n## ${label}\n결과:`, JSON.stringify(await r.json()), "\n쓰기 호출:", calls.filter((c) => c.startsWith("POST")));
};
await run("off 모드(기본)", { AUTODM_MODE: "off" });
await run("test 모드 + dry run", { AUTODM_MODE: "test", AUTODM_TEST_USERNAMES: "tester_acc", AUTODM_DRY_RUN: "1" });
const { useMemoryStore } = await import("../lib/store.js");
useMemoryStore();
await run("test 모드 실제(가짜 API)", { AUTODM_DRY_RUN: "" });
await run("같은 댓글 다시 폴링 → 중복 처리 없어야", {});
useMemoryStore();
failDm = true;
await run("DM 실패 → 프로필 링크 답글", {});
// 웹훅
console.log("\n## 웹훅 확인 GET:", await (await hook.GET(new Request("https://x/api/webhook?hub.mode=subscribe&hub.verify_token=v&hub.challenge=42"))).text());
const body = JSON.stringify({ object: "instagram", entry: [{ id: "17841410465575346", time: Math.floor(Date.now() / 1000), changes: [{ field: "comments", value: { id: "c-hook", text: "hi", from: { id: "1", username: "tester_acc" }, media: { id: "901" } } }] }] });
const sig = "sha256=" + createHmac("sha256", "s").update(body).digest("hex");
failDm = false; useMemoryStore(); calls.length = 0;
const bad = await hook.POST(new Request("https://x/api/webhook", { method: "POST", body, headers: { "x-hub-signature-256": "sha256=00" } }));
const good = await hook.POST(new Request("https://x/api/webhook", { method: "POST", body, headers: { "x-hub-signature-256": sig } }));
console.log("서명 틀림:", bad.status, "/ 서명 맞음:", good.status, JSON.stringify(await good.json()), calls.filter((c) => c.startsWith("POST")));
