"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import GameButton from "../components/ui/game-button";
import { useMessages } from "./use-messages";
import { MessagesInbox } from "./messages-inbox";
import { MessagesThread } from "./messages-thread";

const MessagesCompose = dynamic(() => import("./messages-compose").then((mod) => mod.MessagesCompose));

interface MessagesClientProps {
  readonly userId: string;
  readonly initialRecipientId?: string;
  readonly initialTab?: string;
}

/**
 * Messages page client: orchestrates compose, inbox list, and thread/detail views.
 * Delegates state and operations to useMessages, and UI to MessagesCompose,
 * MessagesInbox, and MessagesThread.
 */
function MessagesClient({ userId, initialRecipientId, initialTab }: MessagesClientProps): JSX.Element {
  const t = useTranslations("messagesPage");
  const api = useMessages({ userId, initialRecipientId, initialTab });

  const hasActiveThread = api.selectedThreadId !== "" || api.selectedSentMsgId !== "";

  return (
    <div className="grid">
      <div className="col-span-full flex gap-3 flex-wrap">
        {api.isComposeOpen ? (
          <button
            className="button"
            type="button"
            onClick={() => {
              api.resetCompose();
              api.setIsComposeOpen(false);
            }}
          >
            {t("cancel")}
          </button>
        ) : (
          <GameButton variant="ornate1" fontSize="0.62rem" onClick={() => api.setIsComposeOpen(true)}>
            {t("newMessage")}
          </GameButton>
        )}
      </div>

      {api.isComposeOpen ? <MessagesCompose userId={userId} api={api} /> : null}

      <div className={`messages-layout${hasActiveThread ? " thread-active" : ""}`}>
        <MessagesInbox api={api} />
        {hasActiveThread ? (
          <MessagesThread userId={userId} api={api} />
        ) : (
          <div className="messages-thread-panel">
            <div className="messages-empty">
              <div className="text-muted">{t("selectMessage")}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MessagesClient;
