"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { formatLocalDateTime } from "../../lib/date-format";
import SearchInput from "../components/ui/search-input";
import RadixSelect from "../components/ui/radix-select";

import type { MessageRow, RecipientResult } from "@/lib/types/domain";

interface ProfileMap {
  readonly [userId: string]: {
    readonly email: string;
    readonly username: string | null;
    readonly display_name: string | null;
  };
}

interface ConversationSummary {
  readonly partnerId: string;
  readonly partnerLabel: string;
  readonly lastMessage: MessageRow;
  readonly unreadCount: number;
  readonly messageType: string;
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

/**
 * Full messaging UI with conversation list, thread view, and compose.
 * Supports recipient search by username/game account, multi-recipient,
 * and clan/global broadcasts for privileged roles.
 */
function MessagesClient({ userId }: { readonly userId: string }): JSX.Element {
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
  const [replyContent, setReplyContent] = useState<string>("");
  const [replyStatus, setReplyStatus] = useState<string>("");

  /* Compose state */
  const [isComposeOpen, setIsComposeOpen] = useState<boolean>(false);
  const [composeMode, setComposeMode] = useState<ComposeMode>("direct");
  const [composeRecipients, setComposeRecipients] = useState<readonly SelectedRecipient[]>([]);
  const [composeClanId, setComposeClanId] = useState<string>("");
  const [composeSubject, setComposeSubject] = useState<string>("");
  const [composeContent, setComposeContent] = useState<string>("");
  const [composeStatus, setComposeStatus] = useState<string>("");

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
          /* Exclude already selected recipients */
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

  /* Close search dropdown on outside click */
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
    if (partnerId === SYSTEM_PARTNER_ID) {
      return t("systemPartner");
    }
    const profile = profiles[partnerId];
    if (!profile) {
      return t("unknownPartner");
    }
    return profile.display_name ?? profile.username ?? profile.email;
  }

  function addRecipient(recipient: SelectedRecipient): void {
    if (!composeRecipients.some((r) => r.id === recipient.id)) {
      if (isContentMgr) {
        setComposeRecipients((prev) => [...prev, recipient]);
      } else {
        /* Non-privileged users can only select one recipient */
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

  /* ── Conversations ── */

  const conversations = useMemo((): readonly ConversationSummary[] => {
    const grouped = new Map<string, MessageRow[]>();
    for (const message of messages) {
      let partnerId: string;
      if (message.message_type === "system") {
        partnerId = SYSTEM_PARTNER_ID;
      } else if (message.sender_id === userId) {
        partnerId = message.recipient_id;
      } else {
        partnerId = message.sender_id ?? SYSTEM_PARTNER_ID;
      }
      const existing = grouped.get(partnerId) ?? [];
      existing.push(message);
      grouped.set(partnerId, existing);
    }
    const summaries: ConversationSummary[] = [];
    for (const [partnerId, partnerMessages] of grouped.entries()) {
      const sorted = [...partnerMessages].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      const unreadCount = sorted.filter((message) => message.recipient_id === userId && !message.is_read).length;
      summaries.push({
        partnerId,
        partnerLabel: getPartnerLabel(partnerId),
        lastMessage: sorted[0],
        unreadCount,
        messageType: sorted[0].message_type,
      });
    }
    summaries.sort(
      (a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime(),
    );
    return summaries;
  }, [messages, profiles, userId]);

  const filteredConversations = useMemo((): readonly ConversationSummary[] => {
    if (!search.trim()) {
      return conversations;
    }
    const normalizedSearch = search.trim().toLowerCase();
    return conversations.filter(
      (conv) =>
        conv.partnerLabel.toLowerCase().includes(normalizedSearch) ||
        conv.lastMessage.content.toLowerCase().includes(normalizedSearch) ||
        (conv.lastMessage.subject ?? "").toLowerCase().includes(normalizedSearch),
    );
  }, [conversations, search]);

  const selectedThread = useMemo((): readonly MessageRow[] => {
    if (!selectedPartnerId) {
      return [];
    }
    return messages
      .filter((message) => {
        if (selectedPartnerId === SYSTEM_PARTNER_ID) {
          return message.message_type === "system";
        }
        return (
          (message.sender_id === selectedPartnerId && message.recipient_id === userId) ||
          (message.sender_id === userId && message.recipient_id === selectedPartnerId)
        );
      })
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [messages, selectedPartnerId, userId]);

  /* ── Handlers ── */

  async function handleSelectConversation(partnerId: string): Promise<void> {
    setSelectedPartnerId(partnerId);
    setReplyContent("");
    setReplyStatus("");
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

  async function handleSendReply(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!replyContent.trim() || !selectedPartnerId || selectedPartnerId === SYSTEM_PARTNER_ID) {
      return;
    }
    setReplyStatus(t("sending"));
    const response = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient_id: selectedPartnerId, content: replyContent.trim() }),
    });
    if (!response.ok) {
      const result = await response.json();
      setReplyStatus(result.error ?? t("failedToSend"));
      return;
    }
    setReplyContent("");
    setReplyStatus("");
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
        setSelectedPartnerId(recipientIds[0]);
      } else {
        setComposeStatus(t("messagesSent", { count: result.count ?? recipientIds.length }));
      }
    } else {
      /* Clan or global broadcast */
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
    if (messageType === "broadcast") {
      return t("broadcast");
    }
    if (messageType === "system") {
      return t("systemPartner");
    }
    return "";
  }

