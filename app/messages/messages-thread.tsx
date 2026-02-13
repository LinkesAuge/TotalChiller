"use client";

import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { useSupabase } from "../hooks/use-supabase";
import MarkdownEditor from "../components/markdown-editor";
import DataState from "../components/data-state";
import { formatLocalDateTime } from "@/lib/date-format";
import { MESSAGE_IMAGES_BUCKET } from "@/lib/constants";
import type { ThreadMessage } from "@/lib/types/domain";
import type { UseMessagesResult } from "./use-messages";

const AppMarkdown = dynamic(() => import("@/lib/markdown/app-markdown"), {
  loading: () => <div className="skeleton h-16 rounded" />,
});

export interface MessagesThreadProps {
  readonly userId: string;
  readonly api: UseMessagesResult;
}

/**
 * Thread / message detail panel: inbox thread view with reply, or sent message detail.
 * Renders message cards, reply form, and delete actions.
 */
export function MessagesThread({ userId, api }: MessagesThreadProps): JSX.Element {
  const supabase = useSupabase();
  const locale = useLocale();
  const t = useTranslations("messagesPage");
  const {
    viewMode,
    selectedThreadId,
    selectedSentMsgId,
    threadMessages,
    isThreadLoading,
    selectedSentMessage,
    canReply,
    isReplyOpen,
    replySubject,
    setReplySubject,
    replyContent,
    setReplyContent,
    replyStatus,
    openReplyToMessage,
    handleSendReply,
    resetReply,
    handleDeleteMessage,
    getProfileLabel,
    formatRecipientLabel,
    setIsReplyOpen,
  } = api;

  const showThread = (viewMode === "inbox" || viewMode === "archive") && selectedThreadId;
  const showSent = (viewMode === "sent" || viewMode === "archive") && selectedSentMsgId && !selectedThreadId;

  if (!showThread && !showSent) {
    return (
      <section className="card messages-thread-panel">
        <div className="messages-empty">
          <div className="text-muted">{t("selectMessage")}</div>
        </div>
      </section>
    );
  }

  if (showThread) {
    return (
      <section className="card messages-thread-panel">
        <div className="card-header">
          <div>
            <div className="card-title">{threadMessages[0]?.subject || t("noSubject")}</div>
            <div className="card-subtitle">
              {isThreadLoading ? t("loadingThread") : t("threadMessages", { count: threadMessages.length })}
            </div>
          </div>
        </div>
        <div className="messages-thread-list">
          <DataState
            isLoading={isThreadLoading}
            isEmpty={threadMessages.length === 0}
            loadingNode={<div className="text-muted p-4">{t("loadingThread")}</div>}
            emptyNode={<div className="text-muted p-4">{t("noMessages")}</div>}
          >
            {threadMessages.map((message: ThreadMessage) => {
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
                    storageBucket={MESSAGE_IMAGES_BUCKET}
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
      </section>
    );
  }

  if (showSent && selectedSentMessage) {
    return (
      <section className="card messages-thread-panel">
        <div className="card-header">
          <div>
            <div className="card-title">{selectedSentMessage.subject || t("noSubject")}</div>
            <div className="card-subtitle">{formatRecipientLabel(selectedSentMessage)}</div>
          </div>
        </div>
        {selectedSentMessage.recipient_count > 1 ? (
          <div className="messages-broadcast-info">
            <strong>{t("recipientList", { count: selectedSentMessage.recipient_count })}</strong>
            <div style={{ marginTop: "6px", fontSize: "0.8rem" }}>
              {selectedSentMessage.recipients.map((r) => r.label).join(", ")}
            </div>
          </div>
        ) : null}
        <div className="messages-thread-list">
          <div className="messages-email-card sent">
            <div className="messages-email-header">
              <span className="messages-email-from">
                {t("from")}: <strong>{t("you")}</strong>
              </span>
              <span className="messages-email-date">{formatLocalDateTime(selectedSentMessage.created_at, locale)}</span>
            </div>
            {selectedSentMessage.subject ? (
              <div className="messages-email-subject">{selectedSentMessage.subject}</div>
            ) : null}
            <div className="messages-email-body">
              <AppMarkdown content={selectedSentMessage.content} />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="card messages-thread-panel">
      <div className="messages-empty">
        <div className="text-muted">{t("selectMessage")}</div>
      </div>
    </section>
  );
}
