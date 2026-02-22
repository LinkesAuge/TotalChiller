import { describe, it, expect } from "vitest";
import {
  formatLabel,
  formatRank,
  formatRole,
  buildFallbackUserDb,
  normalizeMembershipRow,
  normalizeMembershipRows,
  resolveSection,
} from "./admin-types";
import type { MembershipQueryRow } from "./admin-types";

/* ------------------------------------------------------------------ */
/*  formatLabel                                                        */
/* ------------------------------------------------------------------ */

describe("formatLabel", () => {
  it("capitalizes first character of non-empty string", () => {
    const input = "leader";
    const actual = formatLabel(input);
    expect(actual).toBe("Leader");
  });

  it("preserves rest of string unchanged", () => {
    const input = "superior";
    const actual = formatLabel(input);
    expect(actual).toBe("Superior");
  });

  it("handles single character", () => {
    const input = "a";
    const actual = formatLabel(input);
    expect(actual).toBe("A");
  });

  it("returns empty string for empty input", () => {
    const input = "";
    const actual = formatLabel(input);
    expect(actual).toBe("");
  });

  it("returns value unchanged when already capitalized", () => {
    const input = "Leader";
    const actual = formatLabel(input);
    expect(actual).toBe("Leader");
  });

  it("handles string with only whitespace (truthy, so capitalizes first char)", () => {
    const input = " ";
    const actual = formatLabel(input);
    expect(actual).toBe(" ");
  });
});

/* ------------------------------------------------------------------ */
/*  formatRank                                                         */
/* ------------------------------------------------------------------ */

describe("formatRank", () => {
  it("returns German label for de locale and known rank", () => {
    const actual = formatRank("leader", "de");
    expect(actual).toBe("Anführer");
  });

  it("returns English label for en locale and known rank", () => {
    const actual = formatRank("officer", "en");
    expect(actual).toBe("Officer");
  });

  it("falls back to English when locale has no translation", () => {
    const actual = formatRank("leader", "fr");
    expect(actual).toBe("Leader");
  });

  it("falls back to formatLabel for unknown rank", () => {
    const actual = formatRank("unknown_rank", "en");
    expect(actual).toBe("Unknown_rank");
  });

  it("handles all known ranks in en", () => {
    const ranks = ["leader", "superior", "officer", "veteran", "soldier", "guest"];
    const expected = ["Leader", "Superior", "Officer", "Veteran", "Soldier", "Guest"];
    ranks.forEach((rank, i) => {
      expect(formatRank(rank, "en")).toBe(expected[i]);
    });
  });
});

/* ------------------------------------------------------------------ */
/*  formatRole                                                         */
/* ------------------------------------------------------------------ */

describe("formatRole", () => {
  it("returns German label for de locale and known role", () => {
    const actual = formatRole("admin", "de");
    expect(actual).toBe("Administrator");
  });

  it("returns English label for en locale and known role", () => {
    const actual = formatRole("moderator", "en");
    expect(actual).toBe("Moderator");
  });

  it("falls back to English when locale has no translation", () => {
    const actual = formatRole("owner", "fr");
    expect(actual).toBe("Webmaster");
  });

  it("falls back to formatLabel for unknown role", () => {
    const actual = formatRole("custom_role", "en");
    expect(actual).toBe("Custom_role");
  });

  it("handles all known roles in en", () => {
    const roles = ["owner", "admin", "moderator", "editor", "member", "guest"];
    const expected = ["Webmaster", "Administrator", "Moderator", "Editor", "Member", "Guest"];
    roles.forEach((role, i) => {
      expect(formatRole(role, "en")).toBe(expected[i]);
    });
  });

  it("returns Webmaster for owner in both de and en", () => {
    expect(formatRole("owner", "de")).toBe("Webmaster");
    expect(formatRole("owner", "en")).toBe("Webmaster");
  });
});

/* ------------------------------------------------------------------ */
/*  buildFallbackUserDb                                                */
/* ------------------------------------------------------------------ */

