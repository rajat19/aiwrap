import { ProviderRequestError } from "./errors.js";

export function shouldEnforceJson(req: { outputJson?: unknown; strictJson?: boolean }): boolean {
  return Boolean(req.outputJson) || Boolean(req.strictJson);
}

export function parseJsonText(text: string): unknown {
  const normalized = stripCodeFence(text.trim());
  return JSON.parse(normalized);
}

export function buildJsonRetryPrompt(originalPrompt: string, parseError: string, outputJson?: unknown): string {
  const schema = outputJson
    ? `\nOutput schema/template:\n${typeof outputJson === "string" ? outputJson : JSON.stringify(outputJson, null, 2)}\n`
    : "";

  return `${originalPrompt}\n\nThe previous answer was not valid JSON (${parseError}). Return only valid JSON with no markdown fences.${schema}`;
}

export function ensureJsonResult(text: string): unknown {
  try {
    return parseJsonText(text);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Invalid JSON output";
    throw new ProviderRequestError(`Invalid JSON response: ${msg}`);
  }
}

function stripCodeFence(value: string): string {
  if (!value.startsWith("```")) return value;
  const lines = value.split("\n");
  if (lines.length < 3) return value;
  if (!lines[0].startsWith("```")) return value;
  const last = lines[lines.length - 1].trim();
  if (last !== "```") return value;
  return lines.slice(1, -1).join("\n");
}
