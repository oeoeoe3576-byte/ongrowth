// 7. Scheduler 실행 진입점 - 로컬/서버에서 상시 실행하는 경우 사용 (node-cron 폴링)
// Vercel 등 서버리스 환경에서는 대신 dashboard API의 POST /api/scheduler/tick 을
// Vercel Cron이 주기적으로 호출하도록 구성한다 (동일한 tick() 함수를 재사용).

import cron from "node-cron";
import { tick } from "./scheduler.js";
import { loadConfig } from "../config.js";
import { scanInbox } from "../queue/inboxWatcher.js";

async function runOnce() {
  const inboxResults = await scanInbox();
  for (const r of inboxResults) {
    if (r.status === "queued") console.log(`[inbox] 큐 등록: ${r.folder} → ${r.detail}`);
    if (r.status === "invalid") console.warn(`[inbox] 형식 오류: ${r.folder} - ${r.detail}`);
  }

  const summary = await tick();
  if (summary.checked > 0) {
    console.log(
      `[scheduler] checked=${summary.checked} published=${summary.published} retried=${summary.retried} failed=${summary.failed} skipped=${summary.skipped}`
    );
  }
}

const cfg = loadConfig();
const seconds = cfg.scheduler.poll_interval_seconds || 60;
console.log(`[scheduler] ${seconds}초 간격으로 예약 큐를 확인합니다 (timezone=${cfg.publishing.timezone}).`);

// node-cron은 최소 단위가 분(minute)이므로, 60초 미만 폴링은 setInterval로 처리한다.
if (seconds < 60) {
  setInterval(() => {
    runOnce().catch((err) => console.error("[scheduler] tick 오류:", err));
  }, seconds * 1000);
} else {
  const minuteInterval = Math.max(1, Math.round(seconds / 60));
  cron.schedule(`*/${minuteInterval} * * * *`, () => {
    runOnce().catch((err) => console.error("[scheduler] tick 오류:", err));
  });
}

runOnce().catch((err) => console.error("[scheduler] 초기 실행 오류:", err));
