import { WrapperConfigError } from "../errors.js";
import { postJson } from "../http.js";
import { buildUserPrompt } from "../prompt.js";
import type { GenerateRequest, GenerateResult, WrapperConfig } from "../types.js";
import { readSseData } from "../stream.js";

export async function callAnthropic(config: WrapperConfig, req: GenerateRequest): Promise<GenerateResult> {
  const apiKey = config.anthropicApiKey ?? config.apiKey;
  if (!apiKey) throw new WrapperConfigError("ANTHROPIC_API_KEY or AI_API_KEY is required for Anthropic");

  const baseUrl = config.baseUrl ?? "https://api.anthropic.com/v1";
  const response = await postJson(
    `${baseUrl}/messages`,
    {
      model: config.model,
      max_tokens: req.maxTokens ?? 1024,
      temperature: req.temperature,
      system: req.system,
      messages: [{ role: "user", content: buildUserPrompt(req) }]
    },
    {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      }
    },
    config.timeoutMs
  ) as Record<string, any>;

  const text = response.content?.find((item: any) => item.type === "text")?.text ?? "";
  return { provider: "anthropic", model: config.model, text, raw: response };
}

export async function* callAnthropicStream(config: WrapperConfig, req: GenerateRequest): AsyncGenerator<string> {
  const apiKey = config.anthropicApiKey ?? config.apiKey;
  if (!apiKey) throw new WrapperConfigError("ANTHROPIC_API_KEY or AI_API_KEY is required for Anthropic");

  const baseUrl = config.baseUrl ?? "https://api.anthropic.com/v1";
  const response = await fetch(`${baseUrl}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: req.maxTokens ?? 1024,
      temperature: req.temperature,
      system: req.system,
      stream: true,
      messages: [{ role: "user", content: buildUserPrompt(req) }]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Anthropic stream failed (${response.status}): ${text.slice(0, 400)}`);
  }

  for await (const data of readSseData(response)) {
    const parsed = safeParse(data);
    const delta = parsed?.delta?.text;
    if (typeof delta === "string" && delta.length > 0) {
      yield delta;
    }
  }
}

function safeParse(value: string): Record<string, any> | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
