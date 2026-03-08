import { WrapperConfigError } from "./errors.js";
import type { AiProvider, WrapperConfig } from "./types.js";

const DEFAULT_MODELS: Record<AiProvider, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-sonnet-latest",
  gemini: "gemini-1.5-pro",
  ollama: "llama3.1",
  grok: "grok-2-latest"
};

function parseProvider(value: string | undefined): AiProvider {
  const normalized = (value ?? "openai").trim().toLowerCase();
  if (normalized === "openai" || normalized === "gpt") return "openai";
  if (normalized === "anthropic" || normalized === "claude") return "anthropic";
  if (normalized === "gemini" || normalized === "google") return "gemini";
  if (normalized === "ollama" || normalized === "local") return "ollama";
  if (normalized === "grok" || normalized === "xai" || normalized === "x.ai") return "grok";
  throw new WrapperConfigError(`Unsupported provider: ${value}`);
}

function parseNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function resolveConfig(overrides: Partial<WrapperConfig> = {}, env = process.env): WrapperConfig {
  const provider = overrides.provider ?? parseProvider(env.AI_PROVIDER ?? env.MODEL_PLATFORM);
  const model = overrides.model ?? env.AI_MODEL ?? env.MODEL_NAME ?? DEFAULT_MODELS[provider];

  const config: WrapperConfig = {
    provider,
    model,
    timeoutMs: overrides.timeoutMs ?? parseNumber(env.AI_TIMEOUT_MS) ?? 60_000,
    baseUrl: overrides.baseUrl ?? env.AI_BASE_URL,
    apiKey: overrides.apiKey ?? env.AI_API_KEY,
    anthropicApiKey: overrides.anthropicApiKey ?? env.ANTHROPIC_API_KEY,
    openaiApiKey: overrides.openaiApiKey ?? env.OPENAI_API_KEY,
    geminiApiKey: overrides.geminiApiKey ?? env.GEMINI_API_KEY,
    grokApiKey: overrides.grokApiKey ?? env.GROK_API_KEY ?? env.XAI_API_KEY,
    ollamaBaseUrl: overrides.ollamaBaseUrl ?? env.OLLAMA_BASE_URL
  };

  if (!config.model) {
    throw new WrapperConfigError("Model is required. Set AI_MODEL or pass config.model.");
  }

  return config;
}
