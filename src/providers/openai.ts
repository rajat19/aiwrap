import { WrapperConfigError } from "../errors.js";
import { postJson } from "../http.js";
import { buildUserPrompt } from "../prompt.js";
import type { GenerateRequest, GenerateResult, WrapperConfig } from "../types.js";
import { readSseData } from "../stream.js";

export async function callOpenAI(config: WrapperConfig, req: GenerateRequest): Promise<GenerateResult> {
  const apiKey = config.openaiApiKey ?? config.apiKey;
  if (!apiKey) throw new WrapperConfigError("OPENAI_API_KEY or AI_API_KEY is required for OpenAI");

  const baseUrl = config.baseUrl ?? "https://api.openai.com/v1";
  const response = await postJson(
    `${baseUrl}/chat/completions`,
    {
      model: config.model,
      temperature: req.temperature,
      max_tokens: req.maxTokens,
      messages: [
        ...(req.system ? [{ role: "system", content: req.system }] : []),
        { role: "user", content: buildUserPrompt(req) }
      ]
    },
    {
      headers: { Authorization: `Bearer ${apiKey}` }
    },
    config.timeoutMs
  ) as Record<string, any>;

  const text = response.choices?.[0]?.message?.content ?? "";
  return { provider: "openai", model: config.model, text, raw: response };
}

export async function* callOpenAIStream(config: WrapperConfig, req: GenerateRequest): AsyncGenerator<string> {
  const apiKey = config.openaiApiKey ?? config.apiKey;
  if (!apiKey) throw new WrapperConfigError("OPENAI_API_KEY or AI_API_KEY is required for OpenAI");

  const baseUrl = config.baseUrl ?? "https://api.openai.com/v1";
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      temperature: req.temperature,
      max_tokens: req.maxTokens,
      stream: true,
      messages: [
        ...(req.system ? [{ role: "system", content: req.system }] : []),
        { role: "user", content: buildUserPrompt(req) }
      ]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI stream failed (${response.status}): ${text.slice(0, 400)}`);
  }

  for await (const data of readSseData(response)) {
    if (data === "[DONE]") return;
    const parsed = safeParse(data);
    const delta = parsed?.choices?.[0]?.delta?.content;
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
