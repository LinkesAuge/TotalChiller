"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";
import getIsAdminAccess from "../../lib/supabase/admin-access";
import formatGermanDateTime from "../../lib/date-format";
import SearchInput from "../components/ui/search-input";

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
      return "System";
    }
    const profile = profiles[partnerId];
    if (!profile) {
      return "Unknown";
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
    setReplyStatus("Sending...");
    const response = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient_id: selectedPartnerId, content: replyContent.trim() }),
    });
    if (!response.ok) {
      const result = await response.json();
      setReplyStatus(result.error ?? "Failed to send.");
      return;
    }
    setReplyContent("");
    setReplyStatus("");
    await loadMessages();
  }

  async function handleCompose(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!composeRecipient || !composeContent.trim()) {
      setComposeStatus("Recipient and message are required.");
      return;
    }
    setComposeStatus("Sending...");
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
      setComposeStatus(result.error ?? "Failed to send.");
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
      setBroadcastStatus("Clan and message are required.");
      return;
    }
    setBroadcastStatus("Sending broadcast...");
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
      setBroadcastStatus(result.error ?? "Failed to send broadcast.");
      return;
    }
    setBroadcastStatus(`Broadcast sent to ${result.data?.recipients ?? 0} members.`);
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
      return "Broadcast";
    }
    if (messageType === "system") {
      return "System";
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
              <div className="card-title">Inbox</div>
              <div className="card-subtitle">
                {conversations.reduce((sum, conv) => sum + conv.unreadCount, 0)} unread
              </div>
            </div>
          </div>
          <div className="messages-filters">
            <SearchInput id="messageSearch" label="" value={search} onChange={setSearch} placeholder="Search..." />
            <div className="tabs" style={{ fontSize: "0.8rem" }}>
              {(["all", "private", "system", "broadcast"] as const).map((tab) => (
                <button
                  key={tab}
                  className={`tab ${typeFilter === tab ? "active" : ""}`}
                  type="button"
                  onClick={() => setTypeFilter(tab)}
                >
                  {tab === "all" ? "All" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="messages-conversation-list">
            {isLoading ? (
              <div className="list-item"><span className="text-muted">Loading...</span></div>
            ) : filteredConversations.length === 0 ? (
              <div className="list-item"><span className="text-muted">No messages</span></div>
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
                      {formatGermanDateTime(conv.lastMessage.created_at)}
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
              <div className="text-muted">Select a conversation to view messages</div>
            </div>
          ) : (
            <>
              <div className="card-header">
                <div>
                  <div className="card-title">{selectedConversation?.partnerLabel ?? "Conversation"}</div>
                  <div className="card-subtitle">{selectedThread.length} messages</div>
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
                          {formatGermanDateTime(message.created_at)}
                        </span>
                        {message.recipient_id === userId ? (
                          <button
                            type="button"
                            className="messages-delete-button"
                            onClick={() => handleDeleteMessage(message.id)}
                            aria-label="Delete message"
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
                    placeholder="Type a message..."
                    required
                  />
                  <button className="button primary" type="submit">
                    Send
                  </button>
                  {replyStatus ? <span className="text-muted">{replyStatus}</span> : null}
                </form>
              ) : null}
            </>
          )}
        </section>
      </div>
      <div style={{ gridColumn: "span 12", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button className="button" type="button" onClick={() => { setIsComposeOpen(!isComposeOpen); setIsBroadcastOpen(false); }}>
          {isComposeOpen ? "Cancel" : "New Message"}
        </button>
        {isAdmin ? (
          <button className="button primary" type="button" onClick={() => { setIsBroadcastOpen(!isBroadcastOpen); setIsComposeOpen(false); }}>
            {isBroadcastOpen ? "Cancel" : "Broadcast"}
          </button>
        ) : null}
      </div>
      {isComposeOpen ? (
        <section className="card" style={{ gridColumn: "span 12" }}>
          <div className="card-header">
            <div>
              <div className="card-title">New Message</div>
              <div className="card-subtitle">Send a private message</div>
            </div>
          </div>
          <form onSubmit={handleCompose}>
            <div className="form-group">
              <label htmlFor="composeRecipient">To</label>
              <select
                id="composeRecipient"
                value={composeRecipient}
                onChange={(event) => setComposeRecipient(event.target.value)}
                required
              >
                <option value="">Select a user...</option>
                {allUsers.map((user) => (
                  <option key={user.id} value={user.id}>{user.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="composeSubject">Subject (optional)</label>
              <input
                id="composeSubject"
                value={composeSubject}
                onChange={(event) => setComposeSubject(event.target.value)}
                placeholder="Subject"
              />
            </div>
            <div className="form-group">
              <label htmlFor="composeContent">Message</label>
              <textarea
                id="composeContent"
                value={composeContent}
                onChange={(event) => setComposeContent(event.target.value)}
                placeholder="Write your message..."
                rows={4}
                required
              />
            </div>
            <div className="list inline">
              <button className="button primary" type="submit">Send</button>
            </div>
            {composeStatus ? <p className="text-muted">{composeStatus}</p> : null}
          </form>
        </section>
      ) : null}
      {isBroadcastOpen ? (
        <section className="card" style={{ gridColumn: "span 12" }}>
          <div className="card-header">
            <div>
              <div className="card-title">Broadcast</div>
              <div className="card-subtitle">Send to all members of a clan</div>
            </div>
          </div>
          <form onSubmit={handleBroadcast}>
            <div className="form-group">
              <label htmlFor="broadcastClan">Clan</label>
              <select
                id="broadcastClan"
                value={broadcastClanId}
                onChange={(event) => setBroadcastClanId(event.target.value)}
                required
              >
                <option value="">Select a clan...</option>
                {clans.map((clan) => (
                  <option key={clan.id} value={clan.id}>{clan.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="broadcastSubject">Subject (optional)</label>
              <input
                id="broadcastSubject"
                value={broadcastSubject}
                onChange={(event) => setBroadcastSubject(event.target.value)}
                placeholder="Subject"
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
