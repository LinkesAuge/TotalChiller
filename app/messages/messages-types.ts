/**
 * Local types for the messages feature.
 * Domain types (InboxThread, SentMessage, ThreadMessage, etc.) come from @/lib/types/domain.
 */
import type { ProfileSummary, RecipientSummary } from "@/lib/types/domain";

/** Profile fields needed for message display (ProfileSummary without `id`). */
export type ProfileEntry = Omit<ProfileSummary, "id">;

export interface ProfileMap {
  readonly [userId: string]: ProfileEntry;
}

export type ViewMode = "inbox" | "sent" | "archive";

export interface ClanOption {
  readonly id: string;
  readonly name: string;
}

/** @deprecated Use `RecipientSummary` from `@/lib/types/domain` directly. */
export type SelectedRecipient = RecipientSummary;

export type ComposeMode = "direct" | "clan" | "global";
