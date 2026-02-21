import { describe, it, expect, beforeEach } from "vitest";
import { createMockSupabase, createChainableMock } from "@/test/mocks/supabase";
import {
  resolveBroadcastRecipients,
  loadUserBroadcastContext,
  userMatchesBroadcastTargetingSync,
  userMatchesBroadcastTargeting,
  canUserReplyToBroadcast,
} from "./broadcast-targeting";

describe("resolveBroadcastRecipients", () => {
  let supabase: ReturnType<typeof createMockSupabase>["supabase"];
  let mockFrom: ReturnType<typeof createMockSupabase>["mockFrom"];

  beforeEach(() => {
    ({ supabase, mockFrom } = createMockSupabase());
  });

  it("returns empty array for clan type without clanId", async () => {
    const result = await resolveBroadcastRecipients(supabase, {
      senderId: "sender",
      messageType: "clan",
    });
    expect(result).toEqual([]);
  });

  it("resolves clan members excluding sender", async () => {
    const chain = createChainableMock({
      data: [
        { game_accounts: { user_id: "user-1" } },
        { game_accounts: { user_id: "user-2" } },
        { game_accounts: { user_id: "sender" } },
      ],
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const result = await resolveBroadcastRecipients(supabase, {
      senderId: "sender",
      messageType: "clan",
      clanId: "clan-1",
    });
    expect(result).toContain("user-1");
    expect(result).toContain("user-2");
    expect(result).not.toContain("sender");
  });

  it("resolves broadcast recipients with rank filter", async () => {
    const chain = createChainableMock({
      data: [{ game_accounts: { user_id: "ranked-user" } }],
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const result = await resolveBroadcastRecipients(supabase, {
      senderId: "sender",
      messageType: "broadcast",
      targetRanks: ["leader"],
    });
    expect(result).toContain("ranked-user");
  });

  it("resolves all profiles for broadcast without rank filter", async () => {
    const chain = createChainableMock({
      data: [{ id: "user-a" }, { id: "user-b" }],
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const result = await resolveBroadcastRecipients(supabase, {
      senderId: "sender",
      messageType: "broadcast",
    });
    expect(result).toContain("user-a");
    expect(result).toContain("user-b");
  });

  it("includes role-targeted users", async () => {
    const callIndex = { count: 0 };
    mockFrom.mockImplementation(() => {
      callIndex.count++;
      if (callIndex.count === 1) {
        return createChainableMock({ data: [{ id: "profile-user" }], error: null });
      }
      return createChainableMock({ data: [{ user_id: "role-user" }], error: null });
    });

    const result = await resolveBroadcastRecipients(supabase, {
      senderId: "sender",
      messageType: "broadcast",
      targetRoles: ["admin"],
    });
    expect(result).toContain("role-user");
  });

  it("skips null game_accounts entries", async () => {
    const chain = createChainableMock({
      data: [{ game_accounts: null }, { game_accounts: { user_id: "valid" } }],
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const result = await resolveBroadcastRecipients(supabase, {
      senderId: "sender",
      messageType: "clan",
      clanId: "clan-1",
    });
    expect(result).toEqual(["valid"]);
  });

  it("handles null data from Supabase", async () => {
    const chain = createChainableMock({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await resolveBroadcastRecipients(supabase, {
      senderId: "sender",
      messageType: "clan",
      clanId: "clan-1",
    });
    expect(result).toEqual([]);
  });
});

describe("userMatchesBroadcastTargetingSync", () => {
  const ctx = {
    roles: ["admin"],
    memberships: [{ clan_id: "clan-1", rank: "leader" }],
  };

  it("returns false for non-broadcast/clan types", () => {
    expect(userMatchesBroadcastTargetingSync(ctx, { message_type: "private" })).toBe(false);
  });

  it("returns true when user role matches target_roles", () => {
    expect(
      userMatchesBroadcastTargetingSync(ctx, {
        message_type: "broadcast",
        target_roles: ["admin"],
      }),
    ).toBe(true);
  });

  it("returns false when neither roles nor memberships match", () => {
    const noMatchCtx = { roles: ["member"], memberships: [] };
    expect(
      userMatchesBroadcastTargetingSync(noMatchCtx, {
        message_type: "broadcast",
        target_roles: ["moderator"],
        target_ranks: ["leader"],
      }),
    ).toBe(false);
  });

  it("returns true for broadcast with no rank filter", () => {
    expect(userMatchesBroadcastTargetingSync({ roles: [], memberships: [] }, { message_type: "broadcast" })).toBe(true);
  });

  it("returns true for clan message when user is member of that clan", () => {
    expect(
      userMatchesBroadcastTargetingSync(ctx, {
        message_type: "clan",
        target_clan_id: "clan-1",
      }),
    ).toBe(true);
  });

  it("returns false for clan message when user is not a member", () => {
    expect(
      userMatchesBroadcastTargetingSync(ctx, {
        message_type: "clan",
        target_clan_id: "other-clan",
      }),
    ).toBe(false);
  });

  it("matches rank within specific clan", () => {
    expect(
      userMatchesBroadcastTargetingSync(ctx, {
        message_type: "clan",
        target_clan_id: "clan-1",
        target_ranks: ["leader"],
      }),
    ).toBe(true);
  });

  it("does not match rank in wrong clan", () => {
    expect(
      userMatchesBroadcastTargetingSync(ctx, {
        message_type: "clan",
        target_clan_id: "other-clan",
        target_ranks: ["leader"],
      }),
    ).toBe(false);
  });
});

describe("loadUserBroadcastContext", () => {
  it("loads roles and memberships", async () => {
    const { supabase, mockFrom } = createMockSupabase();
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return createChainableMock({ data: [{ role: "admin" }], error: null });
      }
      return createChainableMock({
        data: [{ clan_id: "c1", rank: "leader" }],
        error: null,
      });
    });

    const ctx = await loadUserBroadcastContext(supabase, "user-1");
    expect(ctx.roles).toEqual(["admin"]);
    expect(ctx.memberships).toEqual([{ clan_id: "c1", rank: "leader" }]);
  });

  it("handles empty results", async () => {
    const { supabase, mockFrom } = createMockSupabase();
    mockFrom.mockReturnValue(createChainableMock({ data: [], error: null }));
    const ctx = await loadUserBroadcastContext(supabase, "user-1");
    expect(ctx.roles).toEqual([]);
    expect(ctx.memberships).toEqual([]);
  });
});

describe("userMatchesBroadcastTargeting", () => {
  it("returns false for non-broadcast message type", async () => {
    const { supabase } = createMockSupabase();
    const result = await userMatchesBroadcastTargeting(supabase, "user-1", {
      message_type: "private",
    });
    expect(result).toBe(false);
  });

  it("returns true when user role matches", async () => {
    const { supabase, mockFrom } = createMockSupabase();
    mockFrom.mockReturnValue(createChainableMock({ data: [{ user_id: "user-1" }], error: null }));
    const result = await userMatchesBroadcastTargeting(supabase, "user-1", {
      message_type: "broadcast",
      target_roles: ["admin"],
    });
    expect(result).toBe(true);
  });

  it("returns true for broadcast with no targeting", async () => {
    const { supabase } = createMockSupabase();
    const result = await userMatchesBroadcastTargeting(supabase, "user-1", {
      message_type: "broadcast",
    });
    expect(result).toBe(true);
  });
});

describe("canUserReplyToBroadcast", () => {
  it("allows owner role to reply to any broadcast", async () => {
    const { supabase, mockFrom } = createMockSupabase();
    mockFrom.mockReturnValue(createChainableMock({ data: { role: "owner" }, error: null }));
    const result = await canUserReplyToBroadcast(supabase, "user-1", null);
    expect(result).toBe(true);
  });

  it("denies non-owner without target clan", async () => {
    const { supabase, mockFrom } = createMockSupabase();
    mockFrom.mockReturnValue(createChainableMock({ data: { role: "member" }, error: null }));
    const result = await canUserReplyToBroadcast(supabase, "user-1", null);
    expect(result).toBe(false);
  });

  it("allows leader rank in target clan", async () => {
    const { supabase, mockFrom } = createMockSupabase();
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return createChainableMock({ data: { role: "member" }, error: null });
      }
      return createChainableMock({
        data: [{ game_accounts: { user_id: "user-1" } }],
        error: null,
      });
    });
    const result = await canUserReplyToBroadcast(supabase, "user-1", "clan-1");
    expect(result).toBe(true);
  });

  it("denies non-leader rank in target clan", async () => {
    const { supabase, mockFrom } = createMockSupabase();
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return createChainableMock({ data: { role: "member" }, error: null });
      }
      return createChainableMock({ data: [], error: null });
    });
    const result = await canUserReplyToBroadcast(supabase, "user-1", "clan-1");
    expect(result).toBe(false);
  });
});
