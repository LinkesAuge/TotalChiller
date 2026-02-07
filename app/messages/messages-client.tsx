"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";
import getIsAdminAccess from "../../lib/supabase/admin-access";
import { formatLocalDateTime } from "../../lib/date-format";
import SearchInput from "../components/ui/search-input";
import RadixSelect from "../components/ui/radix-select";

interface MessageRow {
  readonly id: string;
  readonly sender_id: string | null;
  readonly recipient_id: string;
  readonly message_type: string;
  readonly subject: string | null;
  readonly content: string;
  readonly is_read: boolean;
  readonly created_at: string;
}

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

const SYSTEM_PARTNER_ID = "__system__";

/**
 * Full messaging UI with conversation list, thread view, and compose.
 */
function MessagesClient({ userId }: { readonly userId: string }): JSX.Element {
  const supabase = createSupabaseBrowserClient();
  const locale = useLocale();
  const t = useTranslations("messagesPage");
  const [messages, setMessages] = useState<readonly MessageRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [replyContent, setReplyContent] = useState<string>("");
  const [replyStatus, setReplyStatus] = useState<string>("");
  const [isComposeOpen, setIsComposeOpen] = useState<boolean>(false);
  const [composeRecipient, setComposeRecipient] = useState<string>("");
  const [composeSubject, setComposeSubject] = useState<string>("");
  const [composeContent, setComposeContent] = useState<string>("");
  const [composeStatus, setComposeStatus] = useState<string>("");
  const [isBroadcastOpen, setIsBroadcastOpen] = useState<boolean>(false);
  const [broadcastClanId, setBroadcastClanId] = useState<string>("");
  const [broadcastSubject, setBroadcastSubject] = useState<string>("");
  const [broadcastContent, setBroadcastContent] = useState<string>("");
  const [broadcastStatus, setBroadcastStatus] = useState<string>("");
  const [clans, setClans] = useState<readonly ClanOption[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [allUsers, setAllUsers] = useState<readonly { id: string; label: string }[]>([]);

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
    async function loadAdminAndClans(): Promise<void> {
      const adminStatus = await getIsAdminAccess({ supabase });
      setIsAdmin(adminStatus);
      if (adminStatus) {
        const { data: clanData } = await supabase
          .from("clans")
          .select("id,name")
          .eq("is_unassigned", false)
          .order("name");
        setClans((clanData ?? []) as readonly ClanOption[]);
      }
    }
    void loadAdminAndClans();
  }, [supabase]);

  useEffect(() => {
    async function loadUsers(): Promise<void> {
      const { data } = await supabase
        .from("profiles")
        .select("id,email,display_name,username")
        .neq("id", userId)
        .order("email")
        .limit(100);
      setAllUsers(
        (data ?? []).map((profile) => ({
          id: profile.id as string,
          label: (profile.display_name as string | null) ?? (profile.username as string | null) ?? (profile.email as string),
        })),
      );
    }
    void loadUsers();
  }, [supabase, userId]);

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
      const unreadCount = sorted.filter(
        (message) => message.recipient_id === userId && !message.is_read,
      ).length;
      summaries.push({
        partnerId,
        partnerLabel: getPartnerLabel(partnerId),
        lastMessage: sorted[0],
        unreadCount,
        messageType: sorted[0].message_type,
      });
    }
    summaries.sort((a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime());
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

  async function handleSelectConversation(partnerId: string): Promise<void> {
    setSelectedPartnerId(partnerId);
    setReplyContent("");
    setReplyStatus("");
    const unreadIds = messages
      .filter(
        (message) =>
          message.recipient_id === userId &&
          !message.is_read &&
          (partnerId === SYSTEM_PARTNER_ID
            ? message.message_type === "system"
            : message.sender_id === partnerId),
      )
      .map((message) => message.id);
    for (const messageId of unreadIds) {
      await fetch(`/api/messages/${messageId}`, { method: "PATCH" });
    }
    if (unreadIds.length > 0) {
      setMessages((current) =>
        current.map((message) =>
          unreadIds.includes(message.id) ? { ...message, is_read: true } : message,
        ),
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
    if (!composeRecipient || !composeContent.trim()) {
      setComposeStatus(t("recipientRequired"));
      return;
    }
    setComposeStatus(t("sending"));
    const response = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient_id: composeRecipient,
        subject: composeSubject.trim() || null,
        content: composeContent.trim(),
      }),
    });
    if (!response.ok) {
      const result = await response.json();
      setComposeStatus(result.error ?? t("failedToSend"));
      return;
    }
    setComposeStatus("");
    setComposeRecipient("");
    setComposeSubject("");
    setComposeContent("");
    setIsComposeOpen(false);
    await loadMessages();
    setSelectedPartnerId(composeRecipient);
  }

  async function handleBroadcast(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!broadcastClanId || !broadcastContent.trim()) {
      setBroadcastStatus(t("clanAndMessageRequired"));
      return;
    }
    setBroadcastStatus(t("sendingBroadcast"));
    const response = await fetch("/api/messages/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clan_id: broadcastClanId,
        subject: broadcastSubject.trim() || null,
        content: broadcastContent.trim(),
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      setBroadcastStatus(result.error ?? t("failedToSendBroadcast"));
      return;
    }
    setBroadcastStatus(t("broadcastSent", { count: result.data?.recipients ?? 0 }));
    setBroadcastContent("");
    setBroadcastSubject("");
    setBroadcastClanId("");
    setIsBroadcastOpen(false);
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

  const selectedConversation = filteredConversations.find(
    (conv) => conv.partnerId === selectedPartnerId,
  );

  return (
    <div className="grid">
      <div className="messages-layout">
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
            <SearchInput id="messageSearch" label="" value={search} onChange={setSearch} placeholder={t("searchPlaceholder")} />
            <div className="tabs" style={{ fontSize: "0.8rem" }}>
              {(["all", "private", "system", "broadcast"] as const).map((tab) => (
                <button
                  key={tab}
                  className={`tab ${typeFilter === tab ? "active" : ""}`}
                  type="button"
                  onClick={() => setTypeFilter(tab)}
                >
                  {tab === "all" ? t("all") : tab === "private" ? t("private") : tab === "system" ? t("system") : t("broadcast")}
                </button>
              ))}
            </div>
          </div>
          <div className="messages-conversation-list">
            {isLoading ? (
              <div className="list-item"><span className="text-muted">{t("loadingMessages")}</span></div>
            ) : filteredConversations.length === 0 ? (
              <div className="list-item"><span className="text-muted">{t("noMessages")}</span></div>
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
                      {conv.unreadCount > 0 ? (
                        <span className="badge">{conv.unreadCount}</span>
                      ) : null}
                      {getMessageTypeLabel(conv.messageType) ? (
                        <span className="badge" style={{ fontSize: "0.7rem" }}>{getMessageTypeLabel(conv.messageType)}</span>
                      ) : null}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>
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
                  <div className="card-subtitle">{selectedThread.length} {t("messagesCount")}</div>
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
                      {message.subject ? (
                        <div className="messages-bubble-subject">{message.subject}</div>
                      ) : null}
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
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button className="button" type="button" onClick={() => { setIsComposeOpen(!isComposeOpen); setIsBroadcastOpen(false); }}>
          {isComposeOpen ? t("cancel") : t("newMessage")}
        </button>
        {isAdmin ? (
          <button className="button primary" type="button" onClick={() => { setIsBroadcastOpen(!isBroadcastOpen); setIsComposeOpen(false); }}>
            {isBroadcastOpen ? t("cancel") : t("broadcast")}
          </button>
        ) : null}
      </div>
      {isComposeOpen ? (
        <section className="card" style={{ gridColumn: "1 / -1" }}>
          <div className="card-header">
            <div>
              <div className="card-title">{t("newMessage")}</div>
              <div className="card-subtitle">{t("newMessageSubtitle")}</div>
            </div>
          </div>
          <form onSubmit={handleCompose}>
            <div className="form-group">
              <label htmlFor="composeRecipient">{t("to")}</label>
              <RadixSelect
                id="composeRecipient"
                ariaLabel={t("to")}
                value={composeRecipient}
                onValueChange={(v) => setComposeRecipient(v)}
                enableSearch
                options={[
                  { value: "", label: t("selectUser") },
                  ...allUsers.map((user) => ({ value: user.id, label: user.label })),
                ]}
              />
            </div>
            <div className="form-group">
              <label htmlFor="composeSubject">{t("subjectOptional")}</label>
              <input
                id="composeSubject"
                value={composeSubject}
                onChange={(event) => setComposeSubject(event.target.value)}
                placeholder={t("subjectPlaceholder")}
              />
            </div>
            <div className="form-group">
              <label htmlFor="composeContent">{t("message")}</label>
              <textarea
                id="composeContent"
                value={composeContent}
                onChange={(event) => setComposeContent(event.target.value)}
                placeholder={t("messagePlaceholder")}
                rows={4}
                required
              />
            </div>
            <div className="list inline">
              <button className="button primary" type="submit">{t("send")}</button>
            </div>
            {composeStatus ? <p className="text-muted">{composeStatus}</p> : null}
          </form>
        </section>
      ) : null}
      {isBroadcastOpen ? (
        <section className="card" style={{ gridColumn: "1 / -1" }}>
          <div className="card-header">
            <div>
              <div className="card-title">{t("broadcast")}</div>
              <div className="card-subtitle">{t("broadcastSubtitle")}</div>
            </div>
          </div>
          <form onSubmit={handleBroadcast}>
            <div className="form-group">
              <label htmlFor="broadcastClan">{t("clan")}</label>
              <RadixSelect
                id="broadcastClan"
                ariaLabel={t("clan")}
                value={broadcastClanId}
                onValueChange={(v) => setBroadcastClanId(v)}
                options={[
                  { value: "", label: t("selectClan") },
                  ...clans.map((clan) => ({ value: clan.id, label: clan.name })),
                ]}
              />
            </div>
            <div className="form-group">
              <label htmlFor="broadcastSubject">{t("subjectOptional")}</label>
              <input
                id="broadcastSubject"
                value={broadcastSubject}
                onChange={(event) => setBroadcastSubject(event.target.value)}
                placeholder={t("subjectPlaceholder")}
              />
            </div>
            <div className="form-group">
              <label htmlFor="broadcastContent">Message</label>
              <textarea
                id="broadcastContent"
                value={broadcastContent}
                onChange={(event) => setBroadcastContent(event.target.value)}
                placeholder="Write your broadcast..."
                rows={4}
                required
              />
            </div>
            <div className="list inline">
              <button className="button primary" type="submit">Send Broadcast</button>
            </div>
            {broadcastStatus ? <p className="text-muted">{broadcastStatus}</p> : null}
          </form>
        </section>
      ) : null}
    </div>
  );
}

export default MessagesClient;
