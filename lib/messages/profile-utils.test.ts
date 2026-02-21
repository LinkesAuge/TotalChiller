import { describe, it, expect } from "vitest";
import { createMockSupabase, createChainableMock } from "@/test/mocks/supabase";
import {
  buildMessageProfileMap,
  loadMessageProfilesByIds,
  resolveMessageProfileLabel,
  mapRecipientsWithProfiles,
} from "./profile-utils";

describe("buildMessageProfileMap", () => {
  it("builds a map keyed by profile id", () => {
    const profiles = [
      { id: "u1", username: "alice", display_name: "Alice A" },
      { id: "u2", username: "bob", display_name: null },
    ];
    const map = buildMessageProfileMap(profiles as never);
    expect(map["u1"]).toEqual({ username: "alice", display_name: "Alice A" });
    expect(map["u2"]).toEqual({ username: "bob", display_name: null });
  });

  it("returns empty map for empty input", () => {
    expect(buildMessageProfileMap([])).toEqual({});
  });
});

describe("loadMessageProfilesByIds", () => {
  it("loads profiles for given IDs", async () => {
    const { supabase, mockFrom } = createMockSupabase();
    mockFrom.mockReturnValue(
      createChainableMock({
        data: [{ id: "u1", username: "alice", display_name: "Alice" }],
        error: null,
      }),
    );

    const result = await loadMessageProfilesByIds(supabase, ["u1"]);
    expect(result["u1"]).toEqual({ username: "alice", display_name: "Alice" });
  });

  it("returns empty map for empty ID array", async () => {
    const { supabase } = createMockSupabase();
    const result = await loadMessageProfilesByIds(supabase, []);
    expect(result).toEqual({});
  });

  it("deduplicates IDs", async () => {
    const { supabase, mockFrom } = createMockSupabase();
    const chain = createChainableMock({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await loadMessageProfilesByIds(supabase, ["u1", "u1", "u2"]);
    expect(chain.in).toHaveBeenCalledWith("id", ["u1", "u2"]);
  });

  it("filters out empty string IDs", async () => {
    const { supabase, mockFrom } = createMockSupabase();
    const chain = createChainableMock({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await loadMessageProfilesByIds(supabase, ["", "u1"]);
    expect(chain.in).toHaveBeenCalledWith("id", ["u1"]);
  });

  it("handles null data from Supabase", async () => {
    const { supabase, mockFrom } = createMockSupabase();
    mockFrom.mockReturnValue(createChainableMock({ data: null, error: null }));

    const result = await loadMessageProfilesByIds(supabase, ["u1"]);
    expect(result).toEqual({});
  });
});

describe("resolveMessageProfileLabel", () => {
  it("returns display_name when available", () => {
    expect(resolveMessageProfileLabel({ username: "alice", display_name: "Alice A" }, "Unknown")).toBe("Alice A");
  });

  it("falls back to username when display_name is missing", () => {
    expect(resolveMessageProfileLabel({ username: "alice", display_name: null as unknown as string }, "Unknown")).toBe(
      "alice",
    );
  });

  it("returns fallback for null profile", () => {
    expect(resolveMessageProfileLabel(null, "Unknown")).toBe("Unknown");
  });

  it("returns fallback for undefined profile", () => {
    expect(resolveMessageProfileLabel(undefined, "Deleted User")).toBe("Deleted User");
  });
});

describe("mapRecipientsWithProfiles", () => {
  const profiles = {
    u1: { username: "alice", display_name: "Alice A" },
    u2: { username: "bob", display_name: null as unknown as string },
  };

  it("maps recipients with their profile labels", () => {
    const result = mapRecipientsWithProfiles(["u1", "u2"], profiles, "Unknown");
    expect(result).toEqual([
      { id: "u1", label: "Alice A" },
      { id: "u2", label: "bob" },
    ]);
  });

  it("uses fallback for unknown recipient IDs", () => {
    const result = mapRecipientsWithProfiles(["unknown-id"], profiles, "Deleted");
    expect(result).toEqual([{ id: "unknown-id", label: "Deleted" }]);
  });

  it("returns empty array for empty recipients", () => {
    expect(mapRecipientsWithProfiles([], profiles, "X")).toEqual([]);
  });
});
