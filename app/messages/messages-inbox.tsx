"use client";

import { useLocale, useTranslations } from "next-intl";
import SearchInput from "../components/ui/search-input";
import DataState from "../components/data-state";
import { formatLocalDateTime } from "@/lib/date-format";
import type { InboxThread, SentMessage } from "@/lib/types/domain";
import type { UseMessagesResult } from "./use-messages";

export interface MessagesInboxProps {
  readonly api: UseMessagesResult;
}

/**
 * Inbox list panel: tabs (inbox/sent), filters, and message list.
 * Renders either inbox threads or sent messages based on view mode.
 */
export function MessagesInbox({ api }: MessagesInboxProps): JSX.Element {
  const locale = useLocale();
  const t = useTranslations("messagesPage");
  const {
    viewMode,
    typeFilter,
    setTypeFilter,
    search,
    setSearch,
    inboxThreads,
    isInboxLoading,
    sentMessages,
    isSentLoading,
    selectedThreadId,
    selectedSentMsgId,
    totalInboxUnread,
    handleViewModeChange,
    handleSelectInboxThread,
    handleSelectSentMessage,
    getProfileLabel,
    formatRecipientLabel,
    getMessageTypeLabel,
  } = api;

  return (
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
            {inboxThreads.map((thread: InboxThread) => {
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
                  <div className="messages-conversation-subject-row">
                    <strong className="messages-conversation-subject">{msg.subject || t("noSubject")}</strong>
                    <span className="text-muted" style={{ fontSize: "0.72rem", flexShrink: 0 }}>
                      {formatLocalDateTime(msg.created_at, locale)}
                    </span>
                  </div>
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
                  <div className="messages-conversation-snippet">
                    {msg.content.length > 80 ? `${msg.content.slice(0, 80)}...` : msg.content}
                  </div>
                </button>
              );
            })}
          </DataState>
        </div>
      ) : (
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
            {sentMessages.map((msg: SentMessage) => (
              <button
                key={msg.id}
                type="button"
                className={`messages-conversation-item ${selectedSentMsgId === msg.id ? "active" : ""}`}
                onClick={() => handleSelectSentMessage(msg.id)}
              >
                <div className="messages-conversation-subject-row">
                  <strong className="messages-conversation-subject">{msg.subject || t("noSubject")}</strong>
                  <span className="text-muted" style={{ fontSize: "0.72rem", flexShrink: 0 }}>
                    {formatLocalDateTime(msg.created_at, locale)}
                  </span>
                </div>
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
                <div className="messages-conversation-snippet">
                  {msg.content.length > 80 ? `${msg.content.slice(0, 80)}...` : msg.content}
                </div>
              </button>
            ))}
          </DataState>
        </div>
      )}
    </section>
  );
}
