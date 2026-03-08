export type AiProvider = "openai" | "anthropic" | "gemini" | "ollama" | "grok";

export interface WrapperConfig {
  provider: AiProvider;
  model: string;
  timeoutMs?: number;
  baseUrl?: string;
  apiKey?: string;
  anthropicApiKey?: string;
  openaiApiKey?: string;
  geminiApiKey?: string;
  grokApiKey?: string;
  ollamaBaseUrl?: string;
}

export interface GenerateRequest {
  context?: string;
  prompt: string;
  system?: string;
  outputJson?: Record<string, unknown> | string;
  strictJson?: boolean;
  maxJsonRetries?: number;
  temperature?: number;
  maxTokens?: number;
}

export interface GenerateResult {
  provider: AiProvider;
  model: string;
  text: string;
  json?: unknown;
  raw: unknown;
}

export type StreamEvent =
  | { type: "delta"; provider: AiProvider; model: string; delta: string }
  | { type: "done"; provider: AiProvider; model: string; text: string; raw?: unknown }
  | { type: "error"; provider: AiProvider; model: string; error: string };
