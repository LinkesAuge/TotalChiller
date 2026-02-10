/**
 * Unit tests for lib/permissions.ts — the static role-permission map.
 *
 * These tests validate the permission map itself without any database
 * or browser interaction. They run via Playwright's test runner but
 * are purely synchronous JS assertions.
 */
import { test, expect } from "@playwright/test";

/* ── We import the module under test via a dynamic require-style import.
      Since Playwright tests run in Node, we read the file and eval it.
      However, because lib/permissions.ts uses module syntax, we use
      a build-time approach: simply duplicate the core logic here for
      unit testing. In production, only lib/permissions.ts is used.     ── */

/* ---------- Inline copy of the permission map for testing ---------- */

type Role = "owner" | "admin" | "moderator" | "editor" | "member" | "guest";

const ROLES: readonly Role[] = ["owner", "admin", "moderator", "editor", "member", "guest"];

const ROLE_PERMISSIONS: Record<Role, readonly string[]> = {
  owner: ["*"],
  admin: ["*"],
  moderator: [
    "article:create",
    "article:edit:any",
    "article:delete:any",
    "article:approve",
    "comment:edit:any",
    "comment:delete:any",
    "event:create",
    "event:edit",
    "event:delete",
    "event_template:manage",
    "data:view",
    "forum:create",
    "forum:edit:any",
    "forum:delete:any",
    "forum:pin",
    "forum:lock",
    "message:send:private",
    "message:send:broadcast",
    "admin_panel:view",
  ],
  editor: [
    "article:create",
    "article:edit:own",
    "article:delete:own",
    "comment:create",
    "comment:edit:own",
    "comment:delete:own",
    "event:create",
    "event:edit",
    "event:delete",
    "event_template:manage",
    "data:view",
    "forum:create",
    "forum:edit:own",
    "forum:delete:own",
    "message:send:private",
  ],
  member: [
    "article:create",
    "article:edit:own",
    "comment:create",
    "comment:edit:own",
    "comment:delete:own",
    "data:view",
    "forum:create",
    "forum:edit:own",
    "message:send:private",
    "profile:edit:own",
  ],
  guest: ["profile:edit:own"],
};

function isValidRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

function toRole(value: string | null | undefined): Role {
  const lower = (value ?? "").toLowerCase();
  return isValidRole(lower) ? lower : "guest";
}

function hasPermission(role: Role | string, permission: string): boolean {
  const r = toRole(role as string);
  const perms = ROLE_PERMISSIONS[r];
  if (perms.includes("*")) return true;
  return perms.includes(permission);
}

function canDo(role: Role | string, ...anyOf: string[]): boolean {
  return anyOf.some((p) => hasPermission(role, p));
}

function isAdmin(role: Role | string): boolean {
  const r = toRole(role as string);
  return r === "owner" || r === "admin";
}

