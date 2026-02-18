import { describe, it, expect } from "vitest";
import type { AuthError, PostgrestError } from "@supabase/supabase-js";
import { classifySupabaseError, getAuthErrorKey, getErrorMessageKey, type SupabaseErrorKind } from "./error-utils";

/** Helper to build a minimal PostgrestError. */
function makeError(overrides: Partial<PostgrestError>): PostgrestError {
  return {
    name: "PostgrestError",
    message: overrides.message ?? "something went wrong",
    details: overrides.details ?? "",
    hint: overrides.hint ?? "",
    code: overrides.code ?? "",
  };
}

describe("classifySupabaseError", () => {
  it("returns 'permission' for RLS error code 42501", () => {
    const error = makeError({ code: "42501", message: "new row violates policy" });
    expect(classifySupabaseError(error)).toBe("permission");
  });

  it("returns 'permission' when message contains 'row-level security'", () => {
    const error = makeError({
      code: "99999",
      message: 'new row violates row-level security policy for table "events"',
    });
    expect(classifySupabaseError(error)).toBe("permission");
  });

  it("returns 'auth' for PGRST301 code", () => {
    const error = makeError({ code: "PGRST301", message: "JWT expired" });
    expect(classifySupabaseError(error)).toBe("auth");
  });

  it("returns 'auth' for 401 code", () => {
    const error = makeError({ code: "401", message: "Unauthorized" });
    expect(classifySupabaseError(error)).toBe("auth");
  });

  it("returns 'network' when message contains 'fetch'", () => {
    const error = makeError({ code: "", message: "Failed to fetch" });
    expect(classifySupabaseError(error)).toBe("network");
  });

  it("returns 'network' when message contains 'network'", () => {
    const error = makeError({ code: "", message: "Network request failed" });
    expect(classifySupabaseError(error)).toBe("network");
  });

  it("returns 'unknown' for unrecognized errors", () => {
    const error = makeError({ code: "23505", message: "duplicate key value" });
    expect(classifySupabaseError(error)).toBe("unknown");
  });

  it("prioritizes RLS code over auth codes", () => {
    const error = makeError({ code: "42501", message: "Unauthorized" });
    expect(classifySupabaseError(error)).toBe("permission");
  });
});

describe("getErrorMessageKey", () => {
  const expectedMapping: Record<SupabaseErrorKind, string> = {
    permission: "permissionDenied",
    auth: "sessionExpired",
    network: "networkError",
    unknown: "unexpectedError",
  };

  for (const [kind, expectedKey] of Object.entries(expectedMapping)) {
    it(`maps '${kind}' to '${expectedKey}'`, () => {
      expect(getErrorMessageKey(kind as SupabaseErrorKind)).toBe(expectedKey);
    });
  }
});

/** Helper to build a minimal AuthError. */
function makeAuthError(message: string): AuthError {
  return { name: "AuthApiError", message, status: 400 } as AuthError;
}

describe("getAuthErrorKey", () => {
  it("maps 'Invalid login credentials' to 'invalidCredentials'", () => {
    expect(getAuthErrorKey(makeAuthError("Invalid login credentials"))).toBe("invalidCredentials");
  });

  it("maps 'invalid credentials' (alternate wording) to 'invalidCredentials'", () => {
    expect(getAuthErrorKey(makeAuthError("invalid credentials"))).toBe("invalidCredentials");
  });

  it("maps 'Email not confirmed' to 'emailNotConfirmed'", () => {
    expect(getAuthErrorKey(makeAuthError("Email not confirmed"))).toBe("emailNotConfirmed");
  });

  it("maps 'User already registered' to 'userAlreadyRegistered'", () => {
    expect(getAuthErrorKey(makeAuthError("User already registered"))).toBe("userAlreadyRegistered");
  });

  it("maps 'Password should be at least 6 characters' to 'passwordTooShort'", () => {
    expect(getAuthErrorKey(makeAuthError("Password should be at least 6 characters"))).toBe("passwordTooShort");
  });

  it("maps 'Unable to validate email address: invalid format' to 'invalidEmail'", () => {
    expect(getAuthErrorKey(makeAuthError("Unable to validate email address: invalid format"))).toBe("invalidEmail");
  });

  it("maps 'Signup is disabled' to 'signupDisabled'", () => {
    expect(getAuthErrorKey(makeAuthError("Signup is disabled"))).toBe("signupDisabled");
  });

  it("maps rate-limit message to 'tooManyRequests'", () => {
    expect(getAuthErrorKey(makeAuthError("For security purposes, you can only request this after 52 seconds"))).toBe(
      "tooManyRequests",
    );
  });

  it("maps 'Too many requests' to 'tooManyRequests'", () => {
    expect(getAuthErrorKey(makeAuthError("Too many requests"))).toBe("tooManyRequests");
  });

  it("returns 'unknownError' for unrecognized messages", () => {
    expect(getAuthErrorKey(makeAuthError("Something completely unexpected"))).toBe("unknownError");
  });

  it("matching is case-insensitive", () => {
    expect(getAuthErrorKey(makeAuthError("INVALID LOGIN CREDENTIALS"))).toBe("invalidCredentials");
  });
});
