import { describe, it, expect } from "vitest";
import { z } from "zod";
import { apiError, parseJsonBody, sitePageQuerySchema } from "./validation";

/* ------------------------------------------------------------------ */
/*  apiError                                                           */
/* ------------------------------------------------------------------ */

describe("apiError", () => {
  it("returns a NextResponse with correct status", async () => {
    const res = apiError("Something went wrong", 500);
    expect(res.status).toBe(500);
  });

  it("response body contains the error message", async () => {
    const res = apiError("Bad request", 400);
    const body = await res.json();
    expect(body).toEqual({ error: "Bad request" });
  });

  it("works with different status codes (400, 401, 403, 404, 500)", async () => {
    const statuses = [400, 401, 403, 404, 500] as const;
    for (const status of statuses) {
      const res = apiError("Error", status);
      expect(res.status).toBe(status);
      const body = await res.json();
      expect(body).toEqual({ error: "Error" });
    }
  });
});

/* ------------------------------------------------------------------ */
/*  parseJsonBody                                                      */
/* ------------------------------------------------------------------ */

const nameSchema = z.object({ name: z.string() });

describe("parseJsonBody", () => {
  it("valid JSON that matches schema returns { data }", async () => {
    const request = new Request("http://test", {
      method: "POST",
      body: JSON.stringify({ name: "Alice" }),
    });
    const result = await parseJsonBody(request, nameSchema);
    expect(result).toHaveProperty("data");
    expect(result).not.toHaveProperty("error");
    if ("data" in result) {
      expect(result.data).toEqual({ name: "Alice" });
    }
  });

  it("valid JSON that doesn't match schema returns { error } with 400 status", async () => {
    const request = new Request("http://test", {
      method: "POST",
      body: JSON.stringify({ name: 123 }),
    });
    const result = await parseJsonBody(request, nameSchema);
    expect(result).toHaveProperty("error");
    expect(result).not.toHaveProperty("data");
    expect(result.error).toBeDefined();
    expect(result.error!.status).toBe(400);
    const body = await result.error!.json();
    expect(body).toEqual({ error: "Invalid input." });
  });

  it("invalid JSON (non-JSON body) returns { error } with 400 status", async () => {
    const request = new Request("http://test", {
      method: "POST",
      body: "not valid json",
    });
    const result = await parseJsonBody(request, nameSchema);
    expect(result).toHaveProperty("error");
    expect(result).not.toHaveProperty("data");
    expect(result.error).toBeDefined();
    expect(result.error!.status).toBe(400);
    const body2 = await result.error!.json();
    expect(body2).toEqual({ error: "Invalid JSON body." });
  });
});

/* ------------------------------------------------------------------ */
/*  sitePageQuerySchema                                                */
/* ------------------------------------------------------------------ */

describe("sitePageQuerySchema", () => {
  it("valid page string passes", () => {
    const result = sitePageQuerySchema.safeParse({ page: "1" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe("1");
    }
  });

  it("empty string fails", () => {
    const result = sitePageQuerySchema.safeParse({ page: "" });
    expect(result.success).toBe(false);
  });

  it("missing page fails", () => {
    const result = sitePageQuerySchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
