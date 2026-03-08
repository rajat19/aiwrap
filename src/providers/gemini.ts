import { WrapperConfigError } from "../errors.js";
import { postJson } from "../http.js";
import { buildUserPrompt } from "../prompt.js";
import type { GenerateRequest, GenerateResult, WrapperConfig } from "../types.js";

export async function callGemini(config: WrapperConfig, req: GenerateRequest): Promise<GenerateResult> {
  const apiKey = config.geminiApiKey ?? config.apiKey;
  if (!apiKey) throw new WrapperConfigError("GEMINI_API_KEY or AI_API_KEY is required for Gemini");

  const baseUrl = config.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta";
  const response = await postJson(
    `${baseUrl}/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      systemInstruction: req.system ? { parts: [{ text: req.system }] } : undefined,
      contents: [{ role: "user", parts: [{ text: buildUserPrompt(req) }] }],
      generationConfig: {
        maxOutputTokens: req.maxTokens,
        temperature: req.temperature
      }
    },
    {},
    config.timeoutMs
  ) as Record<string, any>;

  const text = response.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("\n") ?? "";
  return { provider: "gemini", model: config.model, text, raw: response };
}
