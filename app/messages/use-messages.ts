"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useSupabase } from "../hooks/use-supabase";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { useToast } from "../components/toast-provider";
import type { InboxThread, SentMessage, ThreadMessage, RecipientResult } from "@/lib/types/domain";
import type { ProfileMap, ViewMode, ClanOption, SelectedRecipient, ComposeMode } from "./messages-types";

const REPLY_SUBJECT_PREFIX = "Re: ";

export interface UseMessagesParams {
  readonly userId: string;
  readonly initialRecipientId?: string;
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
  readonly replySubject: string;
  readonly setReplySubject: (v: string) => void;
  readonly replyContent: string;
  readonly setReplyContent: (v: string) => void;
  readonly replyStatus: string;
  readonly replyParentId: string;

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

  /* Handlers */
  readonly handleViewModeChange: (mode: ViewMode) => void;
  readonly handleSelectInboxThread: (threadId: string) => void;
  readonly handleSelectSentMessage: (msgId: string) => void;
  readonly openReplyToMessage: (message: ThreadMessage) => void;
  readonly handleSendReply: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  readonly handleCompose: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  readonly handleDeleteMessage: (messageId: string) => Promise<void>;

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
}

/**
 * Hook for messages state, data loading, and message operations.
 * Manages inbox, sent, thread views, compose, reply, recipient search,
 * and all API interactions.
 */
