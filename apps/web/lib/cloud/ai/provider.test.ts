import { describe, expect, it } from "vitest";

import { AiProviderError, requestAiGrantDraft } from "./provider";
import type { AiProviderConfig } from "./config";

const config: AiProviderConfig = {
  baseUrl: "https://api.example.test/v1",
  model: "test-model",
  apiKey: "sk-do-not-leak-this-value",
  maxOutputTokens: 2500,
};

const draftJson = JSON.stringify({ strategy: 0, title: "Advisor vesting" });

function completion(content: unknown) {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function ask(fetchImpl: typeof fetch, signal?: AbortSignal) {
  return requestAiGrantDraft({
    config,
    prompt: "Advisor vesting over three years",
    locale: "en",
    fetchImpl,
    signal,
  });
}

async function reasonOf(fetchImpl: typeof fetch, signal?: AbortSignal) {
  try {
    await ask(fetchImpl, signal);
  } catch (error) {
    return error instanceof AiProviderError
      ? error.reason
      : "not-a-provider-error";
  }
  return "resolved";
}

describe("requestAiGrantDraft", () => {
  it("posts a schema-constrained chat completion and returns its raw text", async () => {
    let seen: { url: string; init: RequestInit } | undefined;
    const result = await ask(((url: string, init: RequestInit) => {
      seen = { url, init };
      return Promise.resolve(completion(draftJson));
    }) as unknown as typeof fetch);

    expect(result).toBe(draftJson);
    expect(seen?.url).toBe("https://api.example.test/v1/chat/completions");
    const body = JSON.parse(String(seen?.init.body));
    expect(body.model).toBe("test-model");
    expect(body.response_format.type).toBe("json_schema");
    expect(body.response_format.json_schema.name).toBe("hashvest_grant_draft");
    expect(body.messages).toHaveLength(2);
    // A reasoning model spends this budget before it emits any content, so the
    // ceiling is configuration rather than a constant. See config.ts.
    expect(body.max_tokens).toBe(config.maxOutputTokens);
    expect(
      (seen?.init.headers as Record<string, string>).authorization,
    ).toContain(config.apiKey);
  });

  it("maps every upstream status onto the reason the UI has copy for", async () => {
    const cases: [number, string][] = [
      [401, "unauthorized"],
      [403, "unauthorized"],
      [429, "rate_limited"],
      [500, "unavailable"],
      [404, "unavailable"],
    ];
    for (const [status, reason] of cases)
      expect(
        await reasonOf((() =>
          Promise.resolve(new Response("no", { status }))) as typeof fetch),
      ).toBe(reason);
  });

  it("reports a network failure as unavailable and an abort as a timeout", async () => {
    expect(
      await reasonOf((() =>
        Promise.reject(new TypeError("fetch failed"))) as typeof fetch),
    ).toBe("unavailable");

    const aborted = () =>
      Promise.reject(
        Object.assign(new Error("aborted"), { name: "AbortError" }),
      );
    expect(await reasonOf(aborted as typeof fetch)).toBe("timeout");
  });

  it("reports an unreadable or empty completion as malformed", async () => {
    const notJson = () =>
      Promise.resolve(new Response("<html>gateway</html>", { status: 200 }));
    expect(await reasonOf(notJson as typeof fetch)).toBe("malformed");

    for (const payload of [{}, { choices: [] }, { choices: [{}] }])
      expect(
        await reasonOf((() =>
          Promise.resolve(
            new Response(JSON.stringify(payload), { status: 200 }),
          )) as typeof fetch),
      ).toBe("malformed");

    expect(
      await reasonOf((() =>
        Promise.resolve(completion("   "))) as typeof fetch),
    ).toBe("malformed");
  });

  it("reads content providers send as a list of parts", async () => {
    const parts = [{ text: '{"strategy":0,' }, { text: '"title":"Advisor"}' }];
    await expect(
      ask((() => Promise.resolve(completion(parts))) as typeof fetch),
    ).resolves.toBe('{"strategy":0,"title":"Advisor"}');
  });

  it("unwraps the fenced code block providers add despite the schema", async () => {
    await expect(
      ask((() =>
        Promise.resolve(
          completion("```json\n" + draftJson + "\n```"),
        )) as typeof fetch),
    ).resolves.toBe(draftJson);
  });

  it("never puts the API key or the upstream body into a failure", async () => {
    const echo = () =>
      Promise.resolve(
        new Response(`unauthorized for key ${config.apiKey}`, { status: 401 }),
      );
    try {
      await ask(echo as typeof fetch);
      throw new Error("expected a provider error");
    } catch (error) {
      const serialized = `${String(error)} ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`;
      expect(serialized).not.toContain(config.apiKey);
      expect(serialized).not.toContain("unauthorized for key");
      expect(serialized).toContain("unauthorized");
    }
  });
});
