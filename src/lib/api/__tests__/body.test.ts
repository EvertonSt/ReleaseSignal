import { describe, it, expect } from "vitest";
import { z } from "zod";
import { readJson, HttpError, statusFor, messageFor } from "../body";

function request(body: string): Request {
  return new Request("https://example.test/api", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

const Schema = z.object({
  name: z.string().min(1),
  count: z.number().int().min(0).optional(),
});

describe("readJson", () => {
  it("returns the parsed value for a valid body", async () => {
    await expect(readJson(request('{"name":"acme","count":3}'), Schema)).resolves.toEqual({
      name: "acme",
      count: 3,
    });
  });

  it("rejects malformed JSON with a 400", async () => {
    // 400 rather than 422: the caller did not send JSON at all, which is a
    // different mistake from sending JSON in the wrong shape.
    await expect(readJson(request("{not json"), Schema)).rejects.toMatchObject({
      status: 400,
      message: "Request body must be valid JSON",
    });
  });

  it("rejects a well-formed but invalid body with a 422", async () => {
    await expect(readJson(request('{"count":1}'), Schema)).rejects.toMatchObject({ status: 422 });
  });

  it("names the offending field in the error message", async () => {
    // A handler that returns "Validation failed" sends the caller hunting.
    const error = await readJson(request('{"name":""}'), Schema).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).message).toContain("name");
  });

  it("strips keys the schema does not declare", async () => {
    const body = await readJson(request('{"name":"acme","isAdmin":true}'), Schema);
    expect(body).toEqual({ name: "acme" });
  });

  it("refuses a string where a number is declared", async () => {
    // The whole point of parsing at the boundary: "many" must never reach an
    // arithmetic comparison downstream.
    await expect(readJson(request('{"name":"acme","count":"many"}'), Schema)).rejects.toBeInstanceOf(
      HttpError
    );
  });
});

describe("HttpError", () => {
  it("keeps the status it was constructed with", () => {
    const error = new HttpError(409, "duplicate");
    expect(error.status).toBe(409);
    expect(error.name).toBe("HttpError");
    expect(error).toBeInstanceOf(Error);
  });
});

describe("statusFor", () => {
  it("passes an HttpError status straight through", () => {
    expect(statusFor(new HttpError(422, "nope"))).toBe(422);
  });

  it("treats anything else as a server fault", () => {
    expect(statusFor(new Error("boom"))).toBe(500);
    expect(statusFor("a string")).toBe(500);
  });
});

describe("messageFor", () => {
  it("surfaces the validation message for a client error", () => {
    expect(messageFor(new HttpError(422, "name: too short"), "failed")).toBe("name: too short");
  });

  it("does not leak an internal message in production", () => {
    // `NODE_ENV` is read-only in the type definitions but writable at runtime,
    // so the swap goes through a narrow alias rather than a blanket cast.
    const env = process.env as { NODE_ENV?: string };
    const previous = env.NODE_ENV;
    env.NODE_ENV = "production";
    try {
      // A stack trace in an API response is a disclosure bug; in production the
      // caller gets the generic message and the detail stays in the server log.
      expect(messageFor(new Error("connect ECONNREFUSED 10.0.0.4:5432"), "Classification failed")).toBe(
        "Classification failed"
      );
    } finally {
      env.NODE_ENV = previous;
    }
  });
});
