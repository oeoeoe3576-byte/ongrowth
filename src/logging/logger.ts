// 9. Logging - 모든 발행 작업 기록 (지시사항 27)
// Access Token 등 민감정보는 절대 로그에 남기지 않는다.

import { promises as fs } from "node:fs";
import path from "node:path";
import type { LogRecord } from "../types.js";

const LOG_DIR = path.resolve(process.cwd(), "data", "logs");
const SECRET_PATTERN = /(META_ACCESS_TOKEN|ANTHROPIC_API_KEY|access_token|bearer\s+[a-z0-9._-]+)\s*[:=]\s*\S+/gi;

function maskSecrets(input: string): string {
  return input.replace(SECRET_PATTERN, (m) => m.split(/[:=]/)[0] + "=***MASKED***");
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function logEvent(record: Omit<LogRecord, "timestamp">): Promise<void> {
  await fs.mkdir(LOG_DIR, { recursive: true });
  const full: LogRecord = { timestamp: new Date().toISOString(), ...record };
  if (full.message) full.message = maskSecrets(full.message);
  const file = path.join(LOG_DIR, `${today()}.log.jsonl`);
  await fs.appendFile(file, JSON.stringify(full) + "\n", "utf8");
  const line = `${full.timestamp} [${full.platform}] ${full.post_id} ${full.event}${full.message ? " - " + full.message : ""}`;
  // eslint-disable-next-line no-console
  console.log(line);
}

export async function readTodayLogs(): Promise<LogRecord[]> {
  const file = path.join(LOG_DIR, `${today()}.log.jsonl`);
  try {
    const raw = await fs.readFile(file, "utf8");
    return raw
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l) as LogRecord);
  } catch (err: any) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}
