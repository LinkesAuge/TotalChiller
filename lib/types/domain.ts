/**
 * Shared domain types used across API routes, client components, and the admin panel.
 *
 * This is the single source of truth for entity shapes that appear in more than one file.
 * Use `Pick<>` / `Omit<>` for narrower views rather than defining separate interfaces.
 */

/* ── Profile ── */

export interface ProfileSummary {
  readonly id: string;
  readonly email: string;
  readonly username: string | null;
  readonly display_name: string | null;
}

/* ── Game Accounts ── */

export interface GameAccountSummary {
  readonly id: string;
  readonly user_id: string;
  readonly game_username: string;
  readonly approval_status?: string;
}

/* ── Forum Categories ── */

export interface ForumCategory {
  readonly id: string;
  readonly clan_id?: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly icon: string | null;
  readonly sort_order: number;
}

/* ── Messages ── */

export interface MessageRow {
  readonly id: string;
  readonly sender_id: string | null;
  readonly recipient_id: string;
  readonly message_type: string;
  readonly subject: string | null;
  readonly content: string;
  readonly is_read: boolean;
  readonly created_at: string;
}

export interface RecipientResult {
  readonly id: string;
  readonly label: string;
  readonly username: string | null;
  readonly gameAccounts: readonly string[];
}

/* ── Notifications ── */

export interface NotificationRow {
  readonly id: string;
  readonly type: string;
  readonly title: string;
  readonly body: string | null;
  readonly reference_id: string | null;
  readonly is_read: boolean;
  readonly created_at: string;
}

export interface NotificationPrefs {
  readonly messages_enabled: boolean;
  readonly news_enabled: boolean;
  readonly events_enabled: boolean;
  readonly system_enabled: boolean;
}

/* ── Pending Approvals ── */

export interface PendingApprovalRow {
  readonly id: string;
  readonly user_id: string;
  readonly game_username: string;
  readonly approval_status: string;
  readonly created_at: string;
  readonly profiles: Pick<ProfileSummary, "email" | "username" | "display_name"> | null;
}
