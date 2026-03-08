import type { GenerateRequest } from "./types.js";

export function buildUserPrompt(request: GenerateRequest): string {
  const blocks: string[] = [];

  if (request.context?.trim()) {
    blocks.push(`Context:\n${request.context.trim()}`);
  }

  blocks.push(`Request:\n${request.prompt.trim()}`);

  if (request.outputJson) {
    const schema = typeof request.outputJson === "string"
      ? request.outputJson
      : JSON.stringify(request.outputJson, null, 2);
    blocks.push(`Output format (strict JSON):\n${schema}`);
    blocks.push("Return valid JSON only.");
  }

  return blocks.join("\n\n");
}
