"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useMessages } from "./use-messages";
import { MessagesInbox } from "./messages-inbox";

const MessagesCompose = dynamic(() => import("./messages-compose").then((mod) => mod.MessagesCompose));
const MessagesThread = dynamic(() => import("./messages-thread").then((mod) => mod.MessagesThread));

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
        <button
          className="button"
          type="button"
          onClick={() => {
            if (api.isComposeOpen) api.resetCompose();
            api.setIsComposeOpen(!api.isComposeOpen);
          }}
        >
          {api.isComposeOpen ? t("cancel") : t("newMessage")}
        </button>
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
