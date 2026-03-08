import { postJson } from "../http.js";
import { buildUserPrompt } from "../prompt.js";
import type { GenerateRequest, GenerateResult, WrapperConfig } from "../types.js";
import { readNdjson } from "../stream.js";

export async function callOllama(config: WrapperConfig, req: GenerateRequest): Promise<GenerateResult> {
  const baseUrl = config.ollamaBaseUrl ?? config.baseUrl ?? "http://localhost:11434";
  const response = await postJson(
    `${baseUrl}/api/chat`,
    {
      model: config.model,
      stream: false,
      options: {
        temperature: req.temperature,
        num_predict: req.maxTokens
      },
      messages: [
        ...(req.system ? [{ role: "system", content: req.system }] : []),
        { role: "user", content: buildUserPrompt(req) }
      ]
    },
    {},
    config.timeoutMs
  ) as Record<string, any>;

  const text = response.message?.content ?? "";
  return { provider: "ollama", model: config.model, text, raw: response };
}

export async function* callOllamaStream(config: WrapperConfig, req: GenerateRequest): AsyncGenerator<string> {
  const baseUrl = config.ollamaBaseUrl ?? config.baseUrl ?? "http://localhost:11434";
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.model,
      stream: true,
      options: {
        temperature: req.temperature,
        num_predict: req.maxTokens
      },
      messages: [
        ...(req.system ? [{ role: "system", content: req.system }] : []),
        { role: "user", content: buildUserPrompt(req) }
      ]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama stream failed (${response.status}): ${text.slice(0, 400)}`);
  }

  for await (const line of readNdjson(response)) {
    const parsed = safeParse(line);
    const delta = parsed?.message?.content;
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
