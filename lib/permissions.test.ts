import { describe, it, expect } from "vitest";
import {
  type Role,
  ROLES,
  ROLE_LABELS,
  isValidRole,
  toRole,
  hasPermission,
  canDo,
  isAdmin,
  isContentManager,
  getPermissions,
} from "./permissions";

describe("ROLES constant", () => {
  it("contains exactly 6 roles in rank order", () => {
    expect(ROLES).toEqual(["owner", "admin", "moderator", "editor", "member", "guest"]);
  });

  it("has a label for every role", () => {
    for (const role of ROLES) {
      expect(ROLE_LABELS[role]).toBeTruthy();
    }
  });
});

describe("isValidRole", () => {
  it.each(ROLES as unknown as string[])("returns true for '%s'", (role) => {
    expect(isValidRole(role)).toBe(true);
  });

  it("returns false for unknown strings", () => {
    expect(isValidRole("superadmin")).toBe(false);
    expect(isValidRole("")).toBe(false);
    expect(isValidRole("ADMIN")).toBe(false);
  });
});

describe("toRole", () => {
  it("normalises valid roles (case-insensitive)", () => {
    expect(toRole("Admin")).toBe("admin");
    expect(toRole("OWNER")).toBe("owner");
    expect(toRole("guest")).toBe("guest");
  });

  it("defaults to guest for null/undefined/unknown", () => {
    expect(toRole(null)).toBe("guest");
    expect(toRole(undefined)).toBe("guest");
    expect(toRole("bogus")).toBe("guest");
  });
});

describe("hasPermission", () => {
  it("owner has wildcard — grants any permission", () => {
    expect(hasPermission("owner", "article:create")).toBe(true);
    expect(hasPermission("owner", "anything:at:all")).toBe(true);
  });

  it("admin has wildcard — grants any permission", () => {
    expect(hasPermission("admin", "event:delete")).toBe(true);
  });

  it("moderator has event:create", () => {
    expect(hasPermission("moderator", "event:create")).toBe(true);
  });

  it("editor has event:create but not message:send:broadcast", () => {
    expect(hasPermission("editor", "event:create")).toBe(true);
    expect(hasPermission("editor", "message:send:broadcast")).toBe(false);
  });

  it("member cannot create events", () => {
    expect(hasPermission("member", "event:create")).toBe(false);
  });

  it("member can delete own forum posts", () => {
    expect(hasPermission("member", "forum:delete:own")).toBe(true);
  });

  it("member can edit own forum posts", () => {
    expect(hasPermission("member", "forum:edit:own")).toBe(true);
  });

  it("member can create forum posts", () => {
    expect(hasPermission("member", "forum:create")).toBe(true);
  });

  it("editor can delete own forum posts", () => {
    expect(hasPermission("editor", "forum:delete:own")).toBe(true);
  });

  it("guest cannot access forum", () => {
    expect(hasPermission("guest", "forum:create")).toBe(false);
    expect(hasPermission("guest", "forum:edit:own")).toBe(false);
    expect(hasPermission("guest", "forum:delete:own")).toBe(false);
  });

  it("guest only has profile:edit:own", () => {
    expect(hasPermission("guest", "profile:edit:own")).toBe(true);
    expect(hasPermission("guest", "article:create")).toBe(false);
  });
});

describe("canDo", () => {
  it("returns true if the role has any of the listed permissions", () => {
    expect(canDo("member", "event:create", "forum:create")).toBe(true);
  });

  it("returns false if the role has none of the listed permissions", () => {
    expect(canDo("guest", "event:create", "forum:create")).toBe(false);
  });
});

describe("isAdmin", () => {
  it("returns true for owner and admin", () => {
    expect(isAdmin("owner")).toBe(true);
    expect(isAdmin("admin")).toBe(true);
  });

  it("returns false for moderator and below", () => {
    expect(isAdmin("moderator")).toBe(false);
    expect(isAdmin("editor")).toBe(false);
    expect(isAdmin("member")).toBe(false);
    expect(isAdmin("guest")).toBe(false);
  });
});

describe("isContentManager", () => {
  const contentManagers: Role[] = ["owner", "admin", "moderator", "editor"];
  const nonManagers: Role[] = ["member", "guest"];

  it.each(contentManagers)("returns true for '%s'", (role) => {
    expect(isContentManager(role)).toBe(true);
  });

  it.each(nonManagers)("returns false for '%s'", (role) => {
    expect(isContentManager(role)).toBe(false);
  });
});

describe("getPermissions", () => {
  it("returns ['*'] for owner", () => {
    expect(getPermissions("owner")).toEqual(["*"]);
  });

  it("returns a non-empty array for every role", () => {
    for (const role of ROLES) {
      expect(getPermissions(role).length).toBeGreaterThan(0);
    }
  });

  it("guest permissions contain only profile:edit:own", () => {
    expect(getPermissions("guest")).toEqual(["profile:edit:own"]);
  });
});
