"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { resolveMessageProfileLabel } from "@/lib/messages/profile-utils";
import { useSupabase } from "../hooks/use-supabase";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { useToast } from "../components/toast-provider";
import type {
  ArchivedItem,
  InboxThread,
  NotificationRow,
  SentMessage,
  ThreadMessage,
  RecipientResult,
} from "@/lib/types/domain";
import type {
  MessageSendResponseDto,
  MessagesArchiveResponseDto,
  MessagesInboxResponseDto,
  MessagesSearchRecipientsResponseDto,
  MessagesSentResponseDto,
  MessagesThreadResponseDto,
} from "@/lib/types/messages-api";
import type { ProfileMap, ViewMode, ClanOption, SelectedRecipient, ComposeMode } from "./messages-types";

export interface UseMessagesParams {
  readonly userId: string;
  readonly initialRecipientId?: string;
  readonly initialTab?: string;
}

export interface UseMessagesResult {
  /* View state */
  readonly viewMode: ViewMode;
  readonly typeFilter: string;
  readonly setTypeFilter: (v: string) => void;
  readonly search: string;
  readonly setSearch: (v: string) => void;

  /* Inbox */
  readonly inboxThreads: readonly InboxThread[];
  readonly isInboxLoading: boolean;

  /* Sent */
  readonly sentMessages: readonly SentMessage[];
  readonly sentProfiles: ProfileMap;
  readonly isSentLoading: boolean;

  /* Archive */
  readonly archivedItems: readonly ArchivedItem[];
  readonly isArchiveLoading: boolean;

  /* Notifications */
  readonly notificationItems: readonly NotificationRow[];
  readonly isNotificationsLoading: boolean;
  readonly handleDeleteNotification: (id: string) => Promise<void>;
  readonly handleDeleteAllNotifications: () => Promise<void>;
  readonly handleMarkNotificationRead: (id: string) => Promise<void>;

  /* Thread view */
  readonly selectedThreadId: string;
  readonly selectedSentMsgId: string;
  readonly threadMessages: readonly ThreadMessage[];
  readonly isThreadLoading: boolean;

  /* Compose */
  readonly isComposeOpen: boolean;
  readonly setIsComposeOpen: (v: boolean) => void;
  readonly composeMode: ComposeMode;
  readonly setComposeMode: (v: ComposeMode) => void;
  readonly composeRecipients: readonly SelectedRecipient[];
  readonly composeClanId: string;
  readonly setComposeClanId: (v: string) => void;
  readonly composeSubject: string;
  readonly setComposeSubject: (v: string) => void;
  readonly composeContent: string;
  readonly setComposeContent: (v: string) => void;
  readonly composeStatus: string;

  /* Reply */
  readonly isReplyOpen: boolean;
  readonly setIsReplyOpen: (v: boolean) => void;
  readonly replyContent: string;
  readonly setReplyContent: (v: string) => void;
  readonly replyStatus: string;

  /* Recipient search */
  readonly recipientSearch: string;
  readonly setRecipientSearch: (v: string) => void;
  readonly recipientResults: readonly RecipientResult[];
  readonly isSearching: boolean;
  readonly isSearchDropdownOpen: boolean;
  readonly setIsSearchDropdownOpen: (v: boolean) => void;
  readonly searchWrapperRef: React.RefObject<HTMLDivElement | null>;

  /* Role / clans */
  readonly isContentMgr: boolean;
  readonly clans: readonly ClanOption[];

  /* Merged profiles */
  readonly allProfiles: ProfileMap;

  /* Derived */
  readonly totalInboxUnread: number;
  readonly composeModeOptions: readonly { value: string; label: string }[];
  readonly selectedSentMessage: SentMessage | undefined;
  readonly selectedInboxThread: InboxThread | undefined;
  readonly canReply: boolean;

  /* Delete confirmation */
  readonly deleteConfirm: {
    readonly type: "thread" | "sent";
    readonly ids: readonly string[];
    readonly extraType?: "thread" | "sent";
    readonly extraIds?: readonly string[];
  } | null;
  readonly setDeleteConfirm: (
    v: {
      readonly type: "thread" | "sent";
      readonly ids: readonly string[];
      readonly extraType?: "thread" | "sent";
      readonly extraIds?: readonly string[];
    } | null,
  ) => void;
  readonly isDeleting: boolean;

  /* Multi-select */
  readonly checkedIds: ReadonlySet<string>;
  readonly toggleChecked: (id: string) => void;
  readonly toggleAllChecked: () => void;
  readonly clearChecked: () => void;
  readonly requestBatchDelete: () => void;
  readonly requestBatchArchive: () => void;
  readonly handleArchive: (type: "thread" | "sent", ids: readonly string[]) => Promise<void>;
  readonly handleUnarchive: (type: "thread" | "sent", ids: readonly string[]) => Promise<void>;

