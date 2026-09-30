// 기획 엔진이 AI를 부르는 방법. 엔진은 이 인터페이스만 안다.
// - AnthropicProvider: Claude API 호출 (ANTHROPIC_API_KEY 필요)
// - FileProvider: 미리 준비한 응답 파일을 순서대로 돌려줌 (키 없이 테스트/재현용)

import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";

export interface Turn {
  role: "user" | "assistant";
  content: string;
}

export interface PlanProvider {
  readonly name: string;
  complete(system: string, turns: Turn[]): Promise<string>;
}

export class AnthropicProvider implements PlanProvider {
  readonly name: string;
  private client: Anthropic;
  private model: string;

  constructor(model = process.env.ANTHROPIC_PLANNER_MODEL || "claude-opus-5-5") {
    this.client = new Anthropic();
    this.model = model;
    this.name = `anthropic:${model}`;
  }

  async complete(system: string, turns: Turn[]): Promise<string> {
    // fallbacks / output_config는 설치된 SDK(0.32) 타입에 없어 캐스팅해서 보낸다.
    // fallbacks: 안전 분류기가 요청을 거절하면 서버가 다른 모델로 다시 시도한다.
    const body = {
      model: this.model,
      max_tokens: 16000,
      system,
      messages: turns,
      output_config: { effort: "high" },
      fallbacks: "default",
    } as unknown as Anthropic.MessageCreateParamsNonStreaming;
    const resp = await this.client.messages.create(body, {
      headers: { "anthropic-beta": "server-side-fallback-2026-07-01" },
    });
    if ((resp.stop_reason as string) === "refusal") throw new Error("AI가 요청을 거절함 (stop_reason=refusal)");
    if (resp.stop_reason === "max_tokens") throw new Error("응답이 max_tokens에서 잘림");
    const text = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    if (!text.trim()) throw new Error("AI 응답에 텍스트가 없음");
    return text;
  }
}

export class FileProvider implements PlanProvider {
  readonly name: string;
  private i = 0;
  constructor(private files: string[]) {
    this.name = `file:${files.join(",")}`;
  }
  async complete(): Promise<string> {
    const f = this.files[Math.min(this.i++, this.files.length - 1)];
    return fs.readFileSync(f, "utf8");
  }
}

/** 테스트용: 문자열 응답을 순서대로 돌려준다 */
export class ScriptedProvider implements PlanProvider {
  readonly name = "scripted";
  readonly calls: { system: string; turns: Turn[] }[] = [];
  private i = 0;
  constructor(private responses: string[]) {}
  async complete(system: string, turns: Turn[]): Promise<string> {
    this.calls.push({ system, turns: [...turns] });
    return this.responses[Math.min(this.i++, this.responses.length - 1)];
  }
}
