"use client";

import { useTranslations } from "next-intl";
import { useMessages } from "./use-messages";
import { MessagesCompose } from "./messages-compose";
import { MessagesInbox } from "./messages-inbox";
import { MessagesThread } from "./messages-thread";

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

      <div className="messages-layout">
        <MessagesInbox api={api} />
        <MessagesThread userId={userId} api={api} />
      </div>
    </div>
  );
}

export default MessagesClient;
