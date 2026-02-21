import { describe, it, expect } from "vitest";
import {
  type MemberRow,
  RANK_ORDER,
  ROLE_SUBSTITUTE_ORDER,
  NOTABLE_ROLES,
  RANK_SUBSTITUTE_ROLES,
  getRoleColor,
  getRankColor,
  buildMessageLink,
  compareMemberOrder,
  countRoleSubstitutes,
} from "./members-utils";

/* ── Helper: build a minimal MemberRow ── */

function member(overrides: Partial<MemberRow> & { gameUsername: string }): MemberRow {
  return {
    membershipId: `m-${overrides.gameUsername}`,
    gameAccountId: `ga-${overrides.gameUsername}`,
    displayName: "",
    userId: `u-${overrides.gameUsername}`,
    rank: null,
    role: null,
    coordinates: null,
    score: null,
    snapshotDate: null,
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

describe("RANK_ORDER", () => {
  it("contains all six ranks", () => {
    expect(Object.keys(RANK_ORDER)).toEqual(["leader", "superior", "officer", "veteran", "soldier", "guest"]);
  });

  it("leader < superior < officer < veteran < soldier < guest", () => {
    expect(RANK_ORDER["leader"]).toBeLessThan(RANK_ORDER["superior"]!);
    expect(RANK_ORDER["superior"]).toBeLessThan(RANK_ORDER["officer"]!);
    expect(RANK_ORDER["officer"]).toBeLessThan(RANK_ORDER["veteran"]!);
    expect(RANK_ORDER["veteran"]).toBeLessThan(RANK_ORDER["soldier"]!);
    expect(RANK_ORDER["soldier"]).toBeLessThan(RANK_ORDER["guest"]!);
  });
});

describe("ROLE_SUBSTITUTE_ORDER", () => {
  it("owner slots between superior (1) and officer (2)", () => {
    expect(ROLE_SUBSTITUTE_ORDER["owner"]).toBeGreaterThan(RANK_ORDER["superior"]!);
    expect(ROLE_SUBSTITUTE_ORDER["owner"]).toBeLessThan(RANK_ORDER["officer"]!);
  });

  it("admin slots between owner-substitute and officer (2)", () => {
    expect(ROLE_SUBSTITUTE_ORDER["admin"]).toBeGreaterThan(ROLE_SUBSTITUTE_ORDER["owner"]!);
    expect(ROLE_SUBSTITUTE_ORDER["admin"]).toBeLessThan(RANK_ORDER["officer"]!);
  });
});

describe("NOTABLE_ROLES", () => {
  it("includes owner, admin, moderator, editor", () => {
    expect(NOTABLE_ROLES.has("owner")).toBe(true);
    expect(NOTABLE_ROLES.has("admin")).toBe(true);
    expect(NOTABLE_ROLES.has("moderator")).toBe(true);
    expect(NOTABLE_ROLES.has("editor")).toBe(true);
  });

  it("excludes member and guest", () => {
    expect(NOTABLE_ROLES.has("member")).toBe(false);
    expect(NOTABLE_ROLES.has("guest")).toBe(false);
  });
});

describe("RANK_SUBSTITUTE_ROLES", () => {
  it("includes only owner and admin", () => {
    expect(RANK_SUBSTITUTE_ROLES.has("owner")).toBe(true);
    expect(RANK_SUBSTITUTE_ROLES.has("admin")).toBe(true);
    expect(RANK_SUBSTITUTE_ROLES.size).toBe(2);
  });
});

/* ------------------------------------------------------------------ */
/*  getRoleColor                                                       */
/* ------------------------------------------------------------------ */

describe("getRoleColor", () => {
  it("returns red for owner (Webmaster)", () => {
    expect(getRoleColor("owner")).toBe("#e05555");
  });

  it("returns gold for admin (Administrator)", () => {
    expect(getRoleColor("admin")).toBe("#c9a84c");
  });

  it("returns neutral for unknown roles", () => {
    expect(getRoleColor("moderator")).toBe("#b0a08a");
    expect(getRoleColor("member")).toBe("#b0a08a");
    expect(getRoleColor("")).toBe("#b0a08a");
  });
});

/* ------------------------------------------------------------------ */
/*  getRankColor                                                       */
/* ------------------------------------------------------------------ */

describe("getRankColor", () => {
  it("returns distinct colour for each known rank", () => {
    const colours = new Set([
      getRankColor("leader"),
      getRankColor("superior"),
      getRankColor("officer"),
      getRankColor("veteran"),
      getRankColor("guest"),
    ]);
    expect(colours.size).toBe(5);
  });

  it("returns gold for leader", () => {
    expect(getRankColor("leader")).toBe("#e4c778");
  });

  it("returns purple for guest rank", () => {
    expect(getRankColor("guest")).toBe("#9a8ec2");
  });

  it("returns neutral for unknown ranks", () => {
    expect(getRankColor("unknown")).toBe("#b0a08a");
    expect(getRankColor("")).toBe("#b0a08a");
  });

  it("soldier falls through to default (no explicit case)", () => {
    expect(getRankColor("soldier")).toBe("#b0a08a");
  });
});

/* ------------------------------------------------------------------ */
/*  buildMessageLink                                                   */
/* ------------------------------------------------------------------ */

describe("buildMessageLink", () => {
  it("builds /messages?to=<userId>", () => {
    expect(buildMessageLink("abc-123")).toBe("/messages?to=abc-123");
  });

  it("encodes special characters", () => {
    expect(buildMessageLink("a b&c")).toBe("/messages?to=a%20b%26c");
  });
});

/* ------------------------------------------------------------------ */
/*  compareMemberOrder                                                 */
/* ------------------------------------------------------------------ */

describe("compareMemberOrder", () => {
  it("sorts by rank order: leader before officer", () => {
    const a = member({ gameUsername: "alice", rank: "leader" });
    const b = member({ gameUsername: "bob", rank: "officer" });
    expect(compareMemberOrder(a, b)).toBeLessThan(0);
  });

  it("sorts alphabetically within the same rank", () => {
    const a = member({ gameUsername: "bob", rank: "officer" });
    const b = member({ gameUsername: "alice", rank: "officer" });
    expect(compareMemberOrder(a, b)).toBeGreaterThan(0);
  });

  it("places rankless owner (Webmaster) between superior and officer", () => {
    const superior = member({ gameUsername: "sup", rank: "superior" });
    const webmaster = member({ gameUsername: "web", rank: null, role: "owner" });
    const officer = member({ gameUsername: "off", rank: "officer" });
    expect(compareMemberOrder(superior, webmaster)).toBeLessThan(0);
    expect(compareMemberOrder(webmaster, officer)).toBeLessThan(0);
  });

  it("places rankless admin (Administrator) after owner but before officer", () => {
    const webmaster = member({ gameUsername: "web", rank: null, role: "owner" });
    const admin = member({ gameUsername: "adm", rank: null, role: "admin" });
    const officer = member({ gameUsername: "off", rank: "officer" });
    expect(compareMemberOrder(webmaster, admin)).toBeLessThan(0);
    expect(compareMemberOrder(admin, officer)).toBeLessThan(0);
  });

  it("ranked owner uses rank order, not role substitute", () => {
    const rankedOwner = member({ gameUsername: "own", rank: "leader", role: "owner" });
    const officer = member({ gameUsername: "off", rank: "officer" });
    expect(compareMemberOrder(rankedOwner, officer)).toBeLessThan(0);
  });

  it("members with no rank and no special role sort last", () => {
    const normalNoRank = member({ gameUsername: "norm", rank: null, role: "member" });
    const soldier = member({ gameUsername: "sol", rank: "soldier" });
    expect(compareMemberOrder(normalNoRank, soldier)).toBeGreaterThan(0);
  });

  it("unknown ranks sort last (order 99)", () => {
    const unknown = member({ gameUsername: "unk", rank: "xyz" });
    const soldier = member({ gameUsername: "sol", rank: "soldier" });
    expect(compareMemberOrder(unknown, soldier)).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ */
/*  countRoleSubstitutes                                               */
/* ------------------------------------------------------------------ */

describe("countRoleSubstitutes", () => {
  it("returns empty array when no members qualify", () => {
    const members = [
      member({ gameUsername: "a", rank: "leader", role: "owner" }),
      member({ gameUsername: "b", rank: "officer", role: null }),
    ];
    expect(countRoleSubstitutes(members)).toEqual([]);
  });

  it("counts owner with null rank", () => {
    const members = [member({ gameUsername: "web", rank: null, role: "owner" })];
    expect(countRoleSubstitutes(members)).toEqual([{ role: "owner", count: 1 }]);
  });

  it("counts admin with null rank", () => {
    const members = [member({ gameUsername: "adm", rank: null, role: "admin" })];
    expect(countRoleSubstitutes(members)).toEqual([{ role: "admin", count: 1 }]);
  });

  it("counts multiple owners and admins separately", () => {
    const members = [
      member({ gameUsername: "web1", rank: null, role: "owner" }),
      member({ gameUsername: "adm1", rank: null, role: "admin" }),
      member({ gameUsername: "adm2", rank: null, role: "admin" }),
    ];
    const result = countRoleSubstitutes(members);
    expect(result).toEqual([
      { role: "owner", count: 1 },
      { role: "admin", count: 2 },
    ]);
  });

  it("ignores moderator/editor with null rank", () => {
    const members = [member({ gameUsername: "mod", rank: null, role: "moderator" })];
    expect(countRoleSubstitutes(members)).toEqual([]);
  });

  it("ignores members with a rank even if they have an owner/admin role", () => {
    const members = [
      member({ gameUsername: "web", rank: "leader", role: "owner" }),
      member({ gameUsername: "adm", rank: "officer", role: "admin" }),
    ];
    expect(countRoleSubstitutes(members)).toEqual([]);
  });
});
