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

/** Archived item — unified view for both archived inbox threads and sent messages. */
export interface ArchivedItem {
  /** thread_id for inbox items, message id for sent items */
  readonly id: string;
  readonly source: "inbox" | "sent";
  readonly subject: string | null;
  readonly content: string;
  readonly message_type: string;
  readonly created_at: string;
  readonly archived_at: string;
  readonly sender_id: string | null;
  readonly message_count: number;
  readonly recipient_count: number;
  readonly recipients: readonly RecipientSummary[];
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
  readonly bugs_email_enabled: boolean;
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

/* ── Dashboard summary types ── */

/** Slim article type for dashboard announcements list */
export interface ArticleSummary {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly type: string;
  readonly is_pinned: boolean;
  readonly status: string;
  readonly tags: readonly string[];
  readonly created_at: string;
  readonly author_name: string | null;
  readonly forum_post_id: string | null;
}

/** Slim event type for dashboard upcoming events */
export interface EventSummary {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly location: string | null;
  readonly starts_at: string;
  readonly ends_at: string;
  readonly author_name: string | null;
  readonly forum_post_id: string | null;
}

/* ── Bug Reports ── */

export type BugReportStatus = "open" | "resolved" | "closed";
export type BugReportPriority = "low" | "medium" | "high" | "critical";

export interface BugReportCategory {
  readonly id: string;
  readonly name: string;
  readonly slug: string | null;
  readonly sort_order: number;
  readonly created_at: string;
}

export interface BugReport {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category_id: string | null;
  readonly status: BugReportStatus;
  readonly priority: BugReportPriority | null;
  readonly page_url: string | null;
  readonly reporter_id: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly resolved_at: string | null;
  readonly closed_at: string | null;
}

export interface BugReportComment {
  readonly id: string;
  readonly report_id: string;
  readonly author_id: string;
  readonly content: string;
  readonly created_at: string;
  readonly updated_at: string | null;
}

export interface BugReportScreenshot {
  readonly id: string;
  readonly report_id: string;
  readonly storage_path: string;
  readonly file_name: string;
  readonly created_at: string;
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
