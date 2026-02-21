import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendEmail } from "./send-email";

describe("sendEmail", () => {
  const validPayload = {
    to: "recipient@example.com",
    subject: "Test Subject",
    html: "<p>Hello</p>",
  };

  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("RESEND_FROM_EMAIL", "noreply@example.com");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns true on successful send", async () => {
    const result = await sendEmail(validPayload);
    expect(result).toBe(true);
  });

  it("calls the Resend API with correct params", async () => {
    await sendEmail(validPayload);
    expect(fetch).toHaveBeenCalledWith("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer re_test_key",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "noreply@example.com",
        to: "recipient@example.com",
        subject: "Test Subject",
        html: "<p>Hello</p>",
      }),
    });
  });

  it("returns false when RESEND_API_KEY is missing", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const result = await sendEmail(validPayload);
    expect(result).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns false when RESEND_FROM_EMAIL is missing", async () => {
    vi.stubEnv("RESEND_FROM_EMAIL", "");
    const result = await sendEmail(validPayload);
    expect(result).toBe(false);
  });

  it("returns false for invalid recipient with newline", async () => {
    const result = await sendEmail({ ...validPayload, to: "user@example.com\r\nBcc:evil@hack.com" });
    expect(result).toBe(false);
  });

  it("returns false for recipient with null byte", async () => {
    const result = await sendEmail({ ...validPayload, to: "user@exam\0ple.com" });
    expect(result).toBe(false);
  });

  it("returns false when API responds with non-ok status", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);
    const result = await sendEmail(validPayload);
    expect(result).toBe(false);
  });

  it("returns false when fetch throws a network error", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network down"));
    const result = await sendEmail(validPayload);
    expect(result).toBe(false);
  });
});
