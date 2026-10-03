import { z } from "zod";

// ── AI Gateway ─────────────────────────────────────────────────────────────
// Provider-agnostic AI interface with structured output, fallback, and mocking.

export type AIProvider = "openai" | "anthropic" | "ollama" | "mock";

export interface AIRequest {
  prompt: string;
  systemPrompt?: string;
  schema?: z.ZodType;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

export interface AIResponse<T = unknown> {
  data: T;
  provider: AIProvider;
  model: string;
  tokens: { input: number; output: number };
  latency: number;
  cached: boolean;
}

// ── Mock Provider ──────────────────────────────────────────────────────────

const MOCK_RESPONSES = {
  classify: {
    classification: "regression",
    confidence: 0.85,
    explanation: "This failure is likely a regression caused by a recent code change.",
    suggestedAction: "Review the last 5 commits touching the affected module.",
  },
  explain: {
    explanation:
      "The test failed because the expected value did not match the actual result. This suggests a behavioral change in the code under test.",
    rootCause: "Value mismatch after recent refactoring",
    confidence: 0.8,
  },
  summarize: {
    summary:
      "Release contains 3 new regressions and 2 flaky tests. Overall risk is medium. Recommend investigating the regressions before merging.",
    riskLevel: "medium",
    blockingIssues: 3,
  },
  remediate: {
    steps: [
      "Review the failing test and its assertions",
      "Check recent commits for breaking changes",
      "Run the test locally to reproduce",
      "Fix the root cause or update the test",
    ],
    estimatedEffort: "medium",
  },
} satisfies Record<string, unknown>;

type MockResponseKey = keyof typeof MOCK_RESPONSES;

/**
 * Chooses the fixture whose name appears in the prompt, falling back to the
 * classification payload. Hard-coding the first entry meant the mock provider
 * answered a summarize request with a classification, so three of the four
 * prompt shapes could not be exercised at all in demo mode or in tests.
 */
function pickMockResponse(prompt: string): unknown {
  const needle = prompt.toLowerCase();
  const match = (Object.keys(MOCK_RESPONSES) as MockResponseKey[]).find((key) => needle.includes(key));
  return MOCK_RESPONSES[match ?? "classify"];
}

function mockProvider<T>(prompt: string, schema?: z.ZodType): T {
  const data = pickMockResponse(prompt);

  if (schema) {
    const result = schema.safeParse(data);
    if (result.success) return result.data as T;
  }

  return data as T;
}

// ── Response Decoding ──────────────────────────────────────────────────────

/*
 * A provider's HTTP response is untrusted input, exactly like a request body:
 * it can arrive malformed, truncated, or shaped differently after an API
 * version bump. Parsing it into `any` and then reading `.choices[0]` is how a
 * provider change becomes an unexplained runtime error three weeks later.
 */
const OpenAiResponse = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().nullable() }) })).min(1),
});

const AnthropicResponse = z.object({
  content: z.array(z.object({ text: z.string().nullable() })).min(1),
});

/**
 * Turns a model's raw text into `T`.
 *
 * A model is an untrusted source like any other: it can return prose, a
 * truncated object, or something that happens to satisfy the schema for the
 * wrong reason. Parsing and validating here means a bad completion throws a
 * named error instead of flowing onward as a half-shaped object.
 */
function decodeModelOutput<T>(content: string, schema: z.ZodType | undefined): T {
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    throw new Error("Model returned content that is not JSON");
  }

  if (!schema) return raw as T;

  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Schema validation failed: ${result.error.message}`);
  }
  return result.data as T;
}

// ── OpenAI Provider ────────────────────────────────────────────────────────

async function openaiProvider<T>(request: AIRequest, schema?: z.ZodType): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        ...(request.systemPrompt ? [{ role: "system", content: request.systemPrompt }] : []),
        { role: "user", content: request.prompt },
      ],
      temperature: request.temperature ?? 0.3,
      max_tokens: request.maxTokens ?? 1000,
      response_format: schema ? { type: "json_object" } : undefined,
    }),
    signal: AbortSignal.timeout(request.timeout ?? 10000),
  });

  if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);

  const envelope = OpenAiResponse.safeParse(await response.json());
  if (!envelope.success) {
    throw new Error(`Unexpected OpenAI response shape: ${envelope.error.message}`);
  }

  const content = envelope.data.choices[0]?.message.content;
  if (!content) throw new Error("Empty response from OpenAI");

  return decodeModelOutput<T>(content, schema);
}

// ── Anthropic Provider ─────────────────────────────────────────────────────

async function anthropicProvider<T>(request: AIRequest, schema?: z.ZodType): Promise<T> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-haiku-20240307",
      max_tokens: request.maxTokens ?? 1000,
      system: request.systemPrompt,
      messages: [{ role: "user", content: request.prompt }],
    }),
    signal: AbortSignal.timeout(request.timeout ?? 10000),
  });

  if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`);

  const envelope = AnthropicResponse.safeParse(await response.json());
  if (!envelope.success) {
    throw new Error(`Unexpected Anthropic response shape: ${envelope.error.message}`);
  }

  const content = envelope.data.content[0]?.text;
  if (!content) throw new Error("Empty response from Anthropic");

  return decodeModelOutput<T>(content, schema);
}

// ── Gateway ────────────────────────────────────────────────────────────────

export async function analyze<T = unknown>(
  request: AIRequest,
  options: {
    provider?: AIProvider;
    schema?: z.ZodType;
    fallbackToMock?: boolean;
  } = {}
): Promise<AIResponse<T>> {
  const provider = options.provider ?? getActiveProvider();
  const start = Date.now();

  try {
    let data: T;

    switch (provider) {
      case "openai":
        data = await openaiProvider<T>(request, options.schema);
        break;
      case "anthropic":
        data = await anthropicProvider<T>(request, options.schema);
        break;
      case "mock":
      default:
        data = mockProvider<T>(request.prompt, options.schema);
        break;
    }

    return {
      data,
      provider,
      model: provider === "mock" ? "mock-v1" : provider,
      tokens: { input: 0, output: 0 },
      latency: Date.now() - start,
      cached: false,
    };
  } catch (error) {
    // Fallback to mock if configured
    if (options.fallbackToMock && provider !== "mock") {
      const data = mockProvider<T>(request.prompt, options.schema);
      return {
        data,
        provider: "mock",
        model: "mock-v1",
        tokens: { input: 0, output: 0 },
        latency: Date.now() - start,
        cached: false,
      };
    }
    throw error;
  }
}

function getActiveProvider(): AIProvider {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") return "mock";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return "mock";
}

// ── Prompt Templates ───────────────────────────────────────────────────────

export const PROMPTS = {
  classifyFailure: `You are a QA failure analyst. Classify this test failure.

Test: {testTitle}
Error: {errorMessage}
Stack: {stackTrace}
History: {historicalContext}

Return JSON: { classification, confidence, explanation, suggestedAction }`,

  explainFailure: `Explain why this test failure occurred and what it means for release quality.

Test: {testTitle}
Error: {errorMessage}
Context: {context}

Return JSON: { explanation, rootCause, confidence, relatedChanges }`,

  summarizeRelease: `Summarize the release risk based on these test results.

Total tests: {total}
Passed: {passed}
Failed: {failed}
Flaky: {flaky}
New regressions: {newRegressions}

Return JSON: { summary, riskLevel, blockingIssues, recommendations }`,

  suggestRemediation: `Suggest remediation steps for this failure.

Classification: {classification}
Error: {errorMessage}
Context: {context}

Return JSON: { steps, estimatedEffort, priority }`,
};