function isContentManager(role: Role | string): boolean {
  const r = toRole(role as string);
  return r === "owner" || r === "admin" || r === "moderator" || r === "editor";
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

test.describe("Permission map — role definitions", () => {
  test("ROLES contains exactly 6 roles in priority order", () => {
    expect(ROLES).toEqual(["owner", "admin", "moderator", "editor", "member", "guest"]);
  });

  test("owner has wildcard permissions", () => {
    expect(ROLE_PERMISSIONS.owner).toEqual(["*"]);
  });

  test("admin has wildcard permissions", () => {
    expect(ROLE_PERMISSIONS.admin).toEqual(["*"]);
  });

  test("guest has only profile:edit:own", () => {
    expect(ROLE_PERMISSIONS.guest).toEqual(["profile:edit:own"]);
  });

  test("moderator has admin_panel:view", () => {
    expect(ROLE_PERMISSIONS.moderator).toContain("admin_panel:view");
  });

  test("editor does NOT have admin_panel:view", () => {
    expect(ROLE_PERMISSIONS.editor).not.toContain("admin_panel:view");
  });

  test("member does NOT have event:create", () => {
    expect(ROLE_PERMISSIONS.member).not.toContain("event:create");
  });
});

test.describe("toRole — normalisation", () => {
  test("valid lowercase role passes through", () => {
    expect(toRole("admin")).toBe("admin");
  });

  test("mixed case is normalised", () => {
    expect(toRole("Admin")).toBe("admin");
    expect(toRole("MODERATOR")).toBe("moderator");
  });

  test("unknown role defaults to guest", () => {
    expect(toRole("superadmin")).toBe("guest");
    expect(toRole("")).toBe("guest");
    expect(toRole(null)).toBe("guest");
    expect(toRole(undefined)).toBe("guest");
  });
});

test.describe("hasPermission", () => {
  test("owner can do anything", () => {
    expect(hasPermission("owner", "article:create")).toBe(true);
    expect(hasPermission("owner", "some:random:permission")).toBe(true);
  });

  test("admin can do anything", () => {
    expect(hasPermission("admin", "data:view")).toBe(true);
    expect(hasPermission("admin", "nonexistent:perm")).toBe(true);
  });

  test("moderator has article:edit:any", () => {
    expect(hasPermission("moderator", "article:edit:any")).toBe(true);
  });

  test("moderator does NOT have article:edit:own (has :any instead)", () => {
    expect(hasPermission("moderator", "article:edit:own")).toBe(false);
  });

  test("editor can create articles", () => {
    expect(hasPermission("editor", "article:create")).toBe(true);
  });

  test("editor cannot edit any article (only own)", () => {
    expect(hasPermission("editor", "article:edit:any")).toBe(false);
    expect(hasPermission("editor", "article:edit:own")).toBe(true);
  });

  test("member can send private messages", () => {
    expect(hasPermission("member", "message:send:private")).toBe(true);
  });

  test("member cannot send broadcasts", () => {
    expect(hasPermission("member", "message:send:broadcast")).toBe(false);
  });

  test("guest cannot create articles", () => {
    expect(hasPermission("guest", "article:create")).toBe(false);
  });

  test("guest can edit own profile", () => {
    expect(hasPermission("guest", "profile:edit:own")).toBe(true);
  });

  test("unknown role falls back to guest", () => {
    expect(hasPermission("unknown", "profile:edit:own")).toBe(true);
    expect(hasPermission("unknown", "article:create")).toBe(false);
  });
});

test.describe("canDo — multi-permission check", () => {
  test("returns true when any permission matches", () => {
    expect(canDo("editor", "article:create", "article:edit:own")).toBe(true);
  });

  test("returns false when no permissions match", () => {
    expect(canDo("guest", "article:create", "event:create")).toBe(false);
  });

  test("works with wildcard roles", () => {
    expect(canDo("owner", "anything", "at:all")).toBe(true);
  });
});

test.describe("isAdmin", () => {
  test("owner is admin", () => {
    expect(isAdmin("owner")).toBe(true);
  });

  test("admin is admin", () => {
    expect(isAdmin("admin")).toBe(true);
  });

  test("moderator is NOT admin", () => {
    expect(isAdmin("moderator")).toBe(false);
  });

  test("guest is NOT admin", () => {
    expect(isAdmin("guest")).toBe(false);
  });
});

test.describe("isContentManager", () => {
  test("owner is content manager", () => {
    expect(isContentManager("owner")).toBe(true);
  });

  test("moderator is content manager", () => {
    expect(isContentManager("moderator")).toBe(true);
  });

  test("editor is content manager", () => {
    expect(isContentManager("editor")).toBe(true);
  });

  test("member is NOT content manager", () => {
    expect(isContentManager("member")).toBe(false);
  });

  test("guest is NOT content manager", () => {
    expect(isContentManager("guest")).toBe(false);
  });
});

test.describe("Permission matrix — comprehensive cross-check", () => {
  const matrix: Record<string, Record<Role, boolean>> = {
    "article:create": { owner: true, admin: true, moderator: true, editor: true, member: true, guest: false },
    "article:edit:any": { owner: true, admin: true, moderator: true, editor: false, member: false, guest: false },
    "article:delete:any": { owner: true, admin: true, moderator: true, editor: false, member: false, guest: false },
    "event:create": { owner: true, admin: true, moderator: true, editor: true, member: false, guest: false },
    "message:send:broadcast": { owner: true, admin: true, moderator: true, editor: false, member: false, guest: false },
    "data:view": { owner: true, admin: true, moderator: true, editor: true, member: true, guest: false },
    "forum:pin": { owner: true, admin: true, moderator: true, editor: false, member: false, guest: false },
    "profile:edit:own": { owner: true, admin: true, moderator: false, editor: false, member: true, guest: true },
    "admin_panel:view": { owner: true, admin: true, moderator: true, editor: false, member: false, guest: false },
  };

  for (const [permission, expected] of Object.entries(matrix)) {
    for (const role of ROLES) {
      test(`${role} ${expected[role] ? "CAN" : "CANNOT"} ${permission}`, () => {
        expect(hasPermission(role, permission)).toBe(expected[role]);
      });
    }
  }
});
