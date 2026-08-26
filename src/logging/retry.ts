// 9. Retry 정책 (지시사항 26)
// 1차 실패 → 5분 후 재시도, 2차 실패 → 15분 후 재시도, 3차 실패 → failed 상태 + 사용자에게 오류 표시
import { loadConfig } from "../config.js";

export function nextRetryDelayMinutes(retryCount: number): number | null {
  const schedule = loadConfig().publishing.retry_schedule_minutes; // 기본 [5, 15]
  if (retryCount >= schedule.length) return null; // 재시도 소진 → failed
  return schedule[retryCount];
}

export function computeNextRetryAt(retryCount: number, from = new Date()): string | null {
  const delay = nextRetryDelayMinutes(retryCount);
  if (delay === null) return null;
  return new Date(from.getTime() + delay * 60_000).toISOString();
}