  const selectedConversation = filteredConversations.find((conv) => conv.partnerId === selectedPartnerId);

  /* ── Compose mode options ── */
  const composeModeOptions = useMemo(() => {
    const options = [{ value: "direct", label: t("directMessage") }];
    if (isContentMgr) {
      options.push({ value: "clan", label: t("clanBroadcast") }, { value: "global", label: t("globalBroadcast") });
    }
    return options;
  }, [isContentMgr, t]);

  /* ── Render ── */

  return (
    <div className="grid">
      {/* Compose toggle */}
      <div className="col-span-full flex gap-3 flex-wrap">
        <button
          className="button"
          type="button"
          onClick={() => {
            if (isComposeOpen) {
              resetCompose();
            }
            setIsComposeOpen(!isComposeOpen);
          }}
        >
          {isComposeOpen ? t("cancel") : t("newMessage")}
        </button>
      </div>

      {/* Compose form */}
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
            {/* Mode selector (only for content managers) */}
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
                {/* Selected recipient chips */}
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
                {/* Search input with dropdown */}
                <div ref={searchWrapperRef} className="relative">
                  <input
                    id="recipientSearch"
                    value={recipientSearch}
                    onChange={(event) => setRecipientSearch(event.target.value)}
                    onFocus={() => {
                      if (recipientResults.length > 0) {
                        setIsSearchDropdownOpen(true);
                      }
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
                      style={{
                        top: "100%",
                        maxHeight: "240px",
                        overflowY: "auto",
                      }}
                    >
                      {recipientResults.map((result) => (
                        <button
                          key={result.id}
                          type="button"
                          className="combobox-option py-2 px-3 text-left cursor-pointer block w-full"
                          style={{
                            border: "none",
                            background: "none",
                          }}
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
              <label htmlFor="composeSubject">{t("subjectOptional")}</label>
              <input
                id="composeSubject"
                value={composeSubject}
                onChange={(event) => setComposeSubject(event.target.value)}
                placeholder={t("subjectPlaceholder")}
              />
            </div>

            {/* Message content */}
            <div className="form-group">
              <label htmlFor="composeContent">{t("message")}</label>
              <textarea
                id="composeContent"
                value={composeContent}
                onChange={(event) => setComposeContent(event.target.value)}
                placeholder={composeMode === "direct" ? t("messagePlaceholder") : t("broadcastPlaceholder")}
                rows={4}
                required
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

      <div className="messages-layout">
        {/* Conversation list */}
        <section className="card messages-list-panel">
          <div className="card-header">
            <div>
              <div className="card-title">{t("inbox")}</div>
              <div className="card-subtitle">
                {conversations.reduce((sum, conv) => sum + conv.unreadCount, 0)} {t("unread")}
              </div>
            </div>
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
              {(["all", "private", "system", "broadcast"] as const).map((tab) => (
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
                      : tab === "system"
                        ? t("system")
                        : t("broadcast")}
                </button>
              ))}
            </div>
          </div>
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
                  <div className="messages-conversation-header">
                    <strong>{conv.partnerLabel}</strong>
                    <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                      {formatLocalDateTime(conv.lastMessage.created_at, locale)}
                    </span>
                  </div>
                  <div className="messages-conversation-preview">
                    <span className="text-muted">
                      {conv.lastMessage.subject
                        ? conv.lastMessage.subject
                        : conv.lastMessage.content.length > 60
                          ? `${conv.lastMessage.content.slice(0, 60)}...`
                          : conv.lastMessage.content}
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
                </button>
              ))
            )}
          </div>
        </section>

        {/* Thread view */}
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
                  <div className="card-subtitle">{t("messagesCount", { count: selectedThread.length })}</div>
                </div>
              </div>
              <div className="messages-thread-list">
                {selectedThread.map((message) => {
                  const isSelf = message.sender_id === userId;
                  const isSystem = message.message_type === "system";
                  return (
                    <div
                      key={message.id}
                      className={`messages-bubble ${isSelf ? "self" : ""} ${isSystem ? "system" : ""}`}
                    >
                      {message.subject ? <div className="messages-bubble-subject">{message.subject}</div> : null}
                      <div className="messages-bubble-content">{message.content}</div>
                      <div className="messages-bubble-meta">
                        <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                          {formatLocalDateTime(message.created_at, locale)}
                        </span>
                        {message.recipient_id === userId ? (
                          <button
                            type="button"
                            className="messages-delete-button"
                            onClick={() => handleDeleteMessage(message.id)}
                            aria-label={t("deleteMessage")}
                          >
                            &times;
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
              {selectedPartnerId !== SYSTEM_PARTNER_ID ? (
                <form className="messages-reply-bar" onSubmit={handleSendReply}>
                  <input
                    className="messages-reply-input"
                    value={replyContent}
                    onChange={(event) => setReplyContent(event.target.value)}
                    placeholder={t("typeMessage")}
                    required
                  />
                  <button className="button primary" type="submit">
                    {t("send")}
                  </button>
                  {replyStatus ? <span className="text-muted">{replyStatus}</span> : null}
                </form>
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default MessagesClient;
