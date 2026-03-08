# aiwrap

Node.js library that routes prompt requests to multiple AI platforms using env-driven config.

Supported providers:
- OpenAI (GPT)
- Anthropic (Claude)
- Google Gemini
- Ollama (local models)
- xAI Grok

## Install

Authenticate to GitHub Packages in your consumer project's `.npmrc`:

```ini
@rajat19:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

```bash
npm install @rajat19/aiwrap
```

## Usage

```ts
import { MultiAiClient } from "@rajat19/aiwrap";

const client = new MultiAiClient(); // Reads process.env by default

const result = await client.generate({
  system: "You are a concise assistant.",
  context: "Customer support summary request.",
  prompt: "Summarize this ticket in 3 bullets.",
  strictJson: true,
  maxJsonRetries: 2,
  outputJson: {
    priority: "low|medium|high",
    summary: "string",
    next_steps: ["string"]
  }
});

console.log(result.text);
console.log(result.json); // Parsed JSON when strictJson/outputJson is used
```

## Streaming usage

```ts
for await (const event of client.stream({ prompt: "Write 1 short paragraph about CI/CD." })) {
  if (event.type === "delta") process.stdout.write(event.delta);
  if (event.type === "done") process.stdout.write("\n");
  if (event.type === "error") console.error(event.error);
}
```

## Environment variables

```env
AI_PROVIDER=openai # openai | anthropic | gemini | ollama | grok
AI_MODEL=gpt-4o-mini
AI_TIMEOUT_MS=60000

# Generic fallback key for any provider
AI_API_KEY=...

# Provider-specific keys (preferred)
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
GEMINI_API_KEY=...
GROK_API_KEY=...
XAI_API_KEY=...

# Optional base URLs
AI_BASE_URL=
OLLAMA_BASE_URL=http://localhost:11434
```

## API

- `new MultiAiClient(config?, env?)`
  - `config` overrides env values.
  - `env` defaults to `process.env`.
- `client.generate(request)`
  - `request.context`: optional context string
  - `request.prompt`: required request content
  - `request.system`: optional system instruction
  - `request.outputJson`: optional JSON schema/template as object or string
  - `request.strictJson`: if true, parses and validates model output as JSON
  - `request.maxJsonRetries`: retries with repair instruction when JSON parsing fails
  - `request.temperature`, `request.maxTokens`: optional generation controls
- `client.stream(request)`
  - returns async events: `delta`, `done`, `error`
  - streaming providers: OpenAI, Anthropic, Ollama, Grok
  - Gemini uses fallback to single-shot `generate`

Return shape:

```ts
{
  provider: "openai" | "anthropic" | "gemini" | "ollama" | "grok",
  model: string,
  text: string,
  json?: unknown,
  raw: unknown
}
```

## Project blockers and risks

- API divergence: each provider has different auth, payload shape, token limits, and response formats.
- Structured output mismatch: strict JSON mode is not uniform across providers, so response validation is needed.
- Streaming differences: event formats vary (SSE, chunked JSON, provider-specific), which complicates one common stream API.
- Tool/function-calling portability: semantics differ and can break cross-provider behavior.
- Rate limits and retries: limits are provider/model specific; robust backoff and idempotency handling is required.
- Model naming churn: model IDs can deprecate frequently; defaults can break without maintenance.
- Cost governance: token accounting differs and may require per-provider metering normalization.
- Safety/compliance: data residency, logging policy, and PII constraints can block some providers in production.
- Local vs cloud parity: Ollama model quality and context size can differ drastically from hosted models.
- Testability: reliable integration tests require mocked adapters and optional live-provider smoke tests.

## Development

```bash
npm install
npm run build
npm test
```

## Publishing (GitHub Packages)

Automated publish is configured in [`publish-gh.yml`](/Users/rajat/Desktop/github/aiwrap/.github/workflows/publish-gh.yml).
CI and publish are intentionally separate workflows.

1. Push your commits to GitHub.
2. Create and push a version tag like `v0.1.1` to trigger publish, or publish a GitHub Release.
3. `Publish GitHub Package` runs independently and publishes `@rajat19/aiwrap` to GitHub Packages.
