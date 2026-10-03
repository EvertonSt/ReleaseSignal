import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

/*
 * Every test starts from a clean DOM. Without this, a component test that
 * renders twice leaks the first render's nodes into the second and the failure
 * points at the assertion rather than at the leak.
 */
afterEach(() => {
  cleanup();
});
