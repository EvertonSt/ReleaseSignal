import { type z } from "zod";

/**
 * An error that carries the HTTP status the response should use.
 *
 * Route handlers use this to tell "the caller sent something we rejected"
 * apart from "something blew up on our side" - the difference between a 4xx a
 * client can fix and a 5xx somebody has to be paged for.
 */
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

/** Flattens zod issues into one line a human can act on. */
function describeIssues(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`).join("; ");
}

/**
 * Reads and validates a request body against a schema.
 *
 * `request.json()` is typed `any`, so destructuring it hands every downstream
 * call a value the compiler cannot check - and it lets a caller post
 * `{"totalTests": "many"}` straight into an arithmetic comparison. Validating
 * at the boundary is the cheapest control in the codebase: past this line,
 * every field has a type the compiler will defend.
 */
export async function readJson<S extends z.ZodType>(request: Request, schema: S): Promise<z.output<S>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON");
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new HttpError(422, describeIssues(parsed.error));
  }

  return parsed.data;
}

/** Maps a thrown value onto a status code a handler should return. */
export function statusFor(error: unknown): number {
  return error instanceof HttpError ? error.status : 500;
}

/** Human-readable message for a thrown value, safe to put in a response. */
export function messageFor(error: unknown, fallback: string): string {
  if (error instanceof HttpError) return error.message;
  return process.env.NODE_ENV === "production" ? fallback : String(error);
}