export function useMessages({ userId, initialRecipientId }: UseMessagesParams): UseMessagesResult {
  const supabase = useSupabase();
  const t = useTranslations("messagesPage");
  const { pushToast } = useToast();
  const { isContentManager: isContentMgr } = useUserRole(supabase);

  /* ── View state ── */
  const [viewMode, setViewMode] = useState<ViewMode>("inbox");
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
  const [replySubject, setReplySubject] = useState<string>("");
  const [replyContent, setReplyContent] = useState<string>("");
  const [replyStatus, setReplyStatus] = useState<string>("");
  const [replyParentId, setReplyParentId] = useState<string>("");

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

  /* ── Clans ── */
  const [clans, setClans] = useState<readonly ClanOption[]>([]);

  const allProfiles = useMemo<ProfileMap>(
    () => ({ ...inboxProfiles, ...sentProfiles, ...threadProfiles }),
    [inboxProfiles, sentProfiles, threadProfiles],
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
      if (response.ok) {
        const result = await response.json();
        if (!controller.signal.aborted) {
          setInboxThreads(result.data ?? []);
          setInboxProfiles(result.profiles ?? {});
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      throw err;
    } finally {
      if (!controller.signal.aborted) setIsInboxLoading(false);
    }
  }, [typeFilter, search]);

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
      if (response.ok) {
        const result = await response.json();
        if (!controller.signal.aborted) {
          setSentMessages(result.data ?? []);
          setSentProfiles(result.profiles ?? {});
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      throw err;
    } finally {
      if (!controller.signal.aborted) setIsSentLoading(false);
    }
  }, [typeFilter, search]);

  const loadThread = useCallback(async (threadId: string): Promise<void> => {
    threadAbortRef.current?.abort();
    const controller = new AbortController();
    threadAbortRef.current = controller;
    setIsThreadLoading(true);
    setThreadMessages([]);
    try {
      const response = await fetch(`/api/messages/thread/${threadId}`, { signal: controller.signal });
      if (response.ok) {
        const result = await response.json();
        if (!controller.signal.aborted) {
          setThreadMessages(result.data ?? []);
          setThreadProfiles(result.profiles ?? {});
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      throw err;
    } finally {
      if (!controller.signal.aborted) setIsThreadLoading(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      inboxAbortRef.current?.abort();
      sentAbortRef.current?.abort();
      threadAbortRef.current?.abort();
      searchAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (viewMode === "inbox") {
      void loadInbox();
    } else {
      void loadSent();
    }
  }, [viewMode, loadInbox, loadSent]);

  useEffect(() => {
    async function loadClans(): Promise<void> {
      if (!isContentMgr) return;
      const { data: clanData } = await supabase
        .from("clans")
        .select("id,name")
        .eq("is_unassigned", false)
        .order("name");
      setClans((clanData ?? []) as readonly ClanOption[]);
    }
    void loadClans();
  }, [supabase, isContentMgr]);

  useEffect(() => {
    if (!initialRecipientId || initialRecipientId === userId) return;
    async function resolveRecipient(): Promise<void> {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, display_name, username")
        .eq("id", initialRecipientId)
        .single();
      if (!profile) return;
      const label = profile.display_name ?? profile.username ?? profile.id;
      setComposeRecipients([{ id: profile.id, label }]);
      setComposeMode("direct");
      setIsComposeOpen(true);
    }
    void resolveRecipient();
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
          const result = await response.json();
          const results = (result.data ?? []) as RecipientResult[];
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
      if (!profile) return fallback ?? t("unknownPartner");
      return profile.display_name ?? profile.username ?? profile.email;
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
    setReplySubject("");
    setReplyStatus("");
    setReplyParentId("");
  }, []);

  const formatRecipientLabel = useCallback(
    (msg: SentMessage): string => {
      if (msg.message_type === "broadcast") return t("sentToAll");
      if (msg.message_type === "clan") return t("sentToClan", { clan: "Clan" });
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

  const handleViewModeChange = useCallback(
    (mode: ViewMode): void => {
      setViewMode(mode);
      setSelectedThreadId("");
      setSelectedSentMsgId("");
      setThreadMessages([]);
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

  const openReplyToMessage = useCallback((message: ThreadMessage): void => {
    const originalSubject = message.subject ?? "";
    const prefilled = originalSubject.startsWith(REPLY_SUBJECT_PREFIX)
      ? originalSubject
      : originalSubject
        ? `${REPLY_SUBJECT_PREFIX}${originalSubject}`
        : "";
    setReplySubject(prefilled);
    setReplyParentId(message.id);
    const quoted = message.content
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
    setReplyContent(`\n\n${quoted}\n`);
    setIsReplyOpen(true);
  }, []);

  const handleSendReply = useCallback(
    async (event: FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      if (!replyContent.trim() || !replyParentId) return;
      const parentMsg = threadMessages.find((m) => m.id === replyParentId);
      if (!parentMsg?.sender_id) return;
      setReplyStatus(t("sending"));
      try {
        const response = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient_ids: [parentMsg.sender_id],
            subject: replySubject.trim() || null,
            content: replyContent.trim(),
            message_type: "private",
            parent_id: replyParentId,
          }),
        });
        if (!response.ok) {
          const result = await response.json();
          setReplyStatus(result.error ?? t("failedToSend"));
          return;
        }
        resetReply();
        void loadThread(selectedThreadId);
      } catch {
        setReplyStatus(t("failedToSend"));
      }
    },
    [replyContent, replyParentId, replySubject, threadMessages, selectedThreadId, loadThread, resetReply, t],
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
            const result = await response.json();
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
          const result = await response.json();
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

  const selectedSentMessage = useMemo(
    () => sentMessages.find((m) => m.id === selectedSentMsgId),
    [sentMessages, selectedSentMsgId],
  );

  const selectedInboxThread = useMemo(
    () => inboxThreads.find((th) => th.thread_id === selectedThreadId),
    [inboxThreads, selectedThreadId],
  );

  const canReply =
    viewMode === "inbox" &&
    selectedThreadId !== "" &&
    selectedInboxThread?.message_type === "private" &&
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
    replySubject,
    setReplySubject,
    replyContent,
    setReplyContent,
    replyStatus,
    replyParentId,
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
    handleViewModeChange,
    handleSelectInboxThread,
    handleSelectSentMessage,
    openReplyToMessage,
    handleSendReply,
    handleCompose,
    handleDeleteMessage,
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
  };
}
