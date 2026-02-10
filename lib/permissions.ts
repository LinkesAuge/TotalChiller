/**
 * Centralized permission system — single source of truth for role-based access.
 *
 * Roles are global per user (one role in `user_roles`).
 * Ranks on `game_account_clan_memberships` are cosmetic only.
 *
 * Usage:
 *   import { hasPermission, canDo, isAdmin } from "@/lib/permissions";
 *   if (canDo(userRole, "article:create")) { ... }
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type Role = "owner" | "admin" | "moderator" | "editor" | "member" | "guest";

export const ROLES: readonly Role[] = ["owner", "admin", "moderator", "editor", "member", "guest"] as const;

/** Human-readable labels for each role (English). */
export const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  admin: "Administrator",
  moderator: "Moderator",
  editor: "Editor",
  member: "Member",
  guest: "Guest",
} as const;

/* ------------------------------------------------------------------ */
/*  Permission map                                                     */
/* ------------------------------------------------------------------ */

/**
 * Static mapping of roles → permissions.
 * owner/admin use the wildcard "*" (full access).
 */
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
} as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Check whether a role is a valid Role string. */
export function isValidRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

/** Normalise an unknown role string to a `Role`, defaulting to "guest". */
export function toRole(value: string | null | undefined): Role {
  const lower = (value ?? "").toLowerCase();
  return isValidRole(lower) ? lower : "guest";
}

/**
 * Does the given role have a specific permission?
 *
 * Wildcards ("*") grant every permission.
 */
export function hasPermission(role: Role | string, permission: string): boolean {
  const r = toRole(role as string);
  const perms = ROLE_PERMISSIONS[r];
  if (perms.includes("*")) return true;
  return perms.includes(permission);
}

/**
 * Does the given role have *any* of the listed permissions?
 *
 * Useful when a UI element should show for several permission levels:
 *   canDo(role, "article:create", "article:edit:own")
 */
export function canDo(role: Role | string, ...anyOf: string[]): boolean {
  return anyOf.some((p) => hasPermission(role, p));
}

/** Shortcut: owner or admin (wildcard holders). */
export function isAdmin(role: Role | string): boolean {
  const r = toRole(role as string);
  return r === "owner" || r === "admin";
}

/** Shortcut: owner, admin, moderator, or editor. */
export function isContentManager(role: Role | string): boolean {
  const r = toRole(role as string);
  return r === "owner" || r === "admin" || r === "moderator" || r === "editor";
}

/** Return the flat list of permissions granted to a role. */
export function getPermissions(role: Role | string): readonly string[] {
  return ROLE_PERMISSIONS[toRole(role as string)];
}
