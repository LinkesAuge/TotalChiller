"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { formatLocalDateTime } from "../../lib/date-format";
import SearchInput from "../components/ui/search-input";
import RadixSelect from "../components/ui/radix-select";
import AppMarkdownToolbar, { handleImagePaste, handleImageDrop } from "@/lib/markdown/app-markdown-toolbar";

import type { MessageRow, RecipientResult } from "@/lib/types/domain";

const AppMarkdown = dynamic(() => import("@/lib/markdown/app-markdown"), {
  loading: () => <div className="skeleton h-16 rounded" />,
});

interface ProfileMap {
  readonly [userId: string]: {
    readonly email: string;
    readonly username: string | null;
    readonly display_name: string | null;
  };
}

type ViewMode = "inbox" | "sent";

interface ConversationSummary {
  readonly partnerId: string;
  readonly partnerLabel: string;
  readonly lastMessage: MessageRow;
  readonly unreadCount: number;
  readonly messageType: string;
  readonly isBroadcastGroup: boolean;
  readonly recipientCount: number;
}

interface ClanOption {
  readonly id: string;
  readonly name: string;
}

type RecipientSearchResult = RecipientResult;

interface SelectedRecipient {
  readonly id: string;
  readonly label: string;
}

type ComposeMode = "direct" | "clan" | "global";

const SYSTEM_PARTNER_ID = "__system__";
const MESSAGE_IMAGE_BUCKET = "message-images";
const REPLY_SUBJECT_PREFIX = "Re: ";

/**
 * Email-style messaging UI with conversation list, thread view, and compose.
 * Supports markdown formatting, image uploads, recipient search,
 * multi-recipient sends, and clan/global broadcasts for privileged roles.
 */
interface MessagesClientProps {
  readonly userId: string;
  readonly initialRecipientId?: string;
}

