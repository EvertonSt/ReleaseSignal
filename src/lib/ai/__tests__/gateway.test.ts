import { describe, it, expect, beforeEach } from "vitest";
import { analyze, PROMPTS } from "../gateway";
import { z } from "zod";

// Ensure mock provider is used
beforeEach(() => {
  process.env.NEXT_PUBLIC_DEMO_MODE = "true";
  delete process.env.OPENAI_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
});

const classifySchema = z.object({
  classification: z.string(),
  confidence: z.number(),
  explanation: z.string(),
  suggestedAction: z.string(),
});

const summarizeSchema = z.object({
  summary: z.string(),
  riskLevel: z.string(),
  blockingIssues: z.number(),
});

describe("analyze (mock provider)", () => {
  it("returns a mock response with correct shape", async () => {
    const response = await analyze({ prompt: "Classify this failure" });
    expect(response.provider).toBe("mock");
    expect(response.model).toBe("mock-v1");
    expect(response.latency).toBeGreaterThanOrEqual(0);
    expect(response.cached).toBe(false);
    expect(response.data).toBeDefined();
  });

  it("returns mock classify data by default", async () => {
    const response = await analyze({ prompt: "Classify" });
    expect(response.data).toHaveProperty("classification");
  });

  it("validates against schema when provided", async () => {
    const response = await analyze({ prompt: "Classify" }, { schema: classifySchema });
    const result = classifySchema.safeParse(response.data);
    expect(result.success).toBe(true);
  });

  it("validates summarize schema", async () => {
    const response = await analyze({ prompt: "Summarize" }, { schema: summarizeSchema });
    expect(summarizeSchema.safeParse(response.data).success).toBe(true);
  });

  it("falls back to the classify payload when no fixture matches", async () => {
    const response = await analyze({ prompt: "something unrecognised" });
    expect(response.data).toHaveProperty("classification");
  });

  it("returns tokens as zeros for mock", async () => {
    const response = await analyze({ prompt: "test" });
    expect(response.tokens.input).toBe(0);
    expect(response.tokens.output).toBe(0);
  });

  it("respects provider option", async () => {
    const response = await analyze({ prompt: "test" }, { provider: "mock" });
    expect(response.provider).toBe("mock");
  });

  it("returns data property from mock", async () => {
    const response = await analyze<{ classification: string }>(
      { prompt: "test" },
      { schema: classifySchema }
    );
    expect(response.data.classification).toBeDefined();
  });
});

describe("analyze fallback", () => {
  it("falls back to mock when openai key missing", async () => {
    const response = await analyze({ prompt: "test" }, { provider: "openai", fallbackToMock: true });
    expect(response.provider).toBe("mock");
    expect(response.model).toBe("mock-v1");
  });

  it("falls back to mock when anthropic key missing", async () => {
    const response = await analyze({ prompt: "test" }, { provider: "anthropic", fallbackToMock: true });
    expect(response.provider).toBe("mock");
  });

  it("throws when provider fails and no fallback", async () => {
    await expect(
      analyze({ prompt: "test" }, { provider: "openai", fallbackToMock: false })
    ).rejects.toThrow();
  });
});

describe("PROMPTS templates", () => {
  it("has classifyFailure prompt", () => {
    expect(PROMPTS.classifyFailure).toContain("Classify");
    expect(PROMPTS.classifyFailure).toContain("{testTitle}");
    expect(PROMPTS.classifyFailure).toContain("{errorMessage}");
  });

  it("has explainFailure prompt", () => {
    expect(PROMPTS.explainFailure).toContain("Explain");
    expect(PROMPTS.explainFailure).toContain("{testTitle}");
  });

  it("has summarizeRelease prompt", () => {
    expect(PROMPTS.summarizeRelease).toContain("Summarize");
    expect(PROMPTS.summarizeRelease).toContain("{total}");
    expect(PROMPTS.summarizeRelease).toContain("{failed}");
  });

  it("has suggestRemediation prompt", () => {
    expect(PROMPTS.suggestRemediation).toContain("remediation");
    expect(PROMPTS.suggestRemediation).toContain("{classification}");
  });
});

describe("mock response shapes", () => {
  it("classify mock has expected fields", async () => {
    const response = await analyze({ prompt: "classify" }, { schema: classifySchema });
    const data = response.data as z.infer<typeof classifySchema>;
    expect(typeof data.classification).toBe("string");
    expect(typeof data.confidence).toBe("number");
    expect(typeof data.explanation).toBe("string");
    expect(typeof data.suggestedAction).toBe("string");
  });
});
