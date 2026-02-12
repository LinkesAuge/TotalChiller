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

/* ── Messages (v2 — email model) ── */

export interface MessageRow {
  readonly id: string;
  readonly sender_id: string | null;
  readonly subject: string | null;
  readonly content: string;
  readonly message_type: string;
  readonly thread_id: string | null;
  readonly parent_id: string | null;
  readonly created_at: string;
}

export interface MessageRecipientRow {
  readonly id: string;
  readonly message_id: string;
  readonly recipient_id: string;
  readonly is_read: boolean;
  readonly deleted_at: string | null;
  readonly created_at: string;
}

/** Inbox thread summary — returned by GET /api/messages/inbox */
export interface InboxThread {
  readonly thread_id: string;
  readonly latest_message: MessageRow;
  readonly message_count: number;
  readonly unread_count: number;
  readonly message_type: string;
  readonly sender_id: string | null;
}

/** Sent message summary — returned by GET /api/messages/sent */
export interface SentMessage extends MessageRow {
  readonly recipient_count: number;
  readonly recipients: readonly RecipientSummary[];
}

export interface RecipientSummary {
  readonly id: string;
  readonly label: string;
}

/** Full thread message with per-recipient state — returned by GET /api/messages/thread/[threadId] */
export interface ThreadMessage extends MessageRow {
  readonly is_read: boolean;
  readonly recipient_entry_id: string | null;
  readonly recipients: readonly RecipientSummary[];
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

/* ── Game Account View (profile) ── */

export interface GameAccountView {
  readonly id: string;
  readonly game_username: string;
  readonly approval_status: string;
  readonly created_at: string;
}

/* ── Validation / Correction Rules (data-import & data-table) ── */

export interface ValidationRuleRow {
  readonly id: string;
  readonly field: string;
  readonly match_value: string;
  readonly status: string;
}

export interface CorrectionRuleRow {
  readonly id: string;
  readonly field: string;
  readonly match_value: string;
  readonly replacement_value: string;
  readonly status: string;
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
