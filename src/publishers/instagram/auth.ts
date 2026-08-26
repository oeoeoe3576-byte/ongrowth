// 8. Instagram 인증 체크 (지시사항 19, 36)
// Access Token/비밀번호는 코드에 직접 넣지 않고 .env 로만 읽는다.

import { loadConfig } from "../../config.js";

export interface InstagramAuthConfig {
  accountId: string;
  accessToken: string;
  graphApiVersion: string;
}

export function getInstagramAuthConfig(): InstagramAuthConfig | null {
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;
  const graphApiVersion =
    process.env.META_GRAPH_API_VERSION || loadConfig().instagram.graph_api_version;
  if (!accountId || !accessToken) return null;
  return { accountId, accessToken, graphApiVersion: graphApiVersion || "v21.0" };
}

export async function checkInstagramAuth(): Promise<{ ok: boolean; reason?: string }> {
  const cfg = loadConfig();
  if (!cfg.instagram.enabled) {
    return { ok: false, reason: "config.yaml의 instagram.enabled=false 상태입니다 (의도적 비활성화)." };
  }
  const auth = getInstagramAuthConfig();
  if (!auth) {
    return { ok: false, reason: "INSTAGRAM_ACCOUNT_ID / META_ACCESS_TOKEN 환경변수가 설정되지 않았습니다." };
  }
  return { ok: true };
}
