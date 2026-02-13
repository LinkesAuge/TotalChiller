/**
 * Local types for the messages feature.
 * Domain types (InboxThread, SentMessage, ThreadMessage, etc.) come from @/lib/types/domain.
 */

export interface ProfileEntry {
  readonly email: string;
  readonly username: string | null;
  readonly display_name: string | null;
}

export interface ProfileMap {
  readonly [userId: string]: ProfileEntry;
}

export type ViewMode = "inbox" | "sent" | "archive";

export interface ClanOption {
  readonly id: string;
  readonly name: string;
}

export interface SelectedRecipient {
  readonly id: string;
  readonly label: string;
}

export type ComposeMode = "direct" | "clan" | "global";