describe("buildFallbackUserDb", () => {
  it("builds db name from email prefix and user id suffix", () => {
    const email = "john.doe@example.com";
    const userId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
    const actual = buildFallbackUserDb(email, userId);
    expect(actual).toBe("john.doe_380a11");
  });

  it("strips hyphens from user id before taking suffix (last 6 chars)", () => {
    const email = "user@test.com";
    const userId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const actual = buildFallbackUserDb(email, userId);
    expect(actual).toBe("user_eeeeee");
  });

  it("uses last 6 chars of id after stripping hyphens", () => {
    const email = "a@b.com";
    const userId = "00000000-0000-0000-0000-0000000000123456";
    const actual = buildFallbackUserDb(email, userId);
    expect(actual).toBe("a_123456");
  });

  it("uses 'user' when email has no @ prefix", () => {
    const email = "@nodomain.com";
    const userId = "11111111-1111-1111-1111-111111111111";
    const actual = buildFallbackUserDb(email, userId);
    expect(actual).toBe("user_111111");
  });

  it("returns lowercase result", () => {
    const email = "John.Doe@Example.COM";
    const userId = "AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE";
    const actual = buildFallbackUserDb(email, userId);
    expect(actual).toBe("john.doe_eeeeee");
  });
});

/* ------------------------------------------------------------------ */
/*  normalizeMembershipRow                                             */
/* ------------------------------------------------------------------ */

describe("normalizeMembershipRow", () => {
  const baseRow: MembershipQueryRow = {
    id: "m1",
    clan_id: "c1",
    game_account_id: "ga1",
    is_active: true,
    is_shadow: false,
    rank: "leader",
    game_accounts: null,
  };

  it("passes through row when game_accounts is null", () => {
    const input = { ...baseRow, game_accounts: null };
    const actual = normalizeMembershipRow(input);
    expect(actual.game_accounts).toBeNull();
    expect(actual.id).toBe("m1");
  });

  it("passes through row when game_accounts is single object", () => {
    const gameAccount = { id: "ga1", game_username: "player1", user_id: "u1" };
    const input = { ...baseRow, game_accounts: gameAccount };
    const actual = normalizeMembershipRow(input);
    expect(actual.game_accounts).toEqual(gameAccount);
  });

  it("takes first element when game_accounts is array", () => {
    const first = { id: "ga1", game_username: "first", user_id: "u1" };
    const second = { id: "ga2", game_username: "second", user_id: "u2" };
    const input = { ...baseRow, game_accounts: [first, second] };
    const actual = normalizeMembershipRow(input);
    expect(actual.game_accounts).toEqual(first);
  });

  it("returns null when game_accounts is empty array", () => {
    const input = { ...baseRow, game_accounts: [] };
    const actual = normalizeMembershipRow(input);
    expect(actual.game_accounts).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  normalizeMembershipRows                                            */
/* ------------------------------------------------------------------ */

describe("normalizeMembershipRows", () => {
  const baseRow: MembershipQueryRow = {
    id: "m1",
    clan_id: "c1",
    game_account_id: "ga1",
    is_active: true,
    is_shadow: false,
    rank: null,
    game_accounts: null,
  };

  it("returns empty array for null input", () => {
    const actual = normalizeMembershipRows(null);
    expect(actual).toEqual([]);
  });

  it("returns empty array for undefined input", () => {
    const actual = normalizeMembershipRows(undefined);
    expect(actual).toEqual([]);
  });

  it("returns empty array for empty array input", () => {
    const actual = normalizeMembershipRows([]);
    expect(actual).toEqual([]);
  });

  it("normalizes each row in array", () => {
    const input = [
      { ...baseRow, id: "m1", game_accounts: null },
      { ...baseRow, id: "m2", game_accounts: [{ id: "ga2", game_username: "p2", user_id: "u2" }] },
    ];
    const actual = normalizeMembershipRows(input);
    expect(actual).toHaveLength(2);
    expect(actual[0]!.game_accounts).toBeNull();
    expect(actual[1]!.game_accounts).toEqual({ id: "ga2", game_username: "p2", user_id: "u2" });
  });
});

/* ------------------------------------------------------------------ */
/*  resolveSection                                                     */
/* ------------------------------------------------------------------ */

describe("resolveSection", () => {
  it("returns 'clans' for null input", () => {
    const actual = resolveSection(null);
    expect(actual).toBe("clans");
  });

  it("returns 'clans' for empty string", () => {
    const actual = resolveSection("");
    expect(actual).toBe("clans");
  });

  it("returns valid section unchanged", () => {
    const valid: Array<"clans" | "logs" | "users" | "approvals" | "forum" | "rulesDefinitions"> = [
      "clans",
      "logs",
      "users",
      "approvals",
      "forum",
      "rulesDefinitions",
    ];
    valid.forEach((section) => {
      expect(resolveSection(section)).toBe(section);
    });
  });

  it("returns 'clans' for invalid section", () => {
    const actual = resolveSection("invalid_tab");
    expect(actual).toBe("clans");
  });

  it("returns 'clans' for unknown string", () => {
    const actual = resolveSection("random");
    expect(actual).toBe("clans");
  });
});
