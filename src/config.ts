// 전역 설정 로더 (config/config.yaml) - 지시사항 34
import { readFileSync } from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import "dotenv/config";

export interface AppConfig {
  brand: {
    name: string;
    account: string;
    default_cta: string;
    follow_cta: string;
    tone: string;
  };
  cardnews: {
    slide_count: number;
    width: number;
    height: number;
    template: string;
  };
  place_rules: {
    minimum_rating: number;
    exclude_temporarily_closed: boolean;
    exclude_permanently_closed: boolean;
  };
  caption: {
    hashtag_count: number;
    use_emoji: boolean;
    linebreak_style: "single" | "double";
    max_lines_hook: number;
  };
  publishing: {
    timezone: string;
    review_mode: boolean;
    default_publish_hour: number;
    default_publish_minute: number;
    retry_schedule_minutes: number[];
  };
  instagram: {
    enabled: boolean;
    graph_api_version: string;
    /** 계정명(post.account) → 해당 계정의 ID/토큰이 들어있는 환경변수 이름 */
    accounts?: Record<string, { account_id_env: string; access_token_env: string }>;
  };
  scheduler: {
    poll_interval_seconds: number;
  };
  folders: {
    output_dir: string;
    inbox_dir: string;
    scheduled_dir: string;
    success_dir: string;
    failed_dir: string;
  };
}

let cached: AppConfig | null = null;

export function loadConfig(): AppConfig {
  if (cached) return cached;
  const file = path.resolve(process.cwd(), "config", "config.yaml");
  const raw = readFileSync(file, "utf8");
  cached = yaml.load(raw) as AppConfig;
  return cached;
}

export function isDryRun(): boolean {
  return (process.env.DRY_RUN ?? "true").toLowerCase() !== "false";
}

export function isReviewMode(): boolean {
  const envOverride = process.env.REVIEW_MODE;
  if (envOverride !== undefined) return envOverride.toLowerCase() !== "false";
  return loadConfig().publishing.review_mode;
}
