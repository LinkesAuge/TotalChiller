"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useSupabase } from "../hooks/use-supabase";
import MarkdownEditor from "../components/markdown-editor";
import DataState from "../components/data-state";
import GameButton from "../components/ui/game-button";
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
 * Thread / message detail panel: chat-style timeline for inbox threads,
 * or single-message detail for sent view.
 */
export function MessagesThread({ userId, api }: MessagesThreadProps): JSX.Element {
  const supabase = useSupabase();
  const locale = useLocale();
  const t = useTranslations("messagesPage");
  const threadEndRef = useRef<HTMLDivElement>(null);
  const prevMsgCountRef = useRef(0);
  const {
    viewMode,
    selectedThreadId,
    selectedSentMsgId,
    threadMessages,
    isThreadLoading,
    selectedSentMessage,
    canReply,
    isReplyOpen,
    replyContent,
    setReplyContent,
    replyStatus,
    openReplyToMessage,
    handleSendReply,
    resetReply,
    handleDeleteMessage,
    getProfileLabel,
    formatRecipientLabel,
    clearSelection,
    threadMeta,
  } = api;

  const isBroadcastReply = threadMeta?.thread_targeting != null;

  useEffect(() => {
    const count = threadMessages.length;
    if (count > 0 && !isThreadLoading && count >= prevMsgCountRef.current) {
      threadEndRef.current?.scrollIntoView({ behavior: prevMsgCountRef.current === 0 ? "instant" : "smooth" });
    }
    prevMsgCountRef.current = count;
  }, [threadMessages, isThreadLoading]);

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
        <button type="button" className="messages-back-btn" onClick={clearSelection}>
          <Image src="/assets/game/icons/icons_arrow_back.png" alt="" width={16} height={16} />
          {t("backToInbox")}
        </button>
        <div className="card-header">
          <div>
            <div className="card-title">{threadMessages[0]?.subject || t("noSubject")}</div>
            <div className="card-subtitle">
              {isThreadLoading ? t("loadingThread") : t("threadMessages", { count: threadMessages.length })}
            </div>
          </div>
        </div>
        <div className="messages-chat-timeline">
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
                  className={`messages-chat-row ${isSelf ? "sent" : "received"} ${isSystem ? "system" : ""}`}
                >
                  <div className="messages-chat-bubble">
                    <div className="messages-chat-meta">
                      <span className="messages-chat-sender">{senderLabel}</span>
                      <span className="messages-chat-time">{formatLocalDateTime(message.created_at, locale)}</span>
                    </div>
                    <div className="messages-chat-content">
                      <AppMarkdown content={message.content} />
                    </div>
                    {!isSelf ? (
                      <button
                        type="button"
                        className="messages-chat-delete"
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
            <div ref={threadEndRef} />
          </DataState>
        </div>

        {canReply ? (
          <div className="messages-reply-form">
            {!isReplyOpen ? (
              <GameButton variant="ornate1" fontSize="0.6rem" type="button" onClick={openReplyToMessage}>
                {isBroadcastReply ? t("replyAll") : t("reply")}
              </GameButton>
            ) : (
              <form onSubmit={handleSendReply}>
                <div className="form-group mb-2">
                  <MarkdownEditor
                    id="replyContent"
                    value={replyContent}
                    onChange={setReplyContent}
                    supabase={supabase}
                    userId={userId}
                    placeholder={t("composeReply")}
                    rows={3}
                    minHeight={80}
                    storageBucket={MESSAGE_IMAGES_BUCKET}
                  />
                </div>
                <div className="flex gap-2 items-center">
                  <GameButton variant="green" fontSize="0.6rem" type="submit">
                    {t("send")}
                  </GameButton>
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
        <button type="button" className="messages-back-btn" onClick={clearSelection}>
          <Image src="/assets/game/icons/icons_arrow_back.png" alt="" width={16} height={16} />
          {t("backToInbox")}
        </button>
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
        <div className="messages-chat-timeline">
          <div className="messages-chat-row sent">
            <div className="messages-chat-bubble">
              <div className="messages-chat-meta">
                <span className="messages-chat-sender">{t("you")}</span>
                <span className="messages-chat-time">
                  {formatLocalDateTime(selectedSentMessage.created_at, locale)}
                </span>
              </div>
              <div className="messages-chat-content">
                <AppMarkdown content={selectedSentMessage.content} />
              </div>
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
