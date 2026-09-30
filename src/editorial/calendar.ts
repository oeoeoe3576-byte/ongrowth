// 콘텐츠 캘린더: 오늘의 주제 고르기 → 검토 → 승인 → 발행 상태 관리.
// 설정과 주제 목록은 data/editorial/<brand>.json 하나에 있고, 원고/카드 상태는 2단계 MASTER status와 같이 움직인다.

import fs from "node:fs";
import path from "node:path";
import { DateTime } from "luxon";
import { loadStore, writeStore } from "../planner/store.js";

export type TopicStatus = "todo" | "reserved" | "planned" | "review" | "approved" | "published" | "hold" | "skipped";

export interface Topic {
  id: string;
  channel: string;
  topic: string;
  angle: string;
  status: TopicStatus;
  date?: string; // 이 주제를 맡은 날짜 (YYYY-MM-DD, KST)
  content_id?: string;
  publish_at?: string; // "YYYY-MM-DD HH:mm" KST
  published_at?: string;
  note?: string;
}

export interface Calendar {
  brand: string;
  category: string;
  objective: string;
  target: string;
  maxPages: number;
  reviewTime: string;
  publishTime: string;
  timezone: string;
  channels: Record<string, string>;
  weekly: Record<string, string>;
  rules: string[];
  backlog: Topic[];
}

const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export function calendarFile(brand: string): string {
  return path.resolve("data/editorial", `${brand}.json`);
}

export function loadCalendar(brand: string): Calendar {
  const file = calendarFile(brand);
  if (!fs.existsSync(file)) throw new Error(`콘텐츠 캘린더가 없음: ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf8")) as Calendar;
}

export function saveCalendar(cal: Calendar): void {
  fs.writeFileSync(calendarFile(cal.brand), JSON.stringify(cal, null, 2) + "\n", "utf8");
}

export function now(cal: Calendar): DateTime {
  return DateTime.now().setZone(cal.timezone);
}

/** 그 날짜 요일의 채널 (weekly 설정) */
export function channelFor(cal: Calendar, date: string): string {
  const d = DateTime.fromISO(date, { zone: cal.timezone });
  return cal.weekly[WEEKDAYS[d.weekday - 1]] ?? "blog";
}

/**
 * 오늘의 주제. 이미 오늘 맡은 주제가 있으면 그것을 돌려준다 (여러 번 실행해도 같은 결과).
 * 요일 채널의 todo가 없으면 다른 채널의 todo, 그것도 없으면 null (주제 추가 필요).
 */
export function pickTopic(cal: Calendar, date: string): { topic: Topic | null; channel: string; fallback: boolean } {
  const channel = channelFor(cal, date);
  const already = cal.backlog.find((t) => t.date === date && t.status !== "skipped");
  if (already) return { topic: already, channel, fallback: already.channel !== channel };
  const same = cal.backlog.find((t) => t.status === "todo" && t.channel === channel);
  if (same) return { topic: same, channel, fallback: false };
  const other = cal.backlog.find((t) => t.status === "todo");
  return { topic: other ?? null, channel, fallback: !!other };
}

export function findByContent(cal: Calendar, contentId: string): Topic {
  const t = cal.backlog.find((x) => x.content_id === contentId);
  if (!t) throw new Error(`캘린더에 ${contentId}와 연결된 주제가 없음 (editorial link 먼저)`);
  return t;
}

/** MASTER status를 캘린더 상태와 맞춘다 */
export function setMasterStatus(contentId: string, status: string): void {
  const store = loadStore();
  const m = store.master.find((x) => x.content_id === contentId);
  if (!m) throw new Error(`MASTER에 ${contentId} 없음`);
  m.status = status;
  writeStore(store);
}

/** 발행 시각: 오늘 publishTime. 이미 지났으면 지금 */
export function defaultPublishAt(cal: Calendar): string {
  const n = now(cal);
  const [h, mi] = cal.publishTime.split(":").map(Number);
  const at = n.set({ hour: h, minute: mi, second: 0, millisecond: 0 });
  return (at > n ? at : n).toFormat("yyyy-MM-dd HH:mm");
}

/** 최근 N일 안에 다룬 주제 (중복 방지 참고용) */
export function recentTopics(cal: Calendar, date: string, days = 14): Topic[] {
  const d = DateTime.fromISO(date, { zone: cal.timezone });
  return cal.backlog.filter((t) => t.date && t.status !== "skipped" && d.diff(DateTime.fromISO(t.date, { zone: cal.timezone }), "days").days <= days && t.date !== date);
}
