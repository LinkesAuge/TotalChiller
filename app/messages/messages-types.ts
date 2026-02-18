/**
 * Local types for the messages feature.
 * Domain types (InboxThread, SentMessage, ThreadMessage, etc.) come from @/lib/types/domain.
 */
import type { RecipientSummary } from "@/lib/types/domain";
import type { MessageProfileMapDto } from "@/lib/types/messages-api";

export type ProfileMap = MessageProfileMapDto;

export type ViewMode = "inbox" | "sent" | "archive" | "notifications";

export interface ClanOption {
  readonly id: string;
  readonly name: string;
}

/** @deprecated Use `RecipientSummary` from `@/lib/types/domain` directly. */
export type SelectedRecipient = RecipientSummary;

export type ComposeMode = "direct" | "clan" | "global";
