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

/* ── Messages (v2 — chat model with pull-based broadcast targeting) ── */

export interface MessageRow {
  readonly id: string;
  readonly sender_id: string | null;
  readonly subject: string | null;
  readonly content: string;
  readonly message_type: string;
  readonly thread_id: string | null;
  readonly parent_id: string | null;
  readonly created_at: string;
  readonly target_ranks?: readonly string[] | null;
  readonly target_roles?: readonly string[] | null;
  readonly target_clan_id?: string | null;
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
  readonly target_ranks?: readonly string[] | null;
  readonly target_roles?: readonly string[] | null;
  readonly target_clan_id?: string | null;
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

/** Metadata returned alongside a thread for broadcast reply capability. */
export interface ThreadMetadata {
  readonly can_reply: boolean;
  readonly thread_targeting: {
    readonly target_ranks: readonly string[] | null;
    readonly target_roles: readonly string[] | null;
    readonly target_clan_id: string | null;
  } | null;
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

/* ── Data Pipeline ── */

export type SubmissionType = "chests" | "members" | "events";
export type SubmissionSource = "file_import" | "api_push";
export type SubmissionStatus = "pending" | "approved" | "rejected" | "partial";
export type StagedItemStatus = "pending" | "approved" | "rejected" | "auto_matched";
export type OcrEntityType = "player" | "chest" | "source";

export interface DataSubmission {
  readonly id: string;
  readonly clan_id: string;
  readonly submitted_by: string;
  readonly game_account_id: string | null;
  readonly submission_type: SubmissionType;
  readonly source: SubmissionSource;
  readonly status: SubmissionStatus;
  readonly item_count: number;
  readonly approved_count: number;
  readonly rejected_count: number;
  readonly notes: string | null;
  readonly reviewer_notes: string | null;
  readonly reviewed_by: string | null;
  readonly reviewed_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface StagedChestEntry {
  readonly id: string;
  readonly submission_id: string;
  readonly chest_name: string;
  readonly player_name: string;
  readonly source: string;
  readonly level: string | null;
  readonly opened_at: string;
  readonly matched_game_account_id: string | null;
  readonly item_status: StagedItemStatus;
  readonly reviewer_notes: string | null;
  readonly is_duplicate: boolean;
  readonly created_at: string;
}

export interface StagedMemberEntry {
  readonly id: string;
  readonly submission_id: string;
  readonly player_name: string;
  readonly coordinates: string | null;
  readonly score: number | null;
  readonly captured_at: string;
  readonly matched_game_account_id: string | null;
  readonly item_status: StagedItemStatus;
  readonly reviewer_notes: string | null;
  readonly is_duplicate: boolean;
  readonly created_at: string;
}

export interface StagedEventEntry {
  readonly id: string;
  readonly submission_id: string;
  readonly player_name: string;
  readonly event_points: number;
  readonly event_name: string | null;
  readonly captured_at: string;
  readonly matched_game_account_id: string | null;
  readonly item_status: StagedItemStatus;
  readonly reviewer_notes: string | null;
  readonly is_duplicate: boolean;
  readonly created_at: string;
}

export interface ChestEntry {
  readonly id: string;
  readonly clan_id: string;
  readonly submission_id: string | null;
  readonly game_account_id: string | null;
  readonly chest_name: string;
  readonly player_name: string;
  readonly source: string;
  readonly level: string | null;
  readonly opened_at: string;
  readonly created_at: string;
}

export interface MemberSnapshot {
  readonly id: string;
  readonly clan_id: string;
  readonly submission_id: string | null;
  readonly game_account_id: string | null;
  readonly player_name: string;
  readonly coordinates: string | null;
  readonly score: number | null;
  readonly snapshot_date: string;
  readonly created_at: string;
}

export interface EventResult {
  readonly id: string;
  readonly clan_id: string;
  readonly submission_id: string | null;
  readonly game_account_id: string | null;
  readonly player_name: string;
  readonly event_points: number;
  readonly event_name: string | null;
  readonly event_date: string;
  readonly created_at: string;
}

export interface OcrCorrection {
  readonly id: string;
  readonly clan_id: string;
  readonly entity_type: OcrEntityType;
  readonly ocr_text: string;
  readonly corrected_text: string;
  readonly created_by: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface KnownName {
  readonly id: string;
  readonly clan_id: string;
  readonly entity_type: OcrEntityType;
  readonly name: string;
  readonly created_at: string;
}

/* ── Event Types ── */

export interface ClanEventType {
  readonly id: string;
  readonly clan_id: string;
  readonly name: string;
  readonly banner_url: string | null;
  readonly description: string | null;
  readonly is_active: boolean;
  readonly created_by: string;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface ClanEventTypeSummary {
  readonly id: string;
  readonly name: string;
}

/* ── Clan Rules & Goals ── */

export type ChestGoalPeriod = "daily" | "weekly" | "monthly";

export interface ClanEventRuleSet {
  readonly id: string;
  readonly clan_id: string;
  readonly name: string;
  readonly description: string | null;
  readonly is_active: boolean;
  readonly created_by: string;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface ClanEventRuleTier {
  readonly id: string;
  readonly rule_set_id: string;
  readonly min_power: number;
  readonly max_power: number | null;
  readonly required_points: number | null;
  readonly sort_order: number;
  readonly created_at: string;
}

export interface ClanChestGoal {
  readonly id: string;
  readonly clan_id: string;
  readonly game_account_id: string | null;
  readonly period: ChestGoalPeriod;
  readonly target_count: number;
  readonly is_active: boolean;
  readonly created_by: string;
  readonly created_at: string;
  readonly updated_at: string;
}

/** Rule set with nested tiers and linked event types (for display). */
export interface ClanEventRuleSetWithTiers extends ClanEventRuleSet {
  readonly tiers: readonly ClanEventRuleTier[];
  readonly event_types: readonly ClanEventTypeSummary[];
}

/** Chest goal with optional player name (for display of individual goals). */
export interface ClanChestGoalWithPlayer extends ClanChestGoal {
  readonly player_name?: string | null;
}

/** Summary row for submission list views. */
export interface SubmissionSummary {
  readonly id: string;
  readonly submission_type: SubmissionType;
  readonly source: SubmissionSource;
  readonly status: SubmissionStatus;
  readonly item_count: number;
  readonly approved_count: number;
  readonly rejected_count: number;
  readonly created_at: string;
  readonly reviewed_at: string | null;
  readonly submitted_by: {
    readonly id: string;
    readonly display_name: string | null;
  };
}
