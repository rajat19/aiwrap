import { ProviderRequestError } from "./errors.js";

export async function postJson(url: string, body: unknown, init: RequestInit = {}, timeoutMs = 60_000): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {})
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    const text = await response.text();
    const data = text ? safeParse(text) : {};

    if (!response.ok) {
      throw new ProviderRequestError(`Provider request failed (${response.status}): ${text.slice(0, 400)}`, response.status);
    }

    return data;
  } catch (error) {
    if (error instanceof ProviderRequestError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new ProviderRequestError("Provider request timed out");
    }
    throw new ProviderRequestError(error instanceof Error ? error.message : "Unknown provider error");
  } finally {
    clearTimeout(timeout);
  }
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return { raw: value };
  }
}