  /* Handlers */
  readonly clearSelection: () => void;
  readonly handleViewModeChange: (mode: ViewMode) => void;
  readonly handleSelectInboxThread: (threadId: string) => void;
  readonly handleSelectSentMessage: (msgId: string) => void;
  readonly handleSelectArchivedItem: (item: ArchivedItem) => void;
  readonly openReplyToMessage: () => void;
  readonly handleSendReply: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  readonly handleCompose: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  readonly handleDeleteMessage: (messageId: string) => Promise<void>;
  readonly confirmDelete: () => Promise<void>;

  /* Helpers */
  readonly getProfileLabel: (profileId: string, fallback?: string) => string;
  readonly addRecipient: (recipient: SelectedRecipient) => void;
  readonly removeRecipient: (recipientId: string) => void;
  readonly resetCompose: () => void;
  readonly resetReply: () => void;
  readonly formatRecipientLabel: (msg: SentMessage) => string;
  readonly getMessageTypeLabel: (messageType: string) => string;

  /* Load thread (for reply success) */
  readonly loadThread: (threadId: string) => Promise<void>;
  readonly loadInbox: () => Promise<void>;
  readonly loadSent: () => Promise<void>;
  readonly loadArchive: () => Promise<void>;
}

/**
 * Hook for messages state, data loading, and message operations.
 * Manages inbox, sent, thread views, compose, reply, recipient search,
 * and all API interactions.
 */
const VALID_TABS: readonly string[] = ["inbox", "sent", "archive", "notifications"];