function MessagesClient({ userId, initialRecipientId }: MessagesClientProps): JSX.Element {
  const supabase = createSupabaseBrowserClient();
  const locale = useLocale();
  const t = useTranslations("messagesPage");

  /* Message state */
  const [messages, setMessages] = useState<readonly MessageRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>("inbox");

  /* Compose state */
  const [isComposeOpen, setIsComposeOpen] = useState<boolean>(false);
  const [composeMode, setComposeMode] = useState<ComposeMode>("direct");
  const [composeRecipients, setComposeRecipients] = useState<readonly SelectedRecipient[]>([]);
  const [composeClanId, setComposeClanId] = useState<string>("");
  const [composeSubject, setComposeSubject] = useState<string>("");
  const [composeContent, setComposeContent] = useState<string>("");
  const [composeStatus, setComposeStatus] = useState<string>("");
  const [isComposePreview, setIsComposePreview] = useState<boolean>(false);
  const [isComposeUploading, setIsComposeUploading] = useState<boolean>(false);
  const composeTextareaRef = useRef<HTMLTextAreaElement>(null);

  /* Reply state */
  const [isReplyOpen, setIsReplyOpen] = useState<boolean>(false);
  const [replySubject, setReplySubject] = useState<string>("");
  const [replyContent, setReplyContent] = useState<string>("");
  const [replyStatus, setReplyStatus] = useState<string>("");
  const [isReplyPreview, setIsReplyPreview] = useState<boolean>(false);
  const [isReplyUploading, setIsReplyUploading] = useState<boolean>(false);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

  /* Recipient search state */
  const [recipientSearch, setRecipientSearch] = useState<string>("");
  const [recipientResults, setRecipientResults] = useState<readonly RecipientSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState<boolean>(false);
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Role / permission state */
  const { isContentManager: isContentMgr } = useUserRole(supabase);
  const [clans, setClans] = useState<readonly ClanOption[]>([]);

  /* ── Data loading ── */

  const loadMessages = useCallback(async (): Promise<void> => {
    const params = typeFilter !== "all" ? `?type=${typeFilter}` : "";
    const response = await fetch(`/api/messages${params}`);
    if (response.ok) {
      const result = await response.json();
      setMessages(result.data ?? []);
      setProfiles(result.profiles ?? {});
    }
    setIsLoading(false);
  }, [typeFilter]);

  useEffect(() => {
    setIsLoading(true);
    void loadMessages();
  }, [loadMessages]);

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

  /* ── Pre-fill compose from ?to= param ── */

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
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    const query = recipientSearch.trim();
    if (query.length < 2) {
      setRecipientResults([]);
      setIsSearchDropdownOpen(false);
      return;
    }
    setIsSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/messages/search-recipients?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const result = await response.json();
          const results = (result.data ?? []) as RecipientSearchResult[];
          const selectedIds = new Set(composeRecipients.map((r) => r.id));
          setRecipientResults(results.filter((r) => !selectedIds.has(r.id)));
          setIsSearchDropdownOpen(true);
        }
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
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

  /* ── Helpers ── */

  function getPartnerLabel(partnerId: string): string {
    if (partnerId === SYSTEM_PARTNER_ID) return t("systemPartner");
    const profile = profiles[partnerId];
    if (!profile) return t("unknownPartner");
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
    setIsComposePreview(false);
  }

  function insertAtComposeCursor(markdown: string): void {
    const textarea = composeTextareaRef.current;
    if (!textarea) {
      setComposeContent((prev) => prev + markdown);
      return;
    }
    const start = textarea.selectionStart;
    setComposeContent((prev) => prev.substring(0, start) + markdown + prev.substring(start));
  }

  function insertAtReplyCursor(markdown: string): void {
    const textarea = replyTextareaRef.current;
    if (!textarea) {
      setReplyContent((prev) => prev + markdown);
      return;
    }
    const start = textarea.selectionStart;
    setReplyContent((prev) => prev.substring(0, start) + markdown + prev.substring(start));
  }

  /* ── Conversations ── */

  const conversations = useMemo((): readonly ConversationSummary[] => {
    const grouped = new Map<string, MessageRow[]>();
    if (viewMode === "inbox") {
      for (const message of messages) {
        if (message.recipient_id !== userId) continue;
        const partnerId =
          message.message_type === "system" ? SYSTEM_PARTNER_ID : (message.sender_id ?? SYSTEM_PARTNER_ID);
        const existing = grouped.get(partnerId) ?? [];
        existing.push(message);
        grouped.set(partnerId, existing);
      }
    } else {
      for (const message of messages) {
        if (message.sender_id !== userId) continue;
        const groupKey = message.broadcast_group_id ?? message.recipient_id;
        const existing = grouped.get(groupKey) ?? [];
        existing.push(message);
        grouped.set(groupKey, existing);
      }
    }
    const summaries: ConversationSummary[] = [];
    for (const [groupKey, groupMessages] of grouped.entries()) {
      const sorted = [...groupMessages].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      const lastMsg = sorted[0];
      if (!lastMsg) continue;
      const isBroadcastGroup = viewMode === "sent" && lastMsg.broadcast_group_id !== null;
      let partnerId: string;
      let partnerLabel: string;
      if (viewMode === "inbox") {
        partnerId = groupKey;
        partnerLabel = getPartnerLabel(groupKey);
      } else if (isBroadcastGroup) {
        partnerId = groupKey;
        partnerLabel =
          lastMsg.message_type === "broadcast"
            ? t("broadcastRecipients", { count: lastMsg.recipient_count })
            : t("sentToRecipients", { count: lastMsg.recipient_count });
      } else {
        partnerId = lastMsg.recipient_id;
        partnerLabel = getPartnerLabel(lastMsg.recipient_id);
      }
      const unreadCount = viewMode === "inbox" ? sorted.filter((message) => !message.is_read).length : 0;
      summaries.push({
        partnerId,
        partnerLabel,
        lastMessage: lastMsg,
        unreadCount,
        messageType: lastMsg.message_type,
        isBroadcastGroup,
        recipientCount: lastMsg.recipient_count,
      });
    }
    summaries.sort(
      (a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime(),
    );
    return summaries;
  }, [messages, profiles, userId, viewMode]);

  const filteredConversations = useMemo((): readonly ConversationSummary[] => {
    if (!search.trim()) return conversations;
    const normalizedSearch = search.trim().toLowerCase();
    return conversations.filter(
      (conv) =>
        conv.partnerLabel.toLowerCase().includes(normalizedSearch) ||
        conv.lastMessage.content.toLowerCase().includes(normalizedSearch) ||
        (conv.lastMessage.subject ?? "").toLowerCase().includes(normalizedSearch),
    );
  }, [conversations, search]);

  const selectedThread = useMemo((): readonly MessageRow[] => {
    if (!selectedPartnerId) return [];
    if (viewMode === "inbox") {
      if (selectedPartnerId === SYSTEM_PARTNER_ID) {
        return messages
          .filter((message) => message.message_type === "system" && message.recipient_id === userId)
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      }
      return messages
        .filter(
          (message) =>
            (message.sender_id === selectedPartnerId && message.recipient_id === userId) ||
            (message.sender_id === userId && message.recipient_id === selectedPartnerId),
        )
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
    const conv = filteredConversations.find((c) => c.partnerId === selectedPartnerId);
    if (conv?.isBroadcastGroup) {
      return messages
        .filter((message) => message.sender_id === userId && message.broadcast_group_id === selectedPartnerId)
        .slice(0, 1);
    }
    return messages
      .filter(
        (message) =>
          (message.sender_id === userId && message.recipient_id === selectedPartnerId) ||
          (message.sender_id === selectedPartnerId && message.recipient_id === userId),
      )
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [messages, selectedPartnerId, userId, viewMode, filteredConversations]);

  /* ── Handlers ── */

  function handleViewModeChange(mode: ViewMode): void {
    setViewMode(mode);
    setSelectedPartnerId("");
    setReplyContent("");
    setReplySubject("");
    setReplyStatus("");
    setIsReplyOpen(false);
  }

  async function handleSelectConversation(partnerId: string): Promise<void> {
    setSelectedPartnerId(partnerId);
    setReplyContent("");
    setReplySubject("");
    setReplyStatus("");
    setIsReplyOpen(false);
    setIsReplyPreview(false);
    if (viewMode !== "inbox") return;
    const unreadIds = messages
      .filter(
        (message) =>
          message.recipient_id === userId &&
          !message.is_read &&
          (partnerId === SYSTEM_PARTNER_ID ? message.message_type === "system" : message.sender_id === partnerId),
      )
      .map((message) => message.id);
    for (const messageId of unreadIds) {
      await fetch(`/api/messages/${messageId}`, { method: "PATCH" });
    }
    if (unreadIds.length > 0) {
      setMessages((current) =>
        current.map((message) => (unreadIds.includes(message.id) ? { ...message, is_read: true } : message)),
      );
    }
  }

  function openReplyToMessage(message: MessageRow): void {
    const originalSubject = message.subject ?? "";
    const prefilled = originalSubject.startsWith(REPLY_SUBJECT_PREFIX)
      ? originalSubject
      : originalSubject
        ? `${REPLY_SUBJECT_PREFIX}${originalSubject}`
        : "";
    setReplySubject(prefilled);
    const quoted = message.content
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
    setReplyContent(`\n\n${quoted}\n`);
    setIsReplyOpen(true);
    setIsReplyPreview(false);
  }

  async function handleSendReply(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!replyContent.trim() || !selectedPartnerId || selectedPartnerId === SYSTEM_PARTNER_ID) return;
    setReplyStatus(t("sending"));
    const response = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient_id: selectedPartnerId,
        subject: replySubject.trim() || null,
        content: replyContent.trim(),
      }),
    });
    if (!response.ok) {
      const result = await response.json();
      setReplyStatus(result.error ?? t("failedToSend"));
      return;
    }
    setReplyContent("");
    setReplySubject("");
    setReplyStatus("");
    setIsReplyOpen(false);
    setIsReplyPreview(false);
    await loadMessages();
  }

  async function handleCompose(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!composeContent.trim()) {
      setComposeStatus(t("recipientRequired"));
      return;
    }
    if (composeMode === "direct") {
      if (composeRecipients.length === 0) {
        setComposeStatus(t("recipientRequired"));
        return;
      }
      setComposeStatus(t("sending"));
      const recipientIds = composeRecipients.map((r) => r.id);
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient_ids: recipientIds,
          subject: composeSubject.trim() || null,
          content: composeContent.trim(),
        }),
      });
      if (!response.ok) {
        const result = await response.json();
        setComposeStatus(result.error ?? t("failedToSend"));
        return;
      }
      const result = await response.json();
      if (recipientIds.length === 1) {
        setComposeStatus(t("messageSent"));
        setViewMode("sent");
        setSelectedPartnerId(recipientIds[0] ?? "");
      } else {
        setComposeStatus(t("messagesSent", { count: result.count ?? recipientIds.length }));
        setViewMode("sent");
      }
    } else {
      const clanId = composeMode === "global" ? "all" : composeClanId;
      if (composeMode === "clan" && !clanId) {
        setComposeStatus(t("clanAndMessageRequired"));
        return;
      }
      setComposeStatus(t("sendingBroadcast"));
      const response = await fetch("/api/messages/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clan_id: clanId,
          subject: composeSubject.trim() || null,
          content: composeContent.trim(),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setComposeStatus(result.error ?? t("failedToSendBroadcast"));
        return;
      }
      setComposeStatus(t("broadcastSent", { count: result.data?.recipients ?? 0 }));
      setViewMode("sent");
    }
    resetCompose();
    setIsComposeOpen(false);
    await loadMessages();
  }

  async function handleDeleteMessage(messageId: string): Promise<void> {
    await fetch(`/api/messages/${messageId}`, { method: "DELETE" });
    setMessages((current) => current.filter((message) => message.id !== messageId));
  }

  function getMessageTypeLabel(messageType: string): string {
    if (messageType === "broadcast" || messageType === "system") return t("broadcast");
    if (messageType === "clan") return t("clan");
    return "";
  }

  const selectedConversation = filteredConversations.find((conv) => conv.partnerId === selectedPartnerId);

  const totalInboxUnread = useMemo(
    () => messages.filter((m) => m.recipient_id === userId && !m.is_read).length,
    [messages, userId],
  );

  const composeModeOptions = useMemo(() => {
    const options = [{ value: "direct", label: t("directMessage") }];
    if (isContentMgr) {
      options.push({ value: "clan", label: t("clanBroadcast") }, { value: "global", label: t("globalBroadcast") });
    }
    return options;
  }, [isContentMgr, t]);

  const canReply =
    selectedPartnerId !== SYSTEM_PARTNER_ID && !selectedConversation?.isBroadcastGroup && selectedPartnerId !== "";

  /* ── Render ── */

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

            {/* Message content with Write/Preview tabs + toolbar */}
            <div className="form-group">
              <label htmlFor="composeContent">{t("message")}</label>
              <div className="forum-editor-tabs">
                <button
                  type="button"
                  className={`forum-editor-tab${!isComposePreview ? " active" : ""}`}
                  onClick={() => setIsComposePreview(false)}
                >
                  {t("writeTab")}
                </button>
                <button
                  type="button"
                  className={`forum-editor-tab${isComposePreview ? " active" : ""}`}
                  onClick={() => setIsComposePreview(true)}
                >
                  {t("previewTab")}
                </button>
              </div>
              {isComposePreview ? (
                <div className="forum-editor-preview">
                  {composeContent.trim() ? (
                    <AppMarkdown content={composeContent} />
                  ) : (
                    <p className="text-muted" style={{ fontStyle: "italic" }}>
                      {t("previewEmpty")}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <AppMarkdownToolbar
                    textareaRef={composeTextareaRef}
                    value={composeContent}
                    onChange={setComposeContent}
                    supabase={supabase}
                    userId={userId}
                    storageBucket={MESSAGE_IMAGE_BUCKET}
                  />
                  <textarea
                    id="composeContent"
                    ref={composeTextareaRef}
                    value={composeContent}
                    onChange={(event) => setComposeContent(event.target.value)}
                    placeholder={composeMode === "direct" ? t("messagePlaceholder") : t("broadcastPlaceholder")}
                    rows={8}
                    required
                    onPaste={(e) =>
                      handleImagePaste(
                        e,
                        supabase,
                        userId,
                        insertAtComposeCursor,
                        setIsComposeUploading,
                        MESSAGE_IMAGE_BUCKET,
                      )
                    }
                    onDrop={(e) =>
                      handleImageDrop(
                        e,
                        supabase,
                        userId,
                        insertAtComposeCursor,
                        setIsComposeUploading,
                        MESSAGE_IMAGE_BUCKET,
                      )
                    }
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  />
                  {isComposeUploading ? <div className="text-muted text-[0.8rem]">{t("uploadingImage")}</div> : null}
                </>
              )}
              <p className="text-muted text-[0.75rem] mt-1">{t("markdownHint")}</p>
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

      <div className="messages-layout">
        {/* ── Conversation list ── */}
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
          {/* Conversation list — email-style: subject first */}
          <div className="messages-conversation-list">
            {isLoading ? (
              <div className="list-item">
                <span className="text-muted">{t("loadingMessages")}</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="list-item">
                <span className="text-muted">{t("noMessages")}</span>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.partnerId}
                  type="button"
                  className={`messages-conversation-item ${selectedPartnerId === conv.partnerId ? "active" : ""} ${conv.unreadCount > 0 ? "unread" : ""}`}
                  onClick={() => handleSelectConversation(conv.partnerId)}
                >
                  {/* Row 1: Subject + date */}
                  <div className="messages-conversation-subject-row">
                    <strong className="messages-conversation-subject">
                      {conv.lastMessage.subject || t("noSubject")}
                    </strong>
                    <span className="text-muted" style={{ fontSize: "0.72rem", flexShrink: 0 }}>
                      {formatLocalDateTime(conv.lastMessage.created_at, locale)}
                    </span>
                  </div>
                  {/* Row 2: Sender/recipient + badges */}
                  <div className="messages-conversation-sender-row">
                    <span className="text-muted" style={{ fontSize: "0.82rem" }}>
                      {viewMode === "inbox" ? t("from") : t("to")}: {conv.partnerLabel}
                    </span>
                    <span className="messages-meta">
                      {conv.unreadCount > 0 ? <span className="badge">{conv.unreadCount}</span> : null}
                      {getMessageTypeLabel(conv.messageType) ? (
                        <span className="badge" style={{ fontSize: "0.7rem" }}>
                          {getMessageTypeLabel(conv.messageType)}
                        </span>
                      ) : null}
                    </span>
                  </div>
                  {/* Row 3: Content preview */}
                  <div className="messages-conversation-snippet">
                    {conv.lastMessage.content.length > 80
                      ? `${conv.lastMessage.content.slice(0, 80)}...`
                      : conv.lastMessage.content}
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        {/* ── Thread view (email-style cards) ── */}
        <section className="card messages-thread-panel">
          {!selectedPartnerId ? (
            <div className="messages-empty">
              <div className="text-muted">{t("selectConversation")}</div>
            </div>
          ) : (
            <>
              <div className="card-header">
                <div>
                  <div className="card-title">{selectedConversation?.partnerLabel ?? t("conversation")}</div>
                  <div className="card-subtitle">
                    {selectedConversation?.isBroadcastGroup
                      ? t("broadcastSummary")
                      : t("messagesCount", { count: selectedThread.length })}
                  </div>
                </div>
              </div>
              {selectedConversation?.isBroadcastGroup ? (
                <div className="messages-broadcast-info">
                  {selectedConversation.messageType === "broadcast"
                    ? t("broadcastInfoBanner", { count: selectedConversation.recipientCount })
                    : t("multiRecipientInfoBanner", { count: selectedConversation.recipientCount })}
                </div>
              ) : null}
              {/* Email-style message cards */}
              <div className="messages-thread-list">
                {selectedThread.map((message) => {
                  const isSelf = message.sender_id === userId;
                  const isSystem = message.message_type === "system";
                  const senderLabel = isSelf
                    ? t("you")
                    : isSystem
                      ? t("systemPartner")
                      : getPartnerLabel(message.sender_id ?? SYSTEM_PARTNER_ID);
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
                        {canReply && !isSelf ? (
                          <button
                            type="button"
                            className="button text-[0.78rem]"
                            onClick={() => openReplyToMessage(message)}
                          >
                            {t("reply")}
                          </button>
                        ) : null}
                        {message.recipient_id === userId ? (
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
              </div>

              {/* ── Reply form (expandable) ── */}
              {canReply ? (
                <div className="messages-reply-form">
                  {!isReplyOpen ? (
                    <button
                      type="button"
                      className="button primary"
                      onClick={() => {
                        const lastReceived = [...selectedThread].reverse().find((m) => m.sender_id !== userId);
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
                        <div className="forum-editor-tabs">
                          <button
                            type="button"
                            className={`forum-editor-tab${!isReplyPreview ? " active" : ""}`}
                            onClick={() => setIsReplyPreview(false)}
                          >
                            {t("writeTab")}
                          </button>
                          <button
                            type="button"
                            className={`forum-editor-tab${isReplyPreview ? " active" : ""}`}
                            onClick={() => setIsReplyPreview(true)}
                          >
                            {t("previewTab")}
                          </button>
                        </div>
                        {isReplyPreview ? (
                          <div className="forum-editor-preview" style={{ minHeight: "100px" }}>
                            {replyContent.trim() ? (
                              <AppMarkdown content={replyContent} />
                            ) : (
                              <p className="text-muted" style={{ fontStyle: "italic" }}>
                                {t("previewEmpty")}
                              </p>
                            )}
                          </div>
                        ) : (
                          <>
                            <AppMarkdownToolbar
                              textareaRef={replyTextareaRef}
                              value={replyContent}
                              onChange={setReplyContent}
                              supabase={supabase}
                              userId={userId}
                              storageBucket={MESSAGE_IMAGE_BUCKET}
                            />
                            <textarea
                              ref={replyTextareaRef}
                              value={replyContent}
                              onChange={(event) => setReplyContent(event.target.value)}
                              placeholder={t("composeReply")}
                              rows={6}
                              required
                              onPaste={(e) =>
                                handleImagePaste(
                                  e,
                                  supabase,
                                  userId,
                                  insertAtReplyCursor,
                                  setIsReplyUploading,
                                  MESSAGE_IMAGE_BUCKET,
                                )
                              }
                              onDrop={(e) =>
                                handleImageDrop(
                                  e,
                                  supabase,
                                  userId,
                                  insertAtReplyCursor,
                                  setIsReplyUploading,
                                  MESSAGE_IMAGE_BUCKET,
                                )
                              }
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                            />
                            {isReplyUploading ? (
                              <div className="text-muted text-[0.8rem]">{t("uploadingImage")}</div>
                            ) : null}
                          </>
                        )}
                        <p className="text-muted text-[0.75rem] mt-1">{t("markdownHint")}</p>
                      </div>
                      <div className="flex gap-2 items-center">
                        <button className="button primary" type="submit">
                          {t("send")}
                        </button>
                        <button
                          className="button"
                          type="button"
                          onClick={() => {
                            setIsReplyOpen(false);
                            setReplyContent("");
                            setReplySubject("");
                            setIsReplyPreview(false);
                          }}
                        >
                          {t("cancel")}
                        </button>
                        {replyStatus ? <span className="text-muted">{replyStatus}</span> : null}
                      </div>
                    </form>
                  )}
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default MessagesClient;
