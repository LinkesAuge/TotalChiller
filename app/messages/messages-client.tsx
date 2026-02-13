"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSupabase } from "../hooks/use-supabase";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { formatLocalDateTime } from "../../lib/date-format";
import SearchInput from "../components/ui/search-input";
import DataState from "../components/data-state";
import RadixSelect from "../components/ui/radix-select";
import MarkdownEditor from "../components/markdown-editor";

import type { InboxThread, SentMessage, ThreadMessage, RecipientResult, RecipientSummary } from "@/lib/types/domain";

const AppMarkdown = dynamic(() => import("@/lib/markdown/app-markdown"), {
  loading: () => <div className="skeleton h-16 rounded" />,
});

/* ── Types ── */

interface ProfileEntry {
  readonly email: string;
  readonly username: string | null;
  readonly display_name: string | null;
}

interface ProfileMap {
  readonly [userId: string]: ProfileEntry;
}

type ViewMode = "inbox" | "sent";

interface ClanOption {
  readonly id: string;
  readonly name: string;
}

interface SelectedRecipient {
  readonly id: string;
  readonly label: string;
}

type ComposeMode = "direct" | "clan" | "global";

const MESSAGE_IMAGE_BUCKET = "message-images";
const REPLY_SUBJECT_PREFIX = "Re: ";

/* ── Component ── */

interface MessagesClientProps {
  readonly userId: string;
  readonly initialRecipientId?: string;
}

