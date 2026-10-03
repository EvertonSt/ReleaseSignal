import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { z } from "zod";

/*
 * The live providers are the only part of the gateway that touches the network,
 * so fetch is replaced rather than mocked module-by-module. Every case here is
 * a response the provider actually returns, including the ones it returns when
 * something has gone wrong - which is exactly when a typed envelope earns its
 * keep.
 */
const fetchMock = vi.fn();

beforeEach(() => {
  // Without the reset, `mock.calls[0]` in a later test is the request an
  // earlier one made, and the assertion passes or fails for the wrong reason.
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  process.env.OPENAI_API_KEY = "sk-test-openai";
  process.env.ANTHROPIC_API_KEY = "sk-ant-test";
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.OPENAI_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  vi.resetModules();
});

async function loadGateway() {
  return import("../gateway");
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    // The gateway awaits `.json()`, so the stub has to be awaitable even though
    // it resolves immediately.
    json: () => Promise.resolve(body),
  };
}

const Classification = z.object({
  classification: z.string(),
  confidence: z.number(),
});

describe("OpenAI provider", () => {
  it("returns the parsed completion when no schema is supplied", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ choices: [{ message: { content: '{"classification":"flaky"}' } }] })
    );

    const { analyze } = await loadGateway();
    const response = await analyze({ prompt: "Classify this failure" });

    expect(response.provider).toBe("openai");
    expect(response.data).toEqual({ classification: "flaky" });
  });

  it("returns schema-stripped data when a schema is supplied", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        choices: [
          {
            message: {
              content: '{"classification":"flaky","confidence":0.9,"extra":"dropped"}',
            },
          },
        ],
      })
    );

    const { analyze } = await loadGateway();
    const response = await analyze({ prompt: "Classify this failure" }, { schema: Classification });

    // zod strips unknown keys by default; the caller gets the contract it asked
    // for, not whatever the model felt like returning.
    expect(response.data).toEqual({ classification: "flaky", confidence: 0.9 });
  });

  it("throws when the completion does not satisfy the schema", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ choices: [{ message: { content: '{"classification":"flaky"}' } }] })
    );

    const { analyze } = await loadGateway();
    await expect(analyze({ prompt: "Classify this failure" }, { schema: Classification })).rejects.toThrow(
      /Schema validation failed/
    );
  });

  it("rejects a response whose envelope does not match the documented shape", async () => {
    // A provider that changes its response shape should produce a named error,
    // not `Cannot read properties of undefined (reading 'choices')`.
    fetchMock.mockResolvedValue(jsonResponse({ data: [{ text: "nope" }] }));

    const { analyze } = await loadGateway();
    await expect(analyze({ prompt: "Classify this failure" })).rejects.toThrow(
      /Unexpected OpenAI response shape/
    );
  });

  it("rejects a completion that is not JSON at all", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ choices: [{ message: { content: "I am a helpful assistant..." } }] })
    );

    const { analyze } = await loadGateway();
    await expect(analyze({ prompt: "Classify this failure" })).rejects.toThrow(/not JSON/);
  });

  it("rejects an empty completion", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ choices: [{ message: { content: null } }] }));

    const { analyze } = await loadGateway();
    await expect(analyze({ prompt: "Classify this failure" })).rejects.toThrow(/Empty response/);
  });

  it("surfaces the upstream status on an error response", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 429));

    const { analyze } = await loadGateway();
    await expect(analyze({ prompt: "Classify this failure" })).rejects.toThrow(/OpenAI API error: 429/);
  });

  it("sends the system prompt as the first chat message when one is supplied", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ choices: [{ message: { content: '{"classification":"flaky"}' } }] })
    );

    const { analyze } = await loadGateway();
    await analyze({
      prompt: "Classify this failure",
      systemPrompt: "You are a QA analyst.",
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.messages).toEqual([
      { role: "system", content: "You are a QA analyst." },
      { role: "user", content: "Classify this failure" },
    ]);
  });

  it("asks for a JSON object when a schema is attached", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        choices: [{ message: { content: '{"classification":"flaky","confidence":0.9}' } }],
      })
    );

    const { analyze } = await loadGateway();
    await analyze({ prompt: "Classify this failure" }, { schema: Classification });

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.response_format).toEqual({ type: "json_object" });
  });
});

describe("Anthropic provider", () => {
  // The provider is named explicitly rather than inferred from whichever key
  // happens to be set first, so these tests keep their meaning as the
  // precedence rules in getActiveProvider change.
  const anthropic = { provider: "anthropic" } as const;

  it("returns the parsed completion", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ content: [{ text: '{"classification":"flaky"}' }] }));

    const { analyze } = await loadGateway();
    const response = await analyze({ prompt: "Classify this failure" }, anthropic);

    expect(response.provider).toBe("anthropic");
    expect(response.data).toEqual({ classification: "flaky" });
  });

  it("validates the completion against a supplied schema", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        content: [{ text: '{"classification":"flaky","confidence":0.9}' }],
      })
    );

    const { analyze } = await loadGateway();
    const response = await analyze(
      { prompt: "Classify this failure" },
      { ...anthropic, schema: Classification }
    );

    expect(response.data).toEqual({ classification: "flaky", confidence: 0.9 });
  });

  it("rejects a malformed envelope", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ choices: [] }));

    const { analyze } = await loadGateway();
    await expect(analyze({ prompt: "Classify this failure" }, anthropic)).rejects.toThrow(
      /Unexpected Anthropic response shape/
    );
  });

  it("surfaces the upstream status on an error response", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 500));

    const { analyze } = await loadGateway();
    await expect(analyze({ prompt: "Classify this failure" }, anthropic)).rejects.toThrow(
      /Anthropic API error: 500/
    );
  });

  it("puts the system prompt in the top-level field Anthropic expects", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ content: [{ text: '{"classification":"flaky"}' }] }));

    const { analyze } = await loadGateway();
    await analyze({ prompt: "Classify this", systemPrompt: "You are a QA analyst." }, anthropic);

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.system).toBe("You are a QA analyst.");
  });
});

describe("fallback", () => {
  it("falls back to the mock provider when configured to", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 503));

    const { analyze } = await loadGateway();
    const response = await analyze({ prompt: "Classify this failure" }, { fallbackToMock: true });

    // A provider outage must degrade the feature, not fail the request.
    expect(response.provider).toBe("mock");
    expect(response.data).toMatchObject({ classification: expect.any(String) });
  });

  it("propagates the failure when no fallback is configured", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 503));

    const { analyze } = await loadGateway();
    await expect(analyze({ prompt: "Classify this failure" })).rejects.toThrow(/OpenAI API error: 503/);
  });
});
