import { resolveConfig } from "./config.js";
import type { GenerateRequest, GenerateResult, StreamEvent, WrapperConfig } from "./types.js";
import { callOpenAI } from "./providers/openai.js";
import { callAnthropic } from "./providers/anthropic.js";
import { callGemini } from "./providers/gemini.js";
import { callOllama } from "./providers/ollama.js";
import { callGrok } from "./providers/grok.js";
import { callOpenAIStream } from "./providers/openai.js";
import { callAnthropicStream } from "./providers/anthropic.js";
import { callOllamaStream } from "./providers/ollama.js";
import { callGrokStream } from "./providers/grok.js";
import { buildJsonRetryPrompt, ensureJsonResult, shouldEnforceJson } from "./json.js";
import { ProviderRequestError } from "./errors.js";

export class MultiAiClient {
  private readonly config: WrapperConfig;

  constructor(config: Partial<WrapperConfig> = {}, env = process.env) {
    this.config = resolveConfig(config, env);
  }

  getConfig(): WrapperConfig {
    return { ...this.config };
  }

  async generate(request: GenerateRequest): Promise<GenerateResult> {
    const enforceJson = shouldEnforceJson(request);
    const maxRetries = Math.max(0, request.maxJsonRetries ?? 1);
    let currentRequest = { ...request };

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      const result = await this.callProvider(currentRequest);
      if (!enforceJson) return result;

      try {
        const parsed = ensureJsonResult(result.text);
        return { ...result, json: parsed };
      } catch (error) {
        if (attempt >= maxRetries) {
          throw error;
        }

        const message = error instanceof Error ? error.message : "Invalid JSON response";
        currentRequest = {
          ...currentRequest,
          prompt: buildJsonRetryPrompt(request.prompt, message, request.outputJson)
        };
      }
    }

    throw new ProviderRequestError("Failed to generate response");
  }

  async *stream(request: GenerateRequest): AsyncGenerator<StreamEvent> {
    let text = "";
    try {
      const stream = this.callProviderStream(request);
      if (!stream) {
        const result = await this.generate(request);
        if (result.text) {
          yield { type: "delta", provider: result.provider, model: result.model, delta: result.text };
        }
        yield { type: "done", provider: result.provider, model: result.model, text: result.text, raw: result.raw };
        return;
      }

      for await (const delta of stream) {
        text += delta;
        yield { type: "delta", provider: this.config.provider, model: this.config.model, delta };
      }

      yield { type: "done", provider: this.config.provider, model: this.config.model, text };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Streaming failed";
      yield { type: "error", provider: this.config.provider, model: this.config.model, error: message };
    }
  }

  private callProvider(request: GenerateRequest): Promise<GenerateResult> {
    switch (this.config.provider) {
      case "openai":
        return callOpenAI(this.config, request);
      case "anthropic":
        return callAnthropic(this.config, request);
      case "gemini":
        return callGemini(this.config, request);
      case "ollama":
        return callOllama(this.config, request);
      case "grok":
        return callGrok(this.config, request);
      default:
        return assertNever(this.config.provider);
    }
  }

  private callProviderStream(request: GenerateRequest): AsyncGenerator<string> | null {
    switch (this.config.provider) {
      case "openai":
        return callOpenAIStream(this.config, request);
      case "anthropic":
        return callAnthropicStream(this.config, request);
      case "ollama":
        return callOllamaStream(this.config, request);
      case "grok":
        return callGrokStream(this.config, request);
      case "gemini":
        return null;
      default:
        return assertNever(this.config.provider);
    }
  }
}

function assertNever(value: never): never {
  throw new Error(`Unsupported provider: ${String(value)}`);
}
