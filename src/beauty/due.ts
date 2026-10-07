// 뷰티레터 예약 발행: data/beautyletter/schedule.json에서 "approved"이고 발행 시각이 된 레터만 올린다.
//
//   npm run beauty:due               지금 시각 기준으로 발행할 것 1개 발행 (발행 시각 10분 전 ~ 60분 후까지만, 지나면 다음 빈 시간으로 미룸)
//   npm run beauty:due -- --list     상태만 보기
//   npm run beauty:due -- --dry-run  발행 대상만 보여주고 올리지 않음
//
// status: review(검토 대기) → approved(승인) → published(발행 완료) / failed
// 승인 전("review")인 레터는 시간이 지나도 절대 올리지 않는다.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const FILE = path.resolve("data/beautyletter/schedule.json");
const EARLY_MIN = 10;

type Item = { no: number; date: string; time: string; folder: string; title: string; status: string; media_id?: string; published_at?: string; error?: string };

function kstNow(): Date {
  return new Date(Date.now() + 9 * 3600 * 1000); // UTC 기준 Date를 KST 벽시계로 쓰기 위해 9시간 더함
}
function dueAt(it: Item): Date {
  return new Date(`${it.date}T${it.time}:00Z`); // KST 벽시계 값을 같은 기준으로 비교
}

const args = process.argv.slice(2);
const items: Item[] = JSON.parse(fs.readFileSync(FILE, "utf8"));
const now = kstNow();

if (args.includes("--list")) {
  for (const it of items) console.log(`No.${String(it.no).padStart(2, "0")} ${it.date} ${it.time} [${it.status}] ${it.title}`);
  process.exit(0);
}

// 발행 시각을 LATE_MIN분 넘게 놓친 레터가 있으면, 늦게 올리지 않고 아직 안 올라간 레터 전체를
// 순서 그대로 한 칸씩 뒤로 민다(08:30/20:30 슬롯을 하나도 건너뛰지 않음). 실행 1번에 최대 1개만 올린다.
// (2026-10-07 사용자 지시: 한 번에 여러 개 금지, 밀리면 뒤 일정도 한 칸씩)
const LATE_MIN = 60;
const SLOTS = ["08:30", "20:30"];
function slotAt(day: string, t: string): Date { return new Date(`${day}T${t}:00Z`); }
// 지금 올릴 수 있는 슬롯(발행 10분 전 ~ 60분 후) 또는 그 다음 슬롯부터 차례로
function* slotsFrom(t: Date) {
  for (let i = -1; i < 400; i++) {
    const day = new Date(t.getTime() + i * 86400000).toISOString().slice(0, 10);
    for (const s of SLOTS) {
      const at = slotAt(day, s);
      if (t.getTime() - at.getTime() > LATE_MIN * 60000) continue;
      yield [day, s] as [string, string];
    }
  }
}
const pending = items.filter((x) => x.status === "approved" || x.status === "review").sort((a, b) => dueAt(a).getTime() - dueAt(b).getTime());
const missed = pending.some((x) => x.status === "approved" && now.getTime() - dueAt(x).getTime() > LATE_MIN * 60000);
if (missed) {
  const gen = slotsFrom(now);
  for (const it of pending) {
    const [d, t] = gen.next().value as [string, string];
    if (it.date !== d || it.time !== t) {
      console.log(`한 칸 미룸: No.${it.no} ${it.date} ${it.time} → ${d} ${t} ${it.title}`);
      it.date = d; it.time = t;
    }
  }
  if (!args.includes("--dry-run")) fs.writeFileSync(FILE, JSON.stringify(items, null, 2) + "\n");
}

const due = items
  .filter((it) => it.status === "approved" && dueAt(it).getTime() - EARLY_MIN * 60000 <= now.getTime())
  .sort((a, b) => dueAt(a).getTime() - dueAt(b).getTime())
  .slice(0, 1);
const waiting = items.filter((it) => it.status === "review" && dueAt(it).getTime() - EARLY_MIN * 60000 <= now.getTime());
for (const it of waiting) console.log(`승인 대기라 건너뜀: No.${it.no} ${it.date} ${it.time} ${it.title}`);
if (!due.length) {
  console.log("지금 발행할 승인된 레터 없음");
  process.exit(0);
}

for (const it of due) {
  console.log(`발행: No.${it.no} ${it.title}`);
  if (args.includes("--dry-run")) continue;
  try {
    execFileSync("npx", ["tsx", "src/beauty/publish.ts", it.folder], { stdio: "inherit" });
    const rec = JSON.parse(fs.readFileSync(path.join(it.folder, "published.json"), "utf8"));
    it.status = "published";
    it.media_id = rec.media_id;
    it.published_at = rec.published_at;
  } catch (e) {
    it.status = "failed";
    it.error = (e as Error).message.slice(0, 300);
  }
  fs.writeFileSync(FILE, JSON.stringify(items, null, 2) + "\n");
}
