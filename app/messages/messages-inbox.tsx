"use client";

import { useMemo, type ReactElement } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import SearchInput from "../components/ui/search-input";
import ConfirmModal from "../components/confirm-modal";
import DataState from "../components/data-state";
import { formatLocalDateTime } from "@/lib/date-format";
import type { ArchivedItem, InboxThread, NotificationRow, SentMessage } from "@/lib/types/domain";
import type { UseMessagesResult } from "./use-messages";

/* ── Inline icons (matches project convention) ── */

function TrashIcon(): ReactElement {
  return <Image src="/assets/game/icons/icons_paper_cross_1.png" alt="" width={14} height={14} />;
}

function ArchiveIcon(): ReactElement {
  return <Image src="/assets/game/icons/icons_bag_1.png" alt="" width={14} height={14} />;
}

function UnarchiveIcon(): ReactElement {
  return <Image src="/assets/game/icons/icons_envelope_1.png" alt="" width={14} height={14} />;
}

/** i18n key lookup for notification type badges. */
const NOTIF_TYPE_KEYS: Readonly<Record<string, string>> = {
  message: "notifTypeMessage",
  news: "notifTypeNews",
  event: "notifTypeEvent",
  approval: "notifTypeApproval",
};

export interface MessagesInboxProps {
  readonly api: UseMessagesResult;
}

