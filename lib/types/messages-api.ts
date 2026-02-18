/**
 * API DTOs for messaging endpoints.
 *
 * Keep these response contracts centralized so route handlers, hooks, and tests
 * stay aligned when payload shapes evolve.
 */
import type {
  ArchivedItem,
  InboxThread,
  MessageRow,
  RecipientResult,
  SentMessage,
  ThreadMessage,
  ThreadMetadata,
} from "./domain";

export interface MessageProfileEntryDto {
  readonly username: string | null;
  readonly display_name: string | null;
}

export type MessageProfileMapDto = Record<string, MessageProfileEntryDto>;

export interface MessagesInboxResponseDto {
  readonly data: readonly InboxThread[];
  readonly profiles: MessageProfileMapDto;
}

export interface MessagesSentResponseDto {
  readonly data: readonly SentMessage[];
  readonly profiles: MessageProfileMapDto;
}

export interface MessagesThreadResponseDto {
  readonly data: readonly ThreadMessage[];
  readonly profiles: MessageProfileMapDto;
  readonly meta?: ThreadMetadata;
}

export interface MessagesArchiveResponseDto {
  readonly data: readonly ArchivedItem[];
  readonly profiles: MessageProfileMapDto;
}

export interface MessagesSearchRecipientsResponseDto {
  readonly data: readonly RecipientResult[];
}

export interface MessageSendResponseDto {
  readonly data: MessageRow;
  readonly recipient_count: number;
}

export interface MessageReadMutationResponseDto {
  readonly data: {
    readonly id: string;
    readonly is_read: true;
  };
}

export interface MessageDeleteMutationResponseDto {
  readonly data: {
    readonly id: string;
    readonly deleted: true;
  };
}

export interface MessageThreadDeleteResponseDto {
  readonly data: {
    readonly thread_id: string;
    readonly deleted: true;
  };
}

export interface MessagesArchiveMutationResponseDto {
  readonly data: {
    readonly type: "thread" | "sent";
    readonly ids: readonly string[];
    readonly action: "archive" | "unarchive";
  };
}