function MessagesClient({ userId, initialRecipientId }: MessagesClientProps): JSX.Element {
  const supabase = useSupabase();
  const locale = useLocale();
  const t = useTranslations("messagesPage");

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

  /* ── Abort controllers for cancelling stale fetch requests ── */
  const inboxAbortRef = useRef<AbortController | null>(null);
  const sentAbortRef = useRef<AbortController | null>(null);
  const threadAbortRef = useRef<AbortController | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  /* ── Role / permission state ── */
  const { isContentManager: isContentMgr } = useUserRole(supabase);
  const [clans, setClans] = useState<readonly ClanOption[]>([]);

  /* ══════════════════════════════════════════════════
     Merged profile map (computed once, not on every call)
     ══════════════════════════════════════════════════ */

  const allProfiles = useMemo<ProfileMap>(
    () => ({ ...inboxProfiles, ...sentProfiles, ...threadProfiles }),
    [inboxProfiles, sentProfiles, threadProfiles],
  );

  /* ══════════════════════════════════════════════════
     Data Loading
     ══════════════════════════════════════════════════ */

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

  /* Abort all pending requests on unmount */
  useEffect(() => {
    return () => {
      inboxAbortRef.current?.abort();
      sentAbortRef.current?.abort();
      threadAbortRef.current?.abort();
      searchAbortRef.current?.abort();
    };
  }, []);

  /* Load data when view/filter changes */
  useEffect(() => {
    if (viewMode === "inbox") {
      void loadInbox();
    } else {
      void loadSent();
    }
  }, [viewMode, loadInbox, loadSent]);

  /* Load clans for broadcast */
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

  /* Pre-fill compose from ?to= param */
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

  /* ── Recipient search with debounce ── */

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

  /* ══════════════════════════════════════════════════
     Helpers
     ══════════════════════════════════════════════════ */

  function getProfileLabel(profileId: string, fallback?: string): string {
    if (profileId === userId) return t("you");
    const profile = allProfiles[profileId];
    if (!profile) return fallback ?? t("unknownPartner");
    return profile.display_name ?? profile.username ?? profile.email;
  }

  function addRecipient(recipient: SelectedRecipient): void {
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
  }

  function removeRecipient(recipientId: string): void {
    setComposeRecipients((prev) => prev.filter((r) => r.id !== recipientId));
  }

  function resetCompose(): void {
    setComposeRecipients([]);
    setComposeClanId("");
    setComposeSubject("");
    setComposeContent("");
    setComposeStatus("");
    setRecipientSearch("");
    setRecipientResults([]);
    setIsSearchDropdownOpen(false);
  }

  function resetReply(): void {
    setIsReplyOpen(false);
    setReplyContent("");
    setReplySubject("");
    setReplyStatus("");
    setReplyParentId("");
  }

  function formatRecipientLabel(msg: SentMessage): string {
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
  }

  function getMessageTypeLabel(messageType: string): string {
    if (messageType === "broadcast" || messageType === "system") return t("broadcast");
    if (messageType === "clan") return t("clan");
    return "";
  }

  /* ══════════════════════════════════════════════════
     Thread Loading
     ══════════════════════════════════════════════════ */

  async function loadThread(threadId: string): Promise<void> {
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
  }

  /* ══════════════════════════════════════════════════
     Handlers
     ══════════════════════════════════════════════════ */

  function handleViewModeChange(mode: ViewMode): void {
    setViewMode(mode);
    setSelectedThreadId("");
    setSelectedSentMsgId("");
    setThreadMessages([]);
    resetReply();
  }

  function handleSelectInboxThread(threadId: string): void {
    setSelectedThreadId(threadId);
    setSelectedSentMsgId("");
    resetReply();
    void loadThread(threadId);
  }

  function handleSelectSentMessage(msgId: string): void {
    setSelectedSentMsgId(msgId);
    setSelectedThreadId("");
    resetReply();
  }

  function openReplyToMessage(message: ThreadMessage): void {
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
  }

  async function handleSendReply(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!replyContent.trim() || !replyParentId) return;

    /* Find the sender of the message we're replying to */
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
      /* Reload thread to show the new reply */
      void loadThread(selectedThreadId);
    } catch {
      setReplyStatus(t("failedToSend"));
    }
  }

  async function handleCompose(event: FormEvent<HTMLFormElement>): Promise<void> {
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
        /* Broadcast or clan */
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
            /* Server resolves actual recipients for broadcast/clan types */
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
      /* Always reload sent since we just switched to it */
      void loadSent();
    } catch {
      setComposeStatus(t("failedToSend"));
    }
  }

  async function handleDeleteMessage(messageId: string): Promise<void> {
    try {
      const response = await fetch(`/api/messages/${messageId}`, { method: "DELETE" });
      if (!response.ok) return;
      /* Remove from thread view */
      setThreadMessages((current) => current.filter((m) => m.id !== messageId));
      /* Reload inbox to update thread list */
      void loadInbox();
    } catch {
      /* Network failure — silently ignore (message stays visible) */
    }
  }

  /* ── Derived values ── */

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

  /* Can reply only in inbox thread view, for private messages */
  const canReply =
    viewMode === "inbox" &&
    selectedThreadId !== "" &&
    selectedInboxThread?.message_type === "private" &&
    threadMessages.length > 0;

  /* ══════════════════════════════════════════════════
     Render
     ══════════════════════════════════════════════════ */

  return (
    <div className="grid">
      {/* Compose toggle */}
      <div className="col-span-full flex gap-3 flex-wrap">
        <button
          className="button"
          type="button"
          onClick={() => {
            if (isComposeOpen) resetCompose();
            setIsComposeOpen(!isComposeOpen);
          }}
        >
          {isComposeOpen ? t("cancel") : t("newMessage")}
        </button>
      </div>

      {/* ── Compose form ── */}
      {isComposeOpen ? (
        <section className="card col-span-full">
          <div className="card-header">
            <div>
              <div className="card-title">{t("newMessage")}</div>
              <div className="card-subtitle">
                {composeMode === "direct"
                  ? t("newMessageSubtitle")
                  : composeMode === "clan"
                    ? t("broadcastSubtitle")
                    : t("sendToAll")}
              </div>
            </div>
          </div>
          <form onSubmit={handleCompose}>
            {/* Mode selector (content managers only) */}
            {isContentMgr ? (
              <div className="form-group">
                <label id="recipientTypeLabel">{t("recipientType")}</label>
                <div className="tabs text-sm" role="group" aria-labelledby="recipientTypeLabel">
                  {composeModeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`tab ${composeMode === option.value ? "active" : ""}`}
                      onClick={() => {
                        setComposeMode(option.value as ComposeMode);
                        setComposeRecipients([]);
                        setComposeClanId("");
                        setComposeStatus("");
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Recipient selection: direct message mode */}
            {composeMode === "direct" ? (
              <div className="form-group">
                <label htmlFor="recipientSearch">{t("to")}</label>
                {composeRecipients.length > 0 ? (
                  <div className="recipient-chips flex flex-wrap gap-1.5 mb-2">
                    {composeRecipients.map((recipient) => (
                      <span key={recipient.id} className="badge inline-flex items-center gap-1">
                        {recipient.label}
                        <button
                          type="button"
                          className="p-0"
                          onClick={() => removeRecipient(recipient.id)}
                          aria-label={t("removeRecipient")}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "inherit",
                            fontSize: "1rem",
                            lineHeight: 1,
                          }}
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
                <div ref={searchWrapperRef} className="relative">
                  <input
                    id="recipientSearch"
                    value={recipientSearch}
                    onChange={(event) => setRecipientSearch(event.target.value)}
                    onFocus={() => {
                      if (recipientResults.length > 0) setIsSearchDropdownOpen(true);
                    }}
                    placeholder={t("searchRecipient")}
                    autoComplete="off"
                  />
                  {isSearching ? (
                    <div className="combobox-dropdown absolute left-0 right-0 z-10" style={{ top: "100%" }}>
                      <div className="combobox-option p-2 opacity-60">{t("loadingMessages")}</div>
                    </div>
                  ) : isSearchDropdownOpen && recipientResults.length > 0 ? (
                    <div
                      className="combobox-dropdown absolute left-0 right-0 z-10"
                      style={{ top: "100%", maxHeight: "240px", overflowY: "auto" }}
                    >
                      {recipientResults.map((result) => (
                        <button
                          key={result.id}
                          type="button"
                          className="combobox-option py-2 px-3 text-left cursor-pointer block w-full"
                          style={{ border: "none", background: "none" }}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            addRecipient({ id: result.id, label: result.label });
                          }}
                        >
                          <div>
                            <strong>{result.label}</strong>
                            {result.username ? (
                              <span className="text-muted ml-2" style={{ fontSize: "0.85em" }}>
                                @{result.username}
                              </span>
                            ) : null}
                          </div>
                          {result.gameAccounts.length > 0 ? (
                            <div className="text-muted text-[0.8em]">
                              {t("gameAccount")}: {result.gameAccounts.join(", ")}
                            </div>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  ) : isSearchDropdownOpen && recipientSearch.trim().length >= 2 ? (
                    <div className="combobox-dropdown absolute left-0 right-0 z-10" style={{ top: "100%" }}>
                      <div className="combobox-option p-2 opacity-60">{t("noResults")}</div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* Clan selector: clan broadcast mode */}
            {composeMode === "clan" ? (
              <div className="form-group">
                <label htmlFor="composeClan">{t("clan")}</label>
                <RadixSelect
                  id="composeClan"
                  ariaLabel={t("clan")}
                  value={composeClanId}
                  onValueChange={(v) => setComposeClanId(v)}
                  options={[
                    { value: "", label: t("selectClan") },
                    ...clans.map((clan) => ({ value: clan.id, label: clan.name })),
                  ]}
                />
              </div>
            ) : null}

            {/* Subject */}
            <div className="form-group">
              <label htmlFor="composeSubject">{t("subject")}</label>
              <input
                id="composeSubject"
                value={composeSubject}
                onChange={(event) => setComposeSubject(event.target.value)}
                placeholder={t("subjectPlaceholder")}
              />
            </div>

            {/* Message content — shared MarkdownEditor */}
            <div className="form-group">
              <label htmlFor="composeContent">{t("message")}</label>
              <MarkdownEditor
                id="composeContent"
                value={composeContent}
                onChange={setComposeContent}
                supabase={supabase}
                userId={userId}
                placeholder={composeMode === "direct" ? t("messagePlaceholder") : t("broadcastPlaceholder")}
                rows={8}
                storageBucket={MESSAGE_IMAGE_BUCKET}
              />
            </div>

            {/* Submit */}
            <div className="list inline">
              <button className="button primary" type="submit">
                {composeMode === "direct" ? t("send") : t("sendBroadcast")}
              </button>
            </div>
            {composeStatus ? <p className="text-muted">{composeStatus}</p> : null}
          </form>
        </section>
      ) : null}

      {/* ══════════════════════════════════════════════════
          Main Layout: List + Detail
          ══════════════════════════════════════════════════ */}
      <div className="messages-layout">
        {/* ── Left panel: Message list ── */}
        <section className="card messages-list-panel">
          <div className="messages-view-tabs">
            <button
              className={`messages-view-tab ${viewMode === "inbox" ? "active" : ""}`}
              type="button"
              onClick={() => handleViewModeChange("inbox")}
            >
              {t("inbox")}
              {totalInboxUnread > 0 ? (
                <span className="badge ml-1.5" style={{ fontSize: "0.7rem" }}>
                  {totalInboxUnread}
                </span>
              ) : null}
            </button>
            <button
              className={`messages-view-tab ${viewMode === "sent" ? "active" : ""}`}
              type="button"
              onClick={() => handleViewModeChange("sent")}
            >
              {t("sent")}
            </button>
          </div>
          <div className="messages-filters">
            <SearchInput
              id="messageSearch"
              label=""
              value={search}
              onChange={setSearch}
              placeholder={t("searchPlaceholder")}
            />
            <div className="tabs text-[0.8rem]">
              {(["all", "private", "clan", "broadcast"] as const).map((tab) => (
                <button
                  key={tab}
                  className={`tab ${typeFilter === tab ? "active" : ""}`}
                  type="button"
                  onClick={() => setTypeFilter(tab)}
                >
                  {tab === "all"
                    ? t("all")
                    : tab === "private"
                      ? t("private")
                      : tab === "clan"
                        ? t("clan")
                        : t("broadcast")}
                </button>
              ))}
            </div>
          </div>

          {/* ── Inbox thread list ── */}
          {viewMode === "inbox" ? (
            <div className="messages-conversation-list">
              <DataState
                isLoading={isInboxLoading}
                isEmpty={inboxThreads.length === 0}
                loadingNode={
                  <div className="list-item">
                    <span className="text-muted">{t("loadingMessages")}</span>
                  </div>
                }
                emptyNode={
                  <div className="list-item">
                    <span className="text-muted">{t("noMessages")}</span>
                  </div>
                }
              >
                {inboxThreads.map((thread) => {
                  const msg = thread.latest_message;
                  const senderLabel = msg.sender_id
                    ? getProfileLabel(msg.sender_id)
                    : msg.message_type === "system"
                      ? t("systemPartner")
                      : t("unknownPartner");
                  return (
                    <button
                      key={thread.thread_id}
                      type="button"
                      className={`messages-conversation-item ${selectedThreadId === thread.thread_id ? "active" : ""} ${thread.unread_count > 0 ? "unread" : ""}`}
                      onClick={() => handleSelectInboxThread(thread.thread_id)}
                    >
                      {/* Row 1: Subject + date */}
                      <div className="messages-conversation-subject-row">
                        <strong className="messages-conversation-subject">{msg.subject || t("noSubject")}</strong>
                        <span className="text-muted" style={{ fontSize: "0.72rem", flexShrink: 0 }}>
                          {formatLocalDateTime(msg.created_at, locale)}
                        </span>
                      </div>
                      {/* Row 2: Sender + badges */}
                      <div className="messages-conversation-sender-row">
                        <span className="text-muted" style={{ fontSize: "0.82rem" }}>
                          {t("from")}: {senderLabel}
                        </span>
                        <span className="messages-meta">
                          {thread.unread_count > 0 ? (
                            <span className="badge">{t("newInThread", { count: thread.unread_count })}</span>
                          ) : null}
                          {thread.message_count > 1 ? (
                            <span className="badge" style={{ fontSize: "0.7rem" }}>
                              {thread.message_count}
                            </span>
                          ) : null}
                          {getMessageTypeLabel(thread.message_type) ? (
                            <span className="badge" style={{ fontSize: "0.7rem" }}>
                              {getMessageTypeLabel(thread.message_type)}
                            </span>
                          ) : null}
                        </span>
                      </div>
                      {/* Row 3: Content preview */}
                      <div className="messages-conversation-snippet">
                        {msg.content.length > 80 ? `${msg.content.slice(0, 80)}...` : msg.content}
                      </div>
                    </button>
                  );
                })}
              </DataState>
            </div>
          ) : (
            /* ── Sent messages list ── */
            <div className="messages-conversation-list">
              <DataState
                isLoading={isSentLoading}
                isEmpty={sentMessages.length === 0}
                loadingNode={
                  <div className="list-item">
                    <span className="text-muted">{t("loadingMessages")}</span>
                  </div>
                }
                emptyNode={
                  <div className="list-item">
                    <span className="text-muted">{t("noSentMessages")}</span>
                  </div>
                }
              >
                {sentMessages.map((msg) => (
                  <button
                    key={msg.id}
                    type="button"
                    className={`messages-conversation-item ${selectedSentMsgId === msg.id ? "active" : ""}`}
                    onClick={() => handleSelectSentMessage(msg.id)}
                  >
                    {/* Row 1: Subject + date */}
                    <div className="messages-conversation-subject-row">
                      <strong className="messages-conversation-subject">{msg.subject || t("noSubject")}</strong>
                      <span className="text-muted" style={{ fontSize: "0.72rem", flexShrink: 0 }}>
                        {formatLocalDateTime(msg.created_at, locale)}
                      </span>
                    </div>
                    {/* Row 2: Recipients + type badge */}
                    <div className="messages-conversation-sender-row">
                      <span className="text-muted" style={{ fontSize: "0.82rem" }}>
                        {formatRecipientLabel(msg)}
                      </span>
                      <span className="messages-meta">
                        {getMessageTypeLabel(msg.message_type) ? (
                          <span className="badge" style={{ fontSize: "0.7rem" }}>
                            {getMessageTypeLabel(msg.message_type)}
                          </span>
                        ) : null}
                      </span>
                    </div>
                    {/* Row 3: Content preview */}
                    <div className="messages-conversation-snippet">
                      {msg.content.length > 80 ? `${msg.content.slice(0, 80)}...` : msg.content}
                    </div>
                  </button>
                ))}
              </DataState>
            </div>
          )}
        </section>

        {/* ── Right panel: Thread / message detail ── */}
        <section className="card messages-thread-panel">
          {viewMode === "inbox" && !selectedThreadId ? (
            <div className="messages-empty">
              <div className="text-muted">{t("selectMessage")}</div>
            </div>
          ) : viewMode === "sent" && !selectedSentMsgId ? (
            <div className="messages-empty">
              <div className="text-muted">{t("selectMessage")}</div>
            </div>
          ) : viewMode === "inbox" && selectedThreadId ? (
            /* ── Inbox thread view ── */
            <>
              <div className="card-header">
                <div>
                  <div className="card-title">{threadMessages[0]?.subject || t("noSubject")}</div>
                  <div className="card-subtitle">
                    {isThreadLoading ? t("loadingThread") : t("threadMessages", { count: threadMessages.length })}
                  </div>
                </div>
              </div>
              {/* Thread message cards */}
              <div className="messages-thread-list">
                <DataState
                  isLoading={isThreadLoading}
                  isEmpty={threadMessages.length === 0}
                  loadingNode={<div className="text-muted p-4">{t("loadingThread")}</div>}
                  emptyNode={<div className="text-muted p-4">{t("noMessages")}</div>}
                >
                  {threadMessages.map((message) => {
                    const isSelf = message.sender_id === userId;
                    const isSystem = message.message_type === "system";
                    const senderLabel = isSelf
                      ? t("you")
                      : isSystem
                        ? t("systemPartner")
                        : getProfileLabel(message.sender_id ?? "");
                    return (
                      <div
                        key={message.id}
                        className={`messages-email-card ${isSelf ? "sent" : ""} ${isSystem ? "system" : ""}`}
                      >
                        <div className="messages-email-header">
                          <span className="messages-email-from">
                            {t("from")}: <strong>{senderLabel}</strong>
                          </span>
                          <span className="messages-email-date">{formatLocalDateTime(message.created_at, locale)}</span>
                        </div>
                        {message.subject ? <div className="messages-email-subject">{message.subject}</div> : null}
                        <div className="messages-email-body">
                          <AppMarkdown content={message.content} />
                        </div>
                        <div className="messages-email-footer">
                          {canReply && !isSelf && !isSystem ? (
                            <button
                              type="button"
                              className="button text-[0.78rem]"
                              onClick={() => openReplyToMessage(message)}
                            >
                              {t("reply")}
                            </button>
                          ) : null}
                          {!isSelf && message.recipient_entry_id ? (
                            <button
                              type="button"
                              className="messages-delete-button"
                              onClick={() => handleDeleteMessage(message.id)}
                              aria-label={t("deleteMessage")}
                            >
                              {t("delete")}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </DataState>
              </div>

              {/* Reply form — uses shared MarkdownEditor */}
              {canReply ? (
                <div className="messages-reply-form">
                  {!isReplyOpen ? (
                    <button
                      type="button"
                      className="button primary"
                      onClick={() => {
                        const lastReceived = [...threadMessages].reverse().find((m) => m.sender_id !== userId);
                        if (lastReceived) {
                          openReplyToMessage(lastReceived);
                        } else {
                          setIsReplyOpen(true);
                        }
                      }}
                    >
                      {t("reply")}
                    </button>
                  ) : (
                    <form onSubmit={handleSendReply}>
                      <div className="form-group mb-2">
                        <label htmlFor="replySubject" className="text-[0.8rem]">
                          {t("subject")}
                        </label>
                        <input
                          id="replySubject"
                          value={replySubject}
                          onChange={(event) => setReplySubject(event.target.value)}
                          placeholder={t("subjectPlaceholder")}
                        />
                      </div>
                      <div className="form-group mb-2">
                        <MarkdownEditor
                          id="replyContent"
                          value={replyContent}
                          onChange={setReplyContent}
                          supabase={supabase}
                          userId={userId}
                          placeholder={t("composeReply")}
                          rows={6}
                          storageBucket={MESSAGE_IMAGE_BUCKET}
                        />
                      </div>
                      <div className="flex gap-2 items-center">
                        <button className="button primary" type="submit">
                          {t("send")}
                        </button>
                        <button className="button" type="button" onClick={resetReply}>
                          {t("cancel")}
                        </button>
                        {replyStatus ? <span className="text-muted">{replyStatus}</span> : null}
                      </div>
                    </form>
                  )}
                </div>
              ) : null}
            </>
          ) : viewMode === "sent" && selectedSentMessage ? (
            /* ── Sent message detail view ── */
            <>
              <div className="card-header">
                <div>
                  <div className="card-title">{selectedSentMessage.subject || t("noSubject")}</div>
                  <div className="card-subtitle">{formatRecipientLabel(selectedSentMessage)}</div>
                </div>
              </div>
              {/* Recipient list for multi-recipient */}
              {selectedSentMessage.recipient_count > 1 ? (
                <div className="messages-broadcast-info">
                  <strong>{t("recipientList", { count: selectedSentMessage.recipient_count })}</strong>
                  <div style={{ marginTop: "6px", fontSize: "0.8rem" }}>
                    {selectedSentMessage.recipients.map((r: RecipientSummary) => r.label).join(", ")}
                  </div>
                </div>
              ) : null}
              <div className="messages-thread-list">
                <div className="messages-email-card sent">
                  <div className="messages-email-header">
                    <span className="messages-email-from">
                      {t("from")}: <strong>{t("you")}</strong>
                    </span>
                    <span className="messages-email-date">
                      {formatLocalDateTime(selectedSentMessage.created_at, locale)}
                    </span>
                  </div>
                  {selectedSentMessage.subject ? (
                    <div className="messages-email-subject">{selectedSentMessage.subject}</div>
                  ) : null}
                  <div className="messages-email-body">
                    <AppMarkdown content={selectedSentMessage.content} />
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}

export default MessagesClient;
