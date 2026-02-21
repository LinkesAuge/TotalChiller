import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import * as Sentry from "@sentry/nextjs";
import { captureApiError } from "./logger";

const mockCaptureException = vi.mocked(Sentry.captureException);

describe("captureApiError", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockCaptureException.mockClear();
  });

  it("logs error to console with context prefix", () => {
    const error = new Error("test failure");
    captureApiError("GET /api/test", error);
    expect(console.error).toHaveBeenCalledWith("[GET /api/test]", error);
  });

  it("sends Error instances directly to Sentry", () => {
    const error = new Error("db failure");
    captureApiError("POST /api/data", error);
    expect(mockCaptureException).toHaveBeenCalledWith(error, {
      tags: { apiContext: "POST /api/data" },
    });
  });

  it("wraps non-Error values in a new Error for Sentry", () => {
    captureApiError("DELETE /api/item", "string error");
    const sentryArg = mockCaptureException.mock.calls[0][0];
    expect(sentryArg).toBeInstanceOf(Error);
    expect((sentryArg as Error).message).toBe("string error");
  });

  it("wraps numeric errors", () => {
    captureApiError("PATCH /api/x", 404);
    const sentryArg = mockCaptureException.mock.calls[0][0];
    expect((sentryArg as Error).message).toBe("404");
  });

  it("wraps null/undefined errors", () => {
    captureApiError("PUT /api/y", null);
    const sentryArg = mockCaptureException.mock.calls[0][0];
    expect((sentryArg as Error).message).toBe("null");
  });
});
