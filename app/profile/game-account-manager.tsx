"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslations, useLocale } from "next-intl";
import IconButton from "../components/ui/icon-button";
import GameButton from "../components/ui/game-button";
import type { GameAccountView } from "@/lib/types/domain";
import { TIMEZONE } from "@/lib/timezone";

interface GameAccountManagerProps {
  readonly initialAccounts: readonly GameAccountView[];
  readonly initialDefaultId: string | null;
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  approved: "success",
  pending: "warning",
};

/**
 * Displays the user's game accounts with status, default selection, and a form to request new ones.
 */
function GameAccountManager({ initialAccounts, initialDefaultId }: GameAccountManagerProps): JSX.Element {
  const t = useTranslations("gameAccountManager");
  const locale = useLocale();
  const [accounts, setAccounts] = useState<readonly GameAccountView[]>(initialAccounts);
  const [defaultId, setDefaultId] = useState<string | null>(initialDefaultId);
  const [newGameUsername, setNewGameUsername] = useState<string>("");
  const [requestStatus, setRequestStatus] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [defaultStatus, setDefaultStatus] = useState<string>("");
  const defaultStatusTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => {
      if (defaultStatusTimerRef.current) clearTimeout(defaultStatusTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setAccounts(initialAccounts);
  }, [initialAccounts]);

  useEffect(() => {
    setDefaultId(initialDefaultId);
  }, [initialDefaultId]);

  async function refreshAccounts(): Promise<void> {
    const response = await fetch("/api/game-accounts");
    if (response.ok) {
      const result = await response.json();
      setAccounts(result.data ?? []);
      setDefaultId(result.default_game_account_id ?? null);
    }
  }

  async function handleSetDefault(accountId: string | null): Promise<void> {
    setDefaultStatus("");
    try {
      const response = await fetch("/api/game-accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ default_game_account_id: accountId }),
      });
      if (response.ok) {
        setDefaultId(accountId);
        setDefaultStatus(accountId ? t("defaultSet") : "");
      } else {
        setDefaultStatus(t("setDefaultFailed"));
      }
    } catch {
      setDefaultStatus(t("setDefaultFailed"));
    }
    /* Clear status after a short delay */
    if (accountId) {
      if (defaultStatusTimerRef.current) clearTimeout(defaultStatusTimerRef.current);
      defaultStatusTimerRef.current = setTimeout(() => setDefaultStatus(""), 2000);
    }
  }

  async function handleSubmitRequest(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmedUsername = newGameUsername.trim();
    if (!trimmedUsername) {
      setRequestStatus(t("usernameRequired"));
      return;
    }
    if (trimmedUsername.length < 2 || trimmedUsername.length > 64) {
      setRequestStatus(t("usernameLengthError"));
      return;
    }
    setIsSubmitting(true);
    setRequestStatus(t("submittingRequest"));
    try {
      const response = await fetch("/api/game-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game_username: trimmedUsername }),
      });
      const result = await response.json();
      if (!response.ok) {
        setRequestStatus(result.error ?? t("failedToSubmit"));
        setIsSubmitting(false);
        return;
      }
      setRequestStatus(t("requestSubmitted"));
      setNewGameUsername("");
      setIsFormOpen(false);
      await refreshAccounts();
    } catch {
      setRequestStatus(t("networkError"));
    }
    setIsSubmitting(false);
  }

  function formatStatus(status: string): string {
    if (status === "approved") {
      return t("approved");
    }
    if (status === "pending") {
      return t("pendingApproval");
    }
    return status;
  }

  const pendingCount = accounts.filter((account) => account.approval_status === "pending").length;
  const approvedCount = accounts.filter((account) => account.approval_status === "approved").length;

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <div className="card-title">{t("title")}</div>
          <div className="card-subtitle">
            {t("approvedCount", { count: approvedCount })}
            {pendingCount > 0 ? `, ${t("pendingCount", { count: pendingCount })}` : ""}
          </div>
        </div>
        <button
          className="button"
          type="button"
          onClick={() => {
            setIsFormOpen(!isFormOpen);
            setRequestStatus("");
          }}
        >
          {isFormOpen ? t("cancel") : t("addAccount")}
        </button>
      </div>
      {isFormOpen ? (
        <form onSubmit={handleSubmitRequest} className="mb-4">
          <div className="form-group">
            <label htmlFor="newGameUsername">{t("gameUsernameLabel")}</label>
            <input
              id="newGameUsername"
              value={newGameUsername}
              onChange={(event) => setNewGameUsername(event.target.value)}
              placeholder={t("gameUsernamePlaceholder")}
              minLength={2}
              maxLength={64}
              disabled={isSubmitting}
              required
            />
            <span className="text-muted text-[0.85em]">{t("gameUsernameHint")}</span>
          </div>
          <div className="list inline">
            <GameButton variant="green" fontSize="0.6rem" type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("submitting") : t("requestAccount")}
            </GameButton>
          </div>
          {requestStatus ? <p className="text-muted">{requestStatus}</p> : null}
        </form>
      ) : null}
      {requestStatus && !isFormOpen ? <p className="text-muted">{requestStatus}</p> : null}
      {defaultStatus ? <p className="text-muted">{defaultStatus}</p> : null}
      <div className="list">
        {accounts.length === 0 ? (
          <div className="list-item">
            <span>{t("noAccounts")}</span>
            <span className="badge">{t("addOneAbove")}</span>
          </div>
        ) : (
          accounts.map((account) => {
            const isDefault = account.id === defaultId;
            const isApproved = account.approval_status === "approved";
            return (
              <div className="list-item" key={account.id}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <strong>{account.game_username}</strong>
                    {isDefault ? <span className="badge success text-[0.75em]">{t("defaultAccount")}</span> : null}
                  </div>
                  <div className="text-muted text-[0.85em]">
                    {t("requested")} {new Date(account.created_at).toLocaleDateString(locale, { timeZone: TIMEZONE })}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isApproved ? (
                    isDefault ? (
                      <IconButton ariaLabel={t("removeDefault")} onClick={() => handleSetDefault(null)}>
                        <svg
                          aria-hidden="true"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      </IconButton>
                    ) : (
                      <IconButton ariaLabel={t("setAsDefault")} onClick={() => handleSetDefault(account.id)}>
                        <svg
                          aria-hidden="true"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      </IconButton>
                    )
                  ) : null}
                  <span className={`badge ${STATUS_BADGE_CLASS[account.approval_status] ?? ""} text-[0.75em]`}>
                    {formatStatus(account.approval_status)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

export default GameAccountManager;
