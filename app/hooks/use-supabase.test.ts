// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const mockClient = { auth: {}, from: vi.fn() } as unknown;

vi.mock("../../lib/supabase/browser-client", () => ({
  default: vi.fn(() => mockClient),
}));

import { useSupabase } from "./use-supabase";

describe("useSupabase", () => {
  it("returns a SupabaseClient instance", () => {
    const { result } = renderHook(() => useSupabase());
    expect(result.current).toBe(mockClient);
  });

  it("returns the same instance across re-renders", () => {
    const { result, rerender } = renderHook(() => useSupabase());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
