import test from "node:test";
import assert from "node:assert/strict";

import { MultiAiClient, resolveConfig } from "../dist/index.js";

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

test("resolveConfig maps provider aliases from env", () => {
  const cfg = resolveConfig({}, {
    AI_PROVIDER: "gpt",
    AI_MODEL: "gpt-4o-mini",
    OPENAI_API_KEY: "k"
  });

  assert.equal(cfg.provider, "openai");
  assert.equal(cfg.model, "gpt-4o-mini");
});

test("generate retries invalid JSON and returns parsed json", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;

  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) {
      return jsonResponse({
        choices: [{ message: { content: "not valid json" } }]
      });
    }

    return jsonResponse({
      choices: [{ message: { content: '{"ok":true}' } }]
    });
  };

  try {
    const client = new MultiAiClient({
      provider: "openai",
      model: "gpt-4o-mini",
      openaiApiKey: "test-key"
    });

    const result = await client.generate({
      prompt: "Return JSON",
      outputJson: { ok: "boolean" },
      maxJsonRetries: 1
    });

    assert.equal(calls, 2);
    assert.deepEqual(result.json, { ok: true });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("stream emits deltas and done for openai", async () => {
  const originalFetch = globalThis.fetch;

  const streamText = [
    'data: {"choices":[{"delta":{"content":"Hello "}}]}\n\n',
    'data: {"choices":[{"delta":{"content":"World"}}]}\n\n',
    "data: [DONE]\n\n"
  ].join("");

  globalThis.fetch = async () => {
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(streamText));
        controller.close();
      }
    });

    return new Response(body, {
      status: 200,
      headers: { "Content-Type": "text/event-stream" }
    });
  };

  try {
    const client = new MultiAiClient({
      provider: "openai",
      model: "gpt-4o-mini",
      openaiApiKey: "test-key"
    });

    const events = [];
    for await (const event of client.stream({ prompt: "Say hi" })) {
      events.push(event);
    }

    assert.equal(events[0].type, "delta");
    assert.equal(events[0].delta, "Hello ");
    assert.equal(events[1].type, "delta");
    assert.equal(events[1].delta, "World");
    assert.equal(events.at(-1).type, "done");
    assert.equal(events.at(-1).text, "Hello World");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("stream falls back to non-stream provider response", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => {
    return jsonResponse({
      candidates: [
        {
          content: {
            parts: [{ text: "Gemini response" }]
          }
        }
      ]
    });
  };

  try {
    const client = new MultiAiClient({
      provider: "gemini",
      model: "gemini-1.5-pro",
      geminiApiKey: "test-key"
    });

    const events = [];
    for await (const event of client.stream({ prompt: "Say hi" })) {
      events.push(event);
    }

    assert.equal(events[0].type, "delta");
    assert.equal(events[0].delta, "Gemini response");
    assert.equal(events[1].type, "done");
    assert.equal(events[1].text, "Gemini response");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
