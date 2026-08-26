// Anthropic Claude API 호출 공통 로직 (문구 다듬기 전용).
// ANTHROPIC_API_KEY가 없으면 이 함수를 호출하는 쪽에서 규칙 기반 폴백을 쓰도록
// null을 반환한다 - "instagram.enabled=false여도 전체 프로그램이 깨지지 않아야 한다"는
// 지시사항 34의 원칙을 콘텐츠 생성 단계에도 동일하게 적용한 것이다.

import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null | undefined;

function getClient(): Anthropic | null {
  if (client !== undefined) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  client = apiKey ? new Anthropic({ apiKey }) : null;
  return client;
}

export function hasLLM(): boolean {
  return getClient() !== null;
}

/**
 * 짧은 문구 생성용 헬퍼. 실패하거나 키가 없으면 null을 반환하며 절대 throw하지 않는다
 * (콘텐츠 파이프라인은 LLM 없이도 항상 끝까지 동작해야 한다).
 */
export async function polishText(prompt: string, maxTokens = 300): Promise<string | null> {
  const c = getClient();
  if (!c) return null;
  try {
    const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
    const resp = await c.messages.create({
      model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    });
    const block = resp.content.find((b) => b.type === "text");
    return block && block.type === "text" ? block.text.trim() : null;
  } catch (err) {
    console.error("[llm] polishText 실패 - 규칙 기반 폴백을 사용합니다:", (err as Error).message);
    return null;
  }
}
