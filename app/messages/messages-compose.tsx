"use client";

import { useTranslations } from "next-intl";
import { useSupabase } from "../hooks/use-supabase";
import RadixSelect from "../components/ui/radix-select";
import MarkdownEditor from "../components/markdown-editor";
import GameButton from "../components/ui/game-button";
import { MESSAGE_IMAGES_BUCKET } from "@/lib/constants";
import type { RecipientResult } from "@/lib/types/domain";
import type { SelectedRecipient } from "./messages-types";
import type { UseMessagesResult } from "./use-messages";

export interface MessagesComposeProps {
  readonly userId: string;
  readonly api: UseMessagesResult;
}

/**
 * Message composition form: direct, clan broadcast, or global broadcast.
 * Handles recipient search, subject, content, and submit.
 */
export function MessagesCompose({ userId, api }: MessagesComposeProps): JSX.Element {
  const supabase = useSupabase();
  const t = useTranslations("messagesPage");
  const {
    isComposeOpen,
    composeMode,
    setComposeMode,
    composeRecipients,
    composeClanId,
    setComposeClanId,
    composeSubject,
    setComposeSubject,
    composeContent,
    setComposeContent,
    composeStatus,
    composeModeOptions,
    recipientSearch,
    setRecipientSearch,
    recipientResults,
    isSearching,
    isSearchDropdownOpen,
    setIsSearchDropdownOpen,
    searchWrapperRef,
    isContentMgr,
    clans,
    addRecipient,
    removeRecipient,
    resetCompose,
    handleCompose,
  } = api;

  if (!isComposeOpen) return <></>;

  return (
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
                    setComposeMode(option.value as "direct" | "clan" | "global");
                    resetCompose();
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {composeMode === "direct" ? (
          <div className="form-group">
            <label htmlFor="recipientSearch">{t("to")}</label>
            {composeRecipients.length > 0 ? (
              <div className="recipient-chips flex flex-wrap gap-1.5 mb-2">
                {composeRecipients.map((recipient: SelectedRecipient) => (
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
            <div ref={searchWrapperRef} className="relative">
              <input
                id="recipientSearch"
                value={recipientSearch}
                onChange={(event) => setRecipientSearch(event.target.value)}
                onFocus={() => {
                  if (recipientResults.length > 0) setIsSearchDropdownOpen(true);
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
                  style={{ top: "100%", maxHeight: "240px", overflowY: "auto" }}
                >
                  {recipientResults.map((result: RecipientResult) => (
                    <button
                      key={result.id}
                      type="button"
                      className="combobox-option py-2 px-3 text-left cursor-pointer block w-full"
                      style={{ border: "none", background: "none" }}
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

        <div className="form-group">
          <label htmlFor="composeSubject">{t("subject")}</label>
          <input
            id="composeSubject"
            value={composeSubject}
            onChange={(event) => setComposeSubject(event.target.value)}
            placeholder={t("subjectPlaceholder")}
          />
        </div>

        <div className="form-group">
          <label htmlFor="composeContent">{t("message")}</label>
          <MarkdownEditor
            id="composeContent"
            value={composeContent}
            onChange={setComposeContent}
            supabase={supabase}
            userId={userId}
            placeholder={composeMode === "direct" ? t("messagePlaceholder") : t("broadcastPlaceholder")}
            rows={8}
            storageBucket={MESSAGE_IMAGES_BUCKET}
          />
        </div>

        <div className="list inline">
          <GameButton variant="green" fontSize="0.6rem" type="submit">
            {composeMode === "direct" ? t("send") : t("sendBroadcast")}
          </GameButton>
        </div>
        {composeStatus ? <p className="text-muted">{composeStatus}</p> : null}
      </form>
    </section>
  );
}
