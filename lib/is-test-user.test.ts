import { describe, it, expect } from "vitest";
import { isTestUser } from "./is-test-user";

describe("isTestUser", () => {
  it("matches standard E2E test owner email", () => {
    expect(isTestUser("test-owner@example.com")).toBe(true);
  });

  it("matches test admin email", () => {
    expect(isTestUser("test-admin@example.com")).toBe(true);
  });

  it("matches minimal test- prefix", () => {
    expect(isTestUser("test-@example.com")).toBe(true);
  });

  it("rejects real user with example.com domain", () => {
    expect(isTestUser("realuser@example.com")).toBe(false);
  });

  it("rejects test- prefix with different domain", () => {
    expect(isTestUser("test-owner@gmail.com")).toBe(false);
  });

  it("is case-sensitive (uppercase rejected)", () => {
    expect(isTestUser("TEST-OWNER@example.com")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isTestUser("")).toBe(false);
  });

  it("rejects email without test- prefix", () => {
    expect(isTestUser("owner@example.com")).toBe(false);
  });
});
