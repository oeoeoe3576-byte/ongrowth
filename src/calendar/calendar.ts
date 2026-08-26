// 콘텐츠 캘린더 (지시사항 31) - 배치 제작/주간 자동 생성과 연결하기 위한 별도 데이터
import { promises as fs } from "node:fs";
import path from "node:path";
import type { CalendarEntry } from "../types.js";

const CALENDAR_FILE = path.resolve(process.cwd(), "data", "calendar.json");

export async function loadCalendar(): Promise<CalendarEntry[]> {
  try {
    const raw = await fs.readFile(CALENDAR_FILE, "utf8");
    return JSON.parse(raw) as CalendarEntry[];
  } catch (err: any) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

export async function saveCalendar(entries: CalendarEntry[]): Promise<void> {
  await fs.mkdir(path.dirname(CALENDAR_FILE), { recursive: true });
  await fs.writeFile(CALENDAR_FILE, JSON.stringify(entries, null, 2) + "\n", "utf8");
}

export async function upsertCalendarEntry(entry: CalendarEntry): Promise<void> {
  const entries = await loadCalendar();
  const idx = entries.findIndex((e) => e.date === entry.date && e.topic === entry.topic);
  if (idx >= 0) entries[idx] = entry;
  else entries.push(entry);
  await saveCalendar(entries);
}

/**
 * 지시사항 30: "다음 주 국내여행 카드뉴스 7개" 같은 배치 요청을 날짜별로 분배한다.
 * startDate부터 하루 간격(intervalDays)으로 topics를 순서대로 배정한다.
 */
export function distributeSchedule(
  topics: string[],
  opts: { startDate: string; hour: number; minute: number; timezone: string; intervalDays?: number }
): { date: string; publishAt: string; topic: string }[] {
  const interval = opts.intervalDays ?? 1;
  return topics.map((topic, i) => {
    const d = new Date(opts.startDate + "T00:00:00");
    d.setDate(d.getDate() + i * interval);
    const dateStr = d.toISOString().slice(0, 10);
    const hh = String(opts.hour).padStart(2, "0");
    const mm = String(opts.minute).padStart(2, "0");
    return { date: dateStr, publishAt: `${dateStr}T${hh}:${mm}:00+09:00`, topic };
  });
}
