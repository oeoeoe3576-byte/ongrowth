// 상태 확인(비밀 값 없이 설정 여부만): /api/health
import { ACCOUNTS } from "../lib/data.generated.js";
import { activeAccounts, mode, dryRun } from "../lib/core.js";
import { getStore } from "../lib/store.js";

export async function GET(): Promise<Response> {
  const has = (n: string) => !!process.env[n];
  return Response.json({
    mode: mode(),
    dryRun: dryRun(),
    persistentStore: getStore().persistent,
    webhookReady: has("WEBHOOK_VERIFY_TOKEN") && has("IG_APP_SECRET"),
    pollReady: has("POLL_SECRET"),
    active: activeAccounts().map((a) => a.key),
    tokens: Object.fromEntries(ACCOUNTS.map((a) => [a.key, has(a.tokenEnv)])),
  });
}