export function useMessages({ userId, initialRecipientId, initialTab }: UseMessagesParams): UseMessagesResult {
  const supabase = useSupabase();
  const t = useTranslations("messagesPage");
  const { pushToast } = useToast();
  const { isContentManager: isContentMgr } = useUserRole(supabase);

  /* ── View state ── */
  const [viewMode, setViewMode] = useState<ViewMode>(
    initialTab && VALID_TABS.includes(initialTab) ? (initialTab as ViewMode) : "inbox",
  );
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  /* ── Inbox state ── */
  const [inboxThreads, setInboxThreads] = useState<readonly InboxThread[]>([]);
  const [inboxProfiles, setInboxProfiles] = useState<ProfileMap>({});
  const [isInboxLoading, setIsInboxLoading] = useState<boolean>(true);

  /* ── Sent state ── */
  const [sentMessages, setSentMessages] = useState<readonly SentMessage[]>([]);
  const [sentProfiles, setSentProfiles] = useState<ProfileMap>({});
  const [isSentLoading, setIsSentLoading] = useState<boolean>(false);

  /* ── Archive state ── */
  const [archivedItems, setArchivedItems] = useState<readonly ArchivedItem[]>([]);
  const [archiveProfiles, setArchiveProfiles] = useState<ProfileMap>({});
  const [isArchiveLoading, setIsArchiveLoading] = useState<boolean>(false);

  /* ── Notifications state ── */
  const [notificationItems, setNotificationItems] = useState<readonly NotificationRow[]>([]);
  const [isNotificationsLoading, setIsNotificationsLoading] = useState<boolean>(false);
  const notifAbortRef = useRef<AbortController | null>(null);

  /* ── Thread view state ── */
  const [selectedThreadId, setSelectedThreadId] = useState<string>("");
  const [selectedSentMsgId, setSelectedSentMsgId] = useState<string>("");
  const [threadMessages, setThreadMessages] = useState<readonly ThreadMessage[]>([]);
  const [threadProfiles, setThreadProfiles] = useState<ProfileMap>({});
  const [isThreadLoading, setIsThreadLoading] = useState<boolean>(false);

  /* ── Compose state ── */
  const [isComposeOpen, setIsComposeOpen] = useState<boolean>(false);
  const [composeMode, setComposeMode] = useState<ComposeMode>("direct");
  const [composeRecipients, setComposeRecipients] = useState<readonly SelectedRecipient[]>([]);
  const [composeClanId, setComposeClanId] = useState<string>("");
  const [composeSubject, setComposeSubject] = useState<string>("");
  const [composeContent, setComposeContent] = useState<string>("");
  const [composeStatus, setComposeStatus] = useState<string>("");

  /* ── Reply state ── */
  const [isReplyOpen, setIsReplyOpen] = useState<boolean>(false);
  const [replyContent, setReplyContent] = useState<string>("");
  const [replyStatus, setReplyStatus] = useState<string>("");

  /* ── Recipient search state ── */
  const [recipientSearch, setRecipientSearch] = useState<string>("");
  const [recipientResults, setRecipientResults] = useState<readonly RecipientResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState<boolean>(false);
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Abort controllers ── */
  const inboxAbortRef = useRef<AbortController | null>(null);
  const sentAbortRef = useRef<AbortController | null>(null);
  const threadAbortRef = useRef<AbortController | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const archiveAbortRef = useRef<AbortController | null>(null);

  /* ── Clans ── */
  const [clans, setClans] = useState<readonly ClanOption[]>([]);

  const allProfiles = useMemo<ProfileMap>(
    () => ({ ...inboxProfiles, ...sentProfiles, ...threadProfiles, ...archiveProfiles }),
    [inboxProfiles, sentProfiles, threadProfiles, archiveProfiles],
  );

  const loadInbox = useCallback(async (): Promise<void> => {
    inboxAbortRef.current?.abort();
    const controller = new AbortController();
    inboxAbortRef.current = controller;
    setIsInboxLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (search.trim()) params.set("search", search.trim());
      const qs = params.toString() ? `?${params.toString()}` : "";
      const response = await fetch(`/api/messages${qs}`, { signal: controller.signal });
      if (!response.ok) {
        if (!controller.signal.aborted) pushToast(t("failedToLoad"));
        return;
      }
      const result = (await response.json()) as MessagesInboxResponseDto;
      if (!controller.signal.aborted) {
        setInboxThreads(result.data ?? []);
        setInboxProfiles(result.profiles ?? {});
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      pushToast(t("failedToLoad"));
    } finally {
      if (!controller.signal.aborted) setIsInboxLoading(false);
    }
  }, [typeFilter, search, pushToast, t]);

  const loadSent = useCallback(async (): Promise<void> => {
    sentAbortRef.current?.abort();
    const controller = new AbortController();
    sentAbortRef.current = controller;
    setIsSentLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (search.trim()) params.set("search", search.trim());
      const qs = params.toString() ? `?${params.toString()}` : "";
      const response = await fetch(`/api/messages/sent${qs}`, { signal: controller.signal });
      if (!response.ok) {
        if (!controller.signal.aborted) pushToast(t("failedToLoad"));
        return;
      }
      const result = (await response.json()) as MessagesSentResponseDto;
      if (!controller.signal.aborted) {
        setSentMessages(result.data ?? []);
        setSentProfiles(result.profiles ?? {});
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      pushToast(t("failedToLoad"));
    } finally {
      if (!controller.signal.aborted) setIsSentLoading(false);
    }
  }, [typeFilter, search, pushToast, t]);

  const loadArchive = useCallback(async (): Promise<void> => {
    archiveAbortRef.current?.abort();
    const controller = new AbortController();
    archiveAbortRef.current = controller;
    setIsArchiveLoading(true);
    try {
      const response = await fetch("/api/messages/archive", { signal: controller.signal });
      if (!response.ok) {
        if (!controller.signal.aborted) pushToast(t("failedToLoad"));
        return;
      }
      const result = (await response.json()) as MessagesArchiveResponseDto;
      if (!controller.signal.aborted) {
        setArchivedItems(result.data ?? []);
        setArchiveProfiles(result.profiles ?? {});
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      pushToast(t("failedToLoad"));
    } finally {
      if (!controller.signal.aborted) setIsArchiveLoading(false);
    }
  }, [pushToast, t]);

  const loadNotifications = useCallback(async (): Promise<void> => {
    notifAbortRef.current?.abort();
    const controller = new AbortController();
    notifAbortRef.current = controller;
    setIsNotificationsLoading(true);
    try {
      const response = await fetch("/api/notifications", { signal: controller.signal });
      if (!response.ok) {
        if (!controller.signal.aborted) pushToast(t("failedToLoad"));
        return;
      }
      const result = await response.json();
      if (!controller.signal.aborted) {
        setNotificationItems(result.data ?? []);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      pushToast(t("failedToLoad"));
    } finally {
      if (!controller.signal.aborted) setIsNotificationsLoading(false);
    }
  }, [pushToast, t]);

  const handleDeleteNotification = useCallback(
    async (id: string): Promise<void> => {
      const response = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      if (!response.ok) {
        pushToast(t("failedToDelete"));
        return;
      }
      setNotificationItems((current) => current.filter((n) => n.id !== id));
    },
    [pushToast, t],
  );

  const handleDeleteAllNotifications = useCallback(async (): Promise<void> => {
    const response = await fetch("/api/notifications/delete-all", { method: "POST" });
    if (!response.ok) {
      pushToast(t("failedToDelete"));
      return;
    }
    setNotificationItems([]);
  }, [pushToast, t]);

  const handleMarkNotificationRead = useCallback(
    async (id: string): Promise<void> => {
      const response = await fetch(`/api/notifications/${id}`, { method: "PATCH" });
      if (!response.ok) {
        pushToast(t("failedToUpdate"));
        return;
      }
      setNotificationItems((current) => current.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    },
    [pushToast, t],
  );

  const loadThread = useCallback(
    async (threadId: string): Promise<void> => {
      threadAbortRef.current?.abort();
      const controller = new AbortController();
      threadAbortRef.current = controller;
      setIsThreadLoading(true);
      setThreadMessages([]);
      try {
        const response = await fetch(`/api/messages/thread/${threadId}`, { signal: controller.signal });
        if (!response.ok) {
          if (!controller.signal.aborted) pushToast(t("failedToLoad"));
          return;
        }
        const result = (await response.json()) as MessagesThreadResponseDto;
        if (!controller.signal.aborted) {
          setThreadMessages(result.data ?? []);
          setThreadProfiles(result.profiles ?? {});
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        pushToast(t("failedToLoad"));
      } finally {
        if (!controller.signal.aborted) setIsThreadLoading(false);
      }
    },
    [pushToast, t],
  );

  useEffect(() => {
    return () => {
      inboxAbortRef.current?.abort();
      sentAbortRef.current?.abort();
      threadAbortRef.current?.abort();
      searchAbortRef.current?.abort();
      archiveAbortRef.current?.abort();
      notifAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (viewMode === "inbox") {
      void loadInbox();
    } else if (viewMode === "sent") {
      void loadSent();
    } else if (viewMode === "archive") {
      void loadArchive();
    } else if (viewMode === "notifications") {
      void loadNotifications();
    }
  }, [viewMode, loadInbox, loadSent, loadArchive, loadNotifications]);

  useEffect(() => {
    let cancelled = false;
    async function loadClans(): Promise<void> {
      if (!isContentMgr) return;
      const { data: clanData } = await supabase
        .from("clans")
        .select("id,name")
        .eq("is_unassigned", false)
        .order("name");
      if (cancelled) return;
      setClans((clanData ?? []) as readonly ClanOption[]);
    }
    void loadClans();
    return () => {
      cancelled = true;
    };
  }, [supabase, isContentMgr]);

  useEffect(() => {
    if (!initialRecipientId || initialRecipientId === userId) return;
    let cancelled = false;
    async function resolveRecipient(): Promise<void> {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, display_name, username")
        .eq("id", initialRecipientId)
        .single();
      if (!profile) return;
      if (cancelled) return;
      const label = profile.display_name ?? profile.username ?? profile.id;
      setComposeRecipients([{ id: profile.id, label }]);
      setComposeMode("direct");
      setIsComposeOpen(true);
    }
    void resolveRecipient();
    return () => {
      cancelled = true;
    };
  }, [initialRecipientId, userId, supabase]);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const query = recipientSearch.trim();
    if (query.length < 2) {
      setRecipientResults([]);
      setIsSearchDropdownOpen(false);
      return;
    }
    setIsSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      searchAbortRef.current?.abort();
      const controller = new AbortController();
      searchAbortRef.current = controller;
      try {
        const response = await fetch(`/api/messages/search-recipients?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (response.ok && !controller.signal.aborted) {
          const result = (await response.json()) as MessagesSearchRecipientsResponseDto;
          const results = (result.data ?? []) as readonly RecipientResult[];
          const selectedIds = new Set(composeRecipients.map((r) => r.id));
          setRecipientResults(results.filter((r) => !selectedIds.has(r.id)));
          setIsSearchDropdownOpen(true);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchAbortRef.current?.abort();
    };
  }, [recipientSearch, composeRecipients]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
        setIsSearchDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getProfileLabel = useCallback(
    (profileId: string, fallback?: string): string => {
      if (profileId === userId) return t("you");
      const profile = allProfiles[profileId];
      return resolveMessageProfileLabel(profile, fallback ?? t("unknownPartner"));
    },
    [userId, allProfiles, t],
  );

  const addRecipient = useCallback(
    (recipient: SelectedRecipient): void => {
      if (!composeRecipients.some((r) => r.id === recipient.id)) {
        if (isContentMgr) {
          setComposeRecipients((prev) => [...prev, recipient]);
        } else {
          setComposeRecipients([recipient]);
        }
      }
      setRecipientSearch("");
      setRecipientResults([]);
      setIsSearchDropdownOpen(false);
    },
    [composeRecipients, isContentMgr],
  );

  const removeRecipient = useCallback((recipientId: string): void => {
    setComposeRecipients((prev) => prev.filter((r) => r.id !== recipientId));
  }, []);

  const resetCompose = useCallback((): void => {
    setComposeRecipients([]);
    setComposeClanId("");
    setComposeSubject("");
    setComposeContent("");
    setComposeStatus("");
    setRecipientSearch("");
    setRecipientResults([]);
    setIsSearchDropdownOpen(false);
  }, []);

  const resetReply = useCallback((): void => {
    setIsReplyOpen(false);
    setReplyContent("");
    setReplyStatus("");
  }, []);

  const formatRecipientLabel = useCallback(
    (msg: SentMessage): string => {
      if (msg.message_type === "broadcast") return t("sentToAll");
      if (msg.message_type === "clan") return t("sentToClan", { clan: t("clan") });
      if (msg.recipients.length === 0) return t("unknownPartner");
      if (msg.recipients.length === 1) {
        return `${t("to")}: ${msg.recipients[0]!.label}`;
      }
      const MAX_SHOWN = 2;
      const shown = msg.recipients
        .slice(0, MAX_SHOWN)
        .map((r) => r.label)
        .join(", ");
      if (msg.recipients.length <= MAX_SHOWN) return t("sentToRecipients", { names: shown });
      return t("sentToCount", { shown, more: String(msg.recipients.length - MAX_SHOWN) });
    },
    [t],
  );

  const getMessageTypeLabel = useCallback(
    (messageType: string): string => {
      if (messageType === "broadcast" || messageType === "system") return t("broadcast");
      if (messageType === "clan") return t("clan");
      return "";
    },
    [t],
  );

  const clearSelection = useCallback((): void => {
    setSelectedThreadId("");
    setSelectedSentMsgId("");
    setThreadMessages([]);
    resetReply();
  }, [resetReply]);

  const handleViewModeChange = useCallback(
    (mode: ViewMode): void => {
      setViewMode(mode);
      setSelectedThreadId("");
      setSelectedSentMsgId("");
      setThreadMessages([]);
      setCheckedIds(new Set());
      resetReply();
    },
    [resetReply],
  );

  const handleSelectInboxThread = useCallback(
    (threadId: string): void => {
      setSelectedThreadId(threadId);
      setSelectedSentMsgId("");
      resetReply();
      void loadThread(threadId);
    },
    [loadThread, resetReply],
  );

  const handleSelectSentMessage = useCallback(
    (msgId: string): void => {
      setSelectedThreadId("");
      setSelectedSentMsgId(msgId);
      resetReply();
    },
    [resetReply],
  );

  const handleSelectArchivedItem = useCallback(
    (item: ArchivedItem): void => {
      resetReply();
      if (item.source === "inbox") {
        setSelectedThreadId(item.id);
        setSelectedSentMsgId("");
        void loadThread(item.id);
      } else {
        setSelectedSentMsgId(item.id);
        setSelectedThreadId("");
      }
    },
    [loadThread, resetReply],
  );

  const openReplyToMessage = useCallback((): void => {
    setIsReplyOpen(true);
  }, []);

  const handleSendReply = useCallback(
    async (event: FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      if (!replyContent.trim() || !selectedThreadId) return;
      const lastReceived = [...threadMessages].reverse().find((m) => m.sender_id !== userId);
      if (!lastReceived?.sender_id) {
        setReplyStatus(t("failedToSend"));
        return;
      }
      setReplyStatus(t("sending"));
      try {
        const response = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient_ids: [lastReceived.sender_id],
            subject: null,
            content: replyContent.trim(),
            message_type: "private",
            parent_id: selectedThreadId,
          }),
        });
        if (!response.ok) {
          const result = (await response.json()) as { readonly error?: string };
          setReplyStatus(result.error ?? t("failedToSend"));
          return;
        }
        resetReply();
        void loadThread(selectedThreadId);
      } catch {
        setReplyStatus(t("failedToSend"));
      }
    },
    [replyContent, userId, threadMessages, selectedThreadId, loadThread, resetReply, t],
  );

  const handleCompose = useCallback(
    async (event: FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      if (!composeContent.trim()) {
        setComposeStatus(t("messageRequired"));
        return;
      }
      try {
        if (composeMode === "direct") {
          if (composeRecipients.length === 0) {
            setComposeStatus(t("recipientRequired"));
            return;
          }
          setComposeStatus(t("sending"));
          const response = await fetch("/api/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              recipient_ids: composeRecipients.map((r) => r.id),
              subject: composeSubject.trim() || null,
              content: composeContent.trim(),
              message_type: "private",
            }),
          });
          if (!response.ok) {
            const result = (await response.json()) as { readonly error?: string };
            setComposeStatus(result.error ?? t("failedToSend"));
            return;
          }
          setComposeStatus(t("messageSent"));
        } else {
          const msgType = composeMode === "global" ? "broadcast" : "clan";
          if (composeMode === "clan" && !composeClanId) {
            setComposeStatus(t("clanAndMessageRequired"));
            return;
          }
          setComposeStatus(t("sendingBroadcast"));
          const response = await fetch("/api/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              recipient_ids: ["00000000-0000-0000-0000-000000000000"],
              subject: composeSubject.trim() || null,
              content: composeContent.trim(),
              message_type: msgType,
              clan_id: composeMode === "clan" ? composeClanId : undefined,
            }),
          });
          const result = (await response.json()) as Partial<MessageSendResponseDto> & {
            readonly error?: string;
            readonly recipient_count?: number;
          };
          if (!response.ok) {
            setComposeStatus(result.error ?? t("failedToSend"));
            return;
          }
          setComposeStatus(t("broadcastSent", { count: result.recipient_count ?? 0 }));
        }
        resetCompose();
        setIsComposeOpen(false);
        setViewMode("sent");
        void loadSent();
      } catch {
        setComposeStatus(t("failedToSend"));
      }
    },
    [composeContent, composeMode, composeRecipients, composeSubject, composeClanId, resetCompose, loadSent, t],
  );

  const handleDeleteMessage = useCallback(
    async (messageId: string): Promise<void> => {
      try {
        const response = await fetch(`/api/messages/${messageId}`, { method: "DELETE" });
        if (!response.ok) {
          pushToast(t("failedToDelete"));
          return;
        }
        setThreadMessages((current) => current.filter((m) => m.id !== messageId));
        void loadInbox();
      } catch {
        pushToast(t("failedToDelete"));
      }
    },
    [loadInbox, pushToast, t],
  );

  /* ── Delete confirmation state ── */
  const [deleteConfirm, setDeleteConfirm] = useState<{
    readonly type: "thread" | "sent";
    readonly ids: readonly string[];
    /** Additional IDs of a different type (used for mixed archive deletes) */
    readonly extraType?: "thread" | "sent";
    readonly extraIds?: readonly string[];
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  /* ── Multi-select state ── */
  const [checkedIds, setCheckedIds] = useState<ReadonlySet<string>>(new Set());

  const toggleChecked = useCallback((id: string): void => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAllChecked = useCallback((): void => {
    if (viewMode === "inbox") {
      const allIds = inboxThreads.map((th) => th.thread_id);
      setCheckedIds((prev) => (prev.size === allIds.length ? new Set() : new Set(allIds)));
    } else if (viewMode === "sent") {
      const allIds = sentMessages.map((m) => m.id);
      setCheckedIds((prev) => (prev.size === allIds.length ? new Set() : new Set(allIds)));
    } else {
      const allIds = archivedItems.map((i) => i.id);
      setCheckedIds((prev) => (prev.size === allIds.length ? new Set() : new Set(allIds)));
    }
  }, [viewMode, inboxThreads, sentMessages, archivedItems]);

  const clearChecked = useCallback((): void => {
    setCheckedIds(new Set());
  }, []);

  const requestBatchDelete = useCallback((): void => {
    if (checkedIds.size === 0) return;
    if (viewMode === "archive") {
      /* In archive: separate by source so each group hits the correct API endpoint */
      const threadIds = archivedItems.filter((i) => i.source === "inbox" && checkedIds.has(i.id)).map((i) => i.id);
      const sentIds = archivedItems.filter((i) => i.source === "sent" && checkedIds.has(i.id)).map((i) => i.id);
      if (threadIds.length > 0 && sentIds.length === 0) {
        setDeleteConfirm({ type: "thread", ids: threadIds });
      } else if (sentIds.length > 0 && threadIds.length === 0) {
        setDeleteConfirm({ type: "sent", ids: sentIds });
      } else {
        /* Mixed: primary group is threads, extra group is sent */
        setDeleteConfirm({ type: "thread", ids: threadIds, extraType: "sent", extraIds: sentIds });
      }
    } else {
      setDeleteConfirm({
        type: viewMode === "inbox" ? "thread" : "sent",
        ids: Array.from(checkedIds),
      });
    }
  }, [checkedIds, viewMode, archivedItems]);

  const confirmDelete = useCallback(async (): Promise<void> => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      const { type, ids, extraType, extraIds } = deleteConfirm;

      /* Build the list of fetch promises — each ID goes to the correct endpoint */
      const endpoint = type === "thread" ? "/api/messages/thread/" : "/api/messages/sent/";
      const fetches = ids.map((id) => fetch(`${endpoint}${id}`, { method: "DELETE" }));

      /* Handle mixed deletes (e.g. archive with both inbox + sent selected) */
      if (extraType && extraIds && extraIds.length > 0) {
        const extraEndpoint = extraType === "thread" ? "/api/messages/thread/" : "/api/messages/sent/";
        for (const id of extraIds) {
          fetches.push(fetch(`${extraEndpoint}${id}`, { method: "DELETE" }));
        }
      }

      const results = await Promise.allSettled(fetches);

      const failCount = results.filter(
        (r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok),
      ).length;
      if (failCount > 0) {
        pushToast(t("failedToDeleteSome", { count: failCount }));
      }

      /* Collect all deleted IDs from both groups */
      const allDeletedIds = [...ids, ...(extraIds ?? [])];
      const deletedSet = new Set(allDeletedIds);

      /* Clear selection if any deleted items were open */
      if (deletedSet.has(selectedThreadId)) {
        setSelectedThreadId("");
        setThreadMessages([]);
        resetReply();
      }
      if (deletedSet.has(selectedSentMsgId)) {
        setSelectedSentMsgId("");
      }

      /* Reload the appropriate list */
      if (viewMode === "archive") {
        void loadArchive();
      } else if (type === "thread") {
        void loadInbox();
      } else {
        void loadSent();
      }

      /* Clear checked IDs for deleted items */
      setCheckedIds((prev) => {
        const next = new Set(prev);
        for (const id of allDeletedIds) next.delete(id);
        return next;
      });
    } catch {
      pushToast(t("failedToDelete"));
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  }, [
    deleteConfirm,
    selectedThreadId,
    selectedSentMsgId,
    viewMode,
    loadInbox,
    loadSent,
    loadArchive,
    pushToast,
    resetReply,
    t,
  ]);

  /* ── Archive / unarchive handlers ── */

  const handleArchive = useCallback(
    async (type: "thread" | "sent", ids: readonly string[]): Promise<void> => {
      try {
        const response = await fetch("/api/messages/archive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, ids, action: "archive" }),
        });
        if (!response.ok) {
          pushToast(t("failedToArchive"));
          return;
        }
        /* Clear selection for archived items */
        setCheckedIds((prev) => {
          const next = new Set(prev);
          for (const id of ids) next.delete(id);
          return next;
        });
        if (type === "thread") {
          if (ids.includes(selectedThreadId)) {
            setSelectedThreadId("");
            setThreadMessages([]);
            resetReply();
          }
          void loadInbox();
        } else {
          if (ids.includes(selectedSentMsgId)) {
            setSelectedSentMsgId("");
          }
          void loadSent();
        }
        pushToast(t("archived", { count: ids.length }));
      } catch {
        pushToast(t("failedToArchive"));
      }
    },
    [selectedThreadId, selectedSentMsgId, loadInbox, loadSent, pushToast, resetReply, t],
  );

  const handleUnarchive = useCallback(
    async (type: "thread" | "sent", ids: readonly string[]): Promise<void> => {
      try {
        const response = await fetch("/api/messages/archive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, ids, action: "unarchive" }),
        });
        if (!response.ok) {
          pushToast(t("failedToUnarchive"));
          return;
        }
        setCheckedIds((prev) => {
          const next = new Set(prev);
          for (const id of ids) next.delete(id);
          return next;
        });
        /* Clear selection if unarchived item was open */
        if (type === "thread" && ids.includes(selectedThreadId)) {
          setSelectedThreadId("");
          setThreadMessages([]);
        }
        if (type === "sent" && ids.includes(selectedSentMsgId)) {
          setSelectedSentMsgId("");
        }
        void loadArchive();
        pushToast(t("unarchived", { count: ids.length }));
      } catch {
        pushToast(t("failedToUnarchive"));
      }
    },
    [selectedThreadId, selectedSentMsgId, loadArchive, pushToast, t],
  );

  const requestBatchArchive = useCallback((): void => {
    if (checkedIds.size === 0) return;
    if (viewMode === "archive") {
      /* Unarchive: separate by source */
      const threadIds = archivedItems.filter((i) => i.source === "inbox" && checkedIds.has(i.id)).map((i) => i.id);
      const sentIds = archivedItems.filter((i) => i.source === "sent" && checkedIds.has(i.id)).map((i) => i.id);
      const promises: Promise<void>[] = [];
      if (threadIds.length > 0) promises.push(handleUnarchive("thread", threadIds));
      if (sentIds.length > 0) promises.push(handleUnarchive("sent", sentIds));
      void Promise.all(promises);
    } else {
      const type = viewMode === "inbox" ? "thread" : "sent";
      void handleArchive(type as "thread" | "sent", Array.from(checkedIds));
    }
  }, [checkedIds, viewMode, archivedItems, handleArchive, handleUnarchive]);

  const totalInboxUnread = useMemo(
    () => inboxThreads.reduce((sum, thread) => sum + thread.unread_count, 0),
    [inboxThreads],
  );

  const composeModeOptions = useMemo(() => {
    const options = [{ value: "direct", label: t("directMessage") }];
    if (isContentMgr) {
      options.push({ value: "clan", label: t("clanBroadcast") }, { value: "global", label: t("globalBroadcast") });
    }
    return options;
  }, [isContentMgr, t]);

  const selectedSentMessage = useMemo((): SentMessage | undefined => {
    if (!selectedSentMsgId) return undefined;
    /* Look in regular sent list first */
    const fromSent = sentMessages.find((m) => m.id === selectedSentMsgId);
    if (fromSent) return fromSent;
    /* Fall back to archived items (archive tab shows sent messages that aren't in sentMessages) */
    if (viewMode === "archive") {
      const archived = archivedItems.find((i) => i.id === selectedSentMsgId && i.source === "sent");
      if (archived) {
        return {
          id: archived.id,
          sender_id: archived.sender_id,
          subject: archived.subject,
          content: archived.content,
          message_type: archived.message_type,
          thread_id: null,
          parent_id: null,
          created_at: archived.created_at,
          recipient_count: archived.recipient_count,
          recipients: archived.recipients,
        };
      }
    }
    return undefined;
  }, [sentMessages, selectedSentMsgId, viewMode, archivedItems]);

  const selectedInboxThread = useMemo(
    () => inboxThreads.find((th) => th.thread_id === selectedThreadId),
    [inboxThreads, selectedThreadId],
  );

  const canReply =
    (viewMode === "inbox" || (viewMode === "archive" && selectedThreadId !== "")) &&
    selectedThreadId !== "" &&
    (selectedInboxThread?.message_type === "private" ||
      (viewMode === "archive" && threadMessages.some((m) => m.message_type === "private"))) &&
    threadMessages.length > 0;

  return {
    viewMode,
    typeFilter,
    setTypeFilter,
    search,
    setSearch,
    inboxThreads,
    isInboxLoading,
    sentMessages,
    sentProfiles,
    isSentLoading,
    archivedItems,
    isArchiveLoading,
    notificationItems,
    isNotificationsLoading,
    handleDeleteNotification,
    handleDeleteAllNotifications,
    handleMarkNotificationRead,
    selectedThreadId,
    selectedSentMsgId,
    threadMessages,
    isThreadLoading,
    isComposeOpen,
    setIsComposeOpen,
    composeMode,
    setComposeMode,
    composeRecipients,
    composeClanId,
    setComposeClanId,
    composeSubject,
    setComposeSubject,
    composeContent,
    setComposeContent,
    composeStatus,
    isReplyOpen,
    replyContent,
    setReplyContent,
    replyStatus,
    setIsReplyOpen,
    recipientSearch,
    setRecipientSearch,
    recipientResults,
    isSearching,
    isSearchDropdownOpen,
    setIsSearchDropdownOpen,
    searchWrapperRef,
    isContentMgr,
    clans,
    allProfiles,
    totalInboxUnread,
    composeModeOptions,
    selectedSentMessage,
    selectedInboxThread,
    canReply,
    clearSelection,
    handleViewModeChange,
    handleSelectInboxThread,
    handleSelectSentMessage,
    handleSelectArchivedItem,
    openReplyToMessage,
    handleSendReply,
    handleCompose,
    handleDeleteMessage,
    confirmDelete,
    deleteConfirm,
    setDeleteConfirm,
    isDeleting,
    checkedIds,
    toggleChecked,
    toggleAllChecked,
    clearChecked,
    requestBatchDelete,
    requestBatchArchive,
    handleArchive,
    handleUnarchive,
    getProfileLabel,
    addRecipient,
    removeRecipient,
    resetCompose,
    resetReply,
    formatRecipientLabel,
    getMessageTypeLabel,
    loadThread,
    loadInbox,
    loadSent,
    loadArchive,
  };
}
