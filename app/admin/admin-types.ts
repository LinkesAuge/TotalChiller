/**
 * Shared types and utilities for the Admin panel.
 *
 * Extracted from admin-client.tsx to enable future tab splitting.
 * Each tab component (e.g. admin-clans-tab.tsx) should import from here.
 */

import { ROLES } from "@/lib/permissions";
import type { GameAccountSummary, ProfileSummary, PendingApprovalRow } from "@/lib/types/domain";

/* ── Re-exports from shared domain types ── */

export type { PendingApprovalRow };
export type GameAccountRow = GameAccountSummary;
export type ProfileRow = ProfileSummary;

/* ── Types ── */

export interface ClanRow {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly is_unassigned?: boolean | null;
}

export interface MembershipRow {
  readonly id: string;
  readonly clan_id: string;
  readonly game_account_id: string;
  readonly is_active: boolean;
  readonly is_shadow: boolean;
  readonly rank: string | null;
  readonly game_accounts: GameAccountRow | null;
}

export type MembershipQueryRow = Omit<MembershipRow, "game_accounts"> & {
  readonly game_accounts: GameAccountRow | readonly GameAccountRow[] | null;
};

export interface MembershipEditState {
  readonly is_active?: boolean;
  readonly is_shadow?: boolean;
  readonly rank?: string | null;
  readonly clan_id?: string;
}

export interface GameAccountEditState {
  readonly game_username?: string;
}

export interface AssignableGameAccount {
  readonly id: string;
  readonly user_id: string;
  readonly game_username: string;
  readonly clan_id: string | null;
  readonly user_email: string;
  readonly user_display: string;
}

export type MemberSortKey = "game" | "user" | "clan" | "rank" | "status";
export type UserSortKey = "username" | "email" | "nickname" | "role" | "accounts";

export interface UserRow {
  readonly id: string;
  readonly email: string;
  readonly display_name: string | null;
  readonly username: string | null;
  readonly user_db: string | null;
}

export interface UserEditState {
  readonly display_name?: string | null;
  readonly username?: string | null;
  readonly role?: string | null;
}

export interface AuditLogRow {
  readonly id: string;
  readonly clan_id: string;
  readonly actor_id: string;
  readonly action: string;
  readonly entity: string;
  readonly entity_id: string;
  readonly diff: Record<string, unknown> | null;
  readonly created_at: string;
}

export type AdminSection = "clans" | "logs" | "users" | "approvals" | "forum";

/* ── Constants ── */

export const roleOptions: readonly string[] = [...ROLES];
export const rankOptions: readonly string[] = ["leader", "superior", "officer", "veteran", "soldier", "guest"];

/* ── Utility functions ── */

/** Localised display names for ranks. */
export const RANK_LABELS: Record<string, Record<string, string>> = {
  de: {
    leader: "Anführer",
    superior: "Vorgesetzter",
    officer: "Offizier",
    veteran: "Veteran",
    soldier: "Soldat",
    guest: "Gast",
  },
  en: {
    leader: "Leader",
    superior: "Superior",
    officer: "Officer",
    veteran: "Veteran",
    soldier: "Soldier",
    guest: "Guest",
  },
};

/** Localised display names for user roles — distinct from lib/permissions ROLE_LABELS (English only). */
export const LOCALIZED_ROLE_LABELS: Record<string, Record<string, string>> = {
  de: {
    owner: "Webmaster",
    admin: "Administrator",
    moderator: "Moderator",
    editor: "Editor",
    member: "Mitglied",
    guest: "Gast",
  },
  en: {
    owner: "Webmaster",
    admin: "Administrator",
    moderator: "Moderator",
    editor: "Editor",
    member: "Member",
    guest: "Guest",
  },
};

export function formatLabel(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatRank(rank: string, locale: string): string {
  return RANK_LABELS[locale]?.[rank] ?? (RANK_LABELS.en ?? {})[rank] ?? formatLabel(rank);
}

export function formatRole(role: string, locale: string): string {
  return LOCALIZED_ROLE_LABELS[locale]?.[role] ?? (LOCALIZED_ROLE_LABELS.en ?? {})[role] ?? formatLabel(role);
}

export function buildFallbackUserDb(email: string, userId: string): string {
  const prefix = email.split("@")[0] || "user";
  const suffix = userId.replace(/-/g, "").slice(-6);
  return `${prefix}_${suffix}`.toLowerCase();
}

export function normalizeMembershipRow(row: MembershipQueryRow): MembershipRow {
  const gameAccount = Array.isArray(row.game_accounts) ? (row.game_accounts[0] ?? null) : row.game_accounts;
  return { ...row, game_accounts: gameAccount ?? null };
}

export function normalizeMembershipRows(
  rows: readonly MembershipQueryRow[] | null | undefined,
): readonly MembershipRow[] {
  return (rows ?? []).map(normalizeMembershipRow);
}

export function resolveSection(raw: string | null): AdminSection {
  if (!raw) return "clans";
  const valid: readonly AdminSection[] = ["clans", "logs", "users", "approvals", "forum"];
  return valid.includes(raw as AdminSection) ? (raw as AdminSection) : "clans";
}
