// 8. Instagram 인증 체크 (지시사항 19, 36)
// Access Token/비밀번호는 코드에 직접 넣지 않고 .env 로만 읽는다.
//
// 여러 계정 지원: config.yaml의 instagram.accounts에 "계정명 → 환경변수 이름"을 매핑해 두고,
// 큐 항목(post.account)에 맞는 계정 ID/토큰으로 발행한다.
// 매핑이 없는 계정은 기존 단일 계정 환경변수(INSTAGRAM_ACCOUNT_ID / META_ACCESS_TOKEN)로 폴백한다.

import { loadConfig } from "../../config.js";

export interface InstagramAuthConfig {
  accountId: string;
  accessToken: string;
  graphApiVersion: string;
}

const DEFAULT_ACCOUNT_ID_ENV = "INSTAGRAM_ACCOUNT_ID";
const DEFAULT_TOKEN_ENV = "META_ACCESS_TOKEN";

function resolveEnvNames(account?: string): { accountIdEnv: string; tokenEnv: string } {
  const mapped = account ? loadConfig().instagram.accounts?.[account] : undefined;
  return {
    accountIdEnv: mapped?.account_id_env || DEFAULT_ACCOUNT_ID_ENV,
    tokenEnv: mapped?.access_token_env || DEFAULT_TOKEN_ENV,
  };
}

export function getInstagramAuthConfig(account?: string): InstagramAuthConfig | null {
  const { accountIdEnv, tokenEnv } = resolveEnvNames(account);
  const accountId = process.env[accountIdEnv];
  const accessToken = process.env[tokenEnv];
  const graphApiVersion =
    process.env.META_GRAPH_API_VERSION || loadConfig().instagram.graph_api_version;
  if (!accountId || !accessToken) return null;
  return { accountId, accessToken, graphApiVersion: graphApiVersion || "v21.0" };
}

export async function checkInstagramAuth(account?: string): Promise<{ ok: boolean; reason?: string }> {
  const cfg = loadConfig();
  if (!cfg.instagram.enabled) {
    return { ok: false, reason: "config.yaml의 instagram.enabled=false 상태입니다 (의도적 비활성화)." };
  }
  const auth = getInstagramAuthConfig(account);
  if (!auth) {
    const { accountIdEnv, tokenEnv } = resolveEnvNames(account);
    return {
      ok: false,
      reason: `${account ? `[${account}] ` : ""}${accountIdEnv} / ${tokenEnv} 환경변수가 설정되지 않았습니다.`,
    };
  }
  return { ok: true };
}