/**
 * Inbox list panel: tabs (inbox/sent/archive/notifications), filters, and message list.
 * Supports per-item and multi-select batch delete/archive with confirmation.
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
    archivedItems,
    isArchiveLoading,
    selectedThreadId,
    selectedSentMsgId,
    totalInboxUnread,
    handleViewModeChange,
    handleSelectInboxThread,
    handleSelectSentMessage,
    handleSelectArchivedItem,
    getProfileLabel,
    formatRecipientLabel,
    getMessageTypeLabel,
    deleteConfirm,
    setDeleteConfirm,
    confirmDelete,
    isDeleting,
    checkedIds,
    toggleChecked,
    toggleAllChecked,
    clearChecked,
    requestBatchDelete,
    requestBatchArchive,
    handleArchive,
    handleUnarchive,
    notificationItems,
    isNotificationsLoading,
    handleDeleteNotification,
    handleDeleteAllNotifications,
    handleMarkNotificationRead,
  } = api;

  const notifUnreadCount = useMemo(() => notificationItems.filter((n) => !n.is_read).length, [notificationItems]);

  const currentItemCount =
    viewMode === "inbox"
      ? inboxThreads.length
      : viewMode === "sent"
        ? sentMessages.length
        : viewMode === "archive"
          ? archivedItems.length
          : notificationItems.length;
  const allChecked = currentItemCount > 0 && checkedIds.size === currentItemCount;
  const someChecked = checkedIds.size > 0;

  function getConfirmMessage(): string {
    if (!deleteConfirm) return "";
    const totalCount = deleteConfirm.ids.length + (deleteConfirm.extraIds?.length ?? 0);
    if (totalCount > 1) {
      /* Mixed or batch: use the thread batch message (generic enough for both) */
      return t("deleteThreadBatchConfirm", { count: totalCount });
    }
    if (deleteConfirm.type === "sent") return t("deleteSentConfirm");
    return t("deleteThreadConfirm");
  }

  function getConfirmTitle(): string {
    if (!deleteConfirm) return "";
    const totalCount = deleteConfirm.ids.length + (deleteConfirm.extraIds?.length ?? 0);
    if (totalCount > 1) {
      return t("deleteThreadBatchTitle", { count: totalCount });
    }
    if (deleteConfirm.type === "sent") return t("deleteSentTitle");
    return t("deleteThreadTitle");
  }

  return (
    <section className="card messages-list-panel">
      {/* ── Tabs: Inbox | Sent | Archive ── */}
      <div className="messages-view-tabs">
        <button
          className={`messages-view-tab ${viewMode === "inbox" ? "active" : ""}`}
          type="button"
          onClick={() => handleViewModeChange("inbox")}
        >
          {t("inbox")}
          {totalInboxUnread > 0 ? <span className="badge messages-tab-badge">{totalInboxUnread}</span> : null}
        </button>
        <button
          className={`messages-view-tab ${viewMode === "sent" ? "active" : ""}`}
          type="button"
          onClick={() => handleViewModeChange("sent")}
        >
          {t("sent")}
        </button>
        <button
          className={`messages-view-tab ${viewMode === "archive" ? "active" : ""}`}
          type="button"
          onClick={() => handleViewModeChange("archive")}
        >
          {t("archive")}
        </button>
        <button
          className={`messages-view-tab ${viewMode === "notifications" ? "active" : ""}`}
          type="button"
          onClick={() => handleViewModeChange("notifications")}
        >
          {t("notifications")}
          {notifUnreadCount > 0 ? <span className="badge messages-tab-badge">{notifUnreadCount}</span> : null}
        </button>
      </div>

      {/* ── Filters (inbox/sent only) ── */}
      {viewMode === "inbox" || viewMode === "sent" ? (
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
      ) : null}

      {/* ── Batch action bar ── */}
      {someChecked && viewMode !== "notifications" ? (
        <div className="messages-batch-bar">
          <label className="messages-batch-select-all">
            <input type="checkbox" checked={allChecked} onChange={toggleAllChecked} className="messages-checkbox" />
            <span className="text-[0.8rem]">{t("selectAll")}</span>
          </label>
          <span className="text-muted text-[0.78rem]">{t("selectedCount", { count: checkedIds.size })}</span>
          <button type="button" className="messages-batch-delete-btn" onClick={requestBatchDelete}>
            <TrashIcon />
            {t("deleteSelected")}
          </button>
          {viewMode !== "archive" ? (
            <button type="button" className="messages-batch-archive-btn" onClick={requestBatchArchive}>
              <ArchiveIcon />
              {t("archiveSelected")}
            </button>
          ) : (
            <button type="button" className="messages-batch-archive-btn" onClick={requestBatchArchive}>
              <UnarchiveIcon />
              {t("unarchiveSelected")}
            </button>
          )}
          <button type="button" className="messages-batch-cancel-btn" onClick={clearChecked}>
            {t("cancel")}
          </button>
        </div>
      ) : null}

      {/* ── Inbox list ── */}
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
              const isChecked = checkedIds.has(thread.thread_id);
              const senderLabel = msg.sender_id
                ? getProfileLabel(msg.sender_id)
                : msg.message_type === "system"
                  ? t("systemPartner")
                  : t("unknownPartner");
              return (
                <div
                  key={thread.thread_id}
                  className={`messages-conversation-item ${selectedThreadId === thread.thread_id ? "active" : ""} ${thread.unread_count > 0 ? "unread" : ""} ${isChecked ? "checked" : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectInboxThread(thread.thread_id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSelectInboxThread(thread.thread_id);
                    }
                  }}
                >
                  <div className="messages-conversation-subject-row">
                    <span className="messages-conversation-leading">
                      <input
                        type="checkbox"
                        className="messages-checkbox"
                        checked={isChecked}
                        aria-label={t("selectMessage")}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleChecked(thread.thread_id)}
                      />
                      <strong className="messages-conversation-subject">{msg.subject || t("noSubject")}</strong>
                    </span>
                    <span className="text-muted" style={{ fontSize: "0.72rem", flexShrink: 0 }}>
                      {formatLocalDateTime(msg.created_at, locale)}
                    </span>
                  </div>
                  <div className="messages-conversation-sender-row">
                    <span className="text-muted" style={{ fontSize: "0.82rem" }}>
                      {t("from")}: {senderLabel}
                    </span>
                    <span className="messages-meta">
                      <span className="messages-conversation-actions">
                        <button
                          type="button"
                          className="messages-list-action-btn archive"
                          aria-label={t("archiveThread")}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleArchive("thread", [thread.thread_id]);
                          }}
                        >
                          <ArchiveIcon />
                        </button>
                        <button
                          type="button"
                          className="messages-list-action-btn delete"
                          aria-label={t("deleteThread")}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm({ type: "thread", ids: [thread.thread_id] });
                          }}
                        >
                          <TrashIcon />
                        </button>
                      </span>
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
                </div>
              );
            })}
          </DataState>
        </div>
      ) : viewMode === "sent" ? (
        /* ── Sent list ── */
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
            {sentMessages.map((msg: SentMessage) => {
              const isChecked = checkedIds.has(msg.id);
              return (
                <div
                  key={msg.id}
                  className={`messages-conversation-item ${selectedSentMsgId === msg.id ? "active" : ""} ${isChecked ? "checked" : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectSentMessage(msg.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSelectSentMessage(msg.id);
                    }
                  }}
                >
                  <div className="messages-conversation-subject-row">
                    <span className="messages-conversation-leading">
                      <input
                        type="checkbox"
                        className="messages-checkbox"
                        checked={isChecked}
                        aria-label={t("selectMessage")}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleChecked(msg.id)}
                      />
                      <strong className="messages-conversation-subject">{msg.subject || t("noSubject")}</strong>
                    </span>
                    <span className="text-muted" style={{ fontSize: "0.72rem", flexShrink: 0 }}>
                      {formatLocalDateTime(msg.created_at, locale)}
                    </span>
                  </div>
                  <div className="messages-conversation-sender-row">
                    <span className="text-muted" style={{ fontSize: "0.82rem" }}>
                      {formatRecipientLabel(msg)}
                    </span>
                    <span className="messages-meta">
                      <span className="messages-conversation-actions">
                        <button
                          type="button"
                          className="messages-list-action-btn archive"
                          aria-label={t("archiveSentMessage")}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleArchive("sent", [msg.id]);
                          }}
                        >
                          <ArchiveIcon />
                        </button>
                        <button
                          type="button"
                          className="messages-list-action-btn delete"
                          aria-label={t("deleteSentMessage")}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm({ type: "sent", ids: [msg.id] });
                          }}
                        >
                          <TrashIcon />
                        </button>
                      </span>
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
                </div>
              );
            })}
          </DataState>
        </div>
      ) : viewMode === "archive" ? (
        /* ── Archive list ── */
        <div className="messages-conversation-list">
          <DataState
            isLoading={isArchiveLoading}
            isEmpty={archivedItems.length === 0}
            loadingNode={
              <div className="list-item">
                <span className="text-muted">{t("loadingMessages")}</span>
              </div>
            }
            emptyNode={
              <div className="list-item">
                <span className="text-muted">{t("noArchivedMessages")}</span>
              </div>
            }
          >
            {archivedItems.map((item: ArchivedItem) => {
              const isChecked = checkedIds.has(item.id);
              const isSelected =
                (item.source === "inbox" && selectedThreadId === item.id) ||
                (item.source === "sent" && selectedSentMsgId === item.id);
              const label =
                item.source === "inbox"
                  ? item.sender_id
                    ? `${t("from")}: ${getProfileLabel(item.sender_id)}`
                    : `${t("from")}: ${item.message_type === "system" ? t("systemPartner") : t("unknownPartner")}`
                  : item.recipients.length > 0
                    ? `${t("to")}: ${item.recipients.map((r) => r.label).join(", ")}`
                    : t("unknownPartner");
              return (
                <div
                  key={`${item.source}-${item.id}`}
                  className={`messages-conversation-item ${isSelected ? "active" : ""} ${isChecked ? "checked" : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectArchivedItem(item)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSelectArchivedItem(item);
                    }
                  }}
                >
                  <div className="messages-conversation-subject-row">
                    <span className="messages-conversation-leading">
                      <input
                        type="checkbox"
                        className="messages-checkbox"
                        checked={isChecked}
                        aria-label={t("selectMessage")}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleChecked(item.id)}
                      />
                      <span className={`messages-source-badge ${item.source}`}>
                        {item.source === "inbox" ? t("inbox") : t("sent")}
                      </span>
                      <strong className="messages-conversation-subject">{item.subject || t("noSubject")}</strong>
                    </span>
                    <span className="text-muted" style={{ fontSize: "0.72rem", flexShrink: 0 }}>
                      {formatLocalDateTime(item.created_at, locale)}
                    </span>
                  </div>
                  <div className="messages-conversation-sender-row">
                    <span className="text-muted" style={{ fontSize: "0.82rem" }}>
                      {label}
                    </span>
                    <span className="messages-meta">
                      <span className="messages-conversation-actions">
                        <button
                          type="button"
                          className="messages-list-action-btn unarchive"
                          aria-label={t("unarchive")}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleUnarchive(item.source === "inbox" ? "thread" : "sent", [item.id]);
                          }}
                        >
                          <UnarchiveIcon />
                        </button>
                        <button
                          type="button"
                          className="messages-list-action-btn delete"
                          aria-label={t("deleteMessage")}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm({
                              type: item.source === "inbox" ? "thread" : "sent",
                              ids: [item.id],
                            });
                          }}
                        >
                          <TrashIcon />
                        </button>
                      </span>
                      {item.message_count > 1 ? (
                        <span className="badge" style={{ fontSize: "0.7rem" }}>
                          {item.message_count}
                        </span>
                      ) : null}
                      {getMessageTypeLabel(item.message_type) ? (
                        <span className="badge" style={{ fontSize: "0.7rem" }}>
                          {getMessageTypeLabel(item.message_type)}
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <div className="messages-conversation-snippet">
                    {item.content.length > 80 ? `${item.content.slice(0, 80)}...` : item.content}
                  </div>
                </div>
              );
            })}
          </DataState>
        </div>
      ) : (
        /* ── Notifications list ── */
        <div className="messages-conversation-list">
          {notificationItems.length > 0 ? (
            <div className="messages-batch-bar" style={{ justifyContent: "flex-end" }}>
              <button
                type="button"
                className="messages-batch-delete-btn"
                onClick={() => void handleDeleteAllNotifications()}
              >
                <TrashIcon />
                {t("deleteAllNotifications")}
              </button>
            </div>
          ) : null}
          <DataState
            isLoading={isNotificationsLoading}
            isEmpty={notificationItems.length === 0}
            loadingNode={
              <div className="list-item">
                <span className="text-muted">{t("loadingMessages")}</span>
              </div>
            }
            emptyNode={
              <div className="list-item">
                <span className="text-muted">{t("noNotifications")}</span>
              </div>
            }
          >
            {notificationItems.map((notification: NotificationRow) => (
              <div
                key={notification.id}
                className={`messages-conversation-item ${notification.is_read ? "" : "unread"}`}
                role="button"
                tabIndex={0}
                onClick={() => void handleMarkNotificationRead(notification.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    void handleMarkNotificationRead(notification.id);
                  }
                }}
              >
                <div className="messages-conversation-subject-row">
                  <span className="messages-conversation-leading">
                    <span className="badge" style={{ fontSize: "0.7rem" }}>
                      {t(NOTIF_TYPE_KEYS[notification.type] ?? "notifTypeMessage")}
                    </span>
                    <strong className="messages-conversation-subject">{notification.title}</strong>
                  </span>
                  <span className="messages-conversation-actions">
                    <button
                      type="button"
                      className="messages-list-action-btn delete"
                      aria-label={t("deleteMessage")}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDeleteNotification(notification.id);
                      }}
                    >
                      <TrashIcon />
                    </button>
                    <span className="text-muted" style={{ fontSize: "0.72rem", flexShrink: 0 }}>
                      {formatLocalDateTime(notification.created_at, locale)}
                    </span>
                  </span>
                </div>
                {notification.body ? <div className="messages-conversation-snippet">{notification.body}</div> : null}
              </div>
            ))}
          </DataState>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirm !== null}
        title={getConfirmTitle()}
        message={getConfirmMessage()}
        variant="danger"
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteConfirm(null)}
        isConfirmDisabled={isDeleting}
      />
    </section>
  );
}
