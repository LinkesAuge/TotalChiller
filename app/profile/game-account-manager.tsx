"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations, useLocale } from "next-intl";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";

interface GameAccountView {
  readonly id: string;
  readonly game_username: string;
  readonly approval_status: string;
  readonly created_at: string;
}

interface GameAccountManagerProps {
  readonly userId: string;
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
function GameAccountManager({ userId, initialAccounts, initialDefaultId }: GameAccountManagerProps): JSX.Element {
  const t = useTranslations("gameAccountManager");
  const locale = useLocale();
  const [accounts, setAccounts] = useState<readonly GameAccountView[]>(initialAccounts);
  const [defaultId, setDefaultId] = useState<string | null>(initialDefaultId);
  const [newGameUsername, setNewGameUsername] = useState<string>("");
  const [requestStatus, setRequestStatus] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [defaultStatus, setDefaultStatus] = useState<string>("");
  const supabase = createSupabaseBrowserClient();

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
      }
    } catch {
      /* silently ignore network errors for this action */
    }
    /* Clear status after a short delay */
    if (accountId) {
      setTimeout(() => setDefaultStatus(""), 2000);
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
            {t("approvedCount", { count: approvedCount })}{pendingCount > 0 ? `, ${t("pendingCount", { count: pendingCount })}` : ""}
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
        <form onSubmit={handleSubmitRequest} style={{ marginBottom: "1rem" }}>
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
            <span className="text-muted" style={{ fontSize: "0.85em" }}>
              {t("gameUsernameHint")}
            </span>
          </div>
          <div className="list inline">
            <button className="button primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("submitting") : t("requestAccount")}
            </button>
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
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <strong>{account.game_username}</strong>
                    {isDefault ? (
                      <span className="badge success" style={{ fontSize: "0.75em" }}>
                        {t("defaultAccount")}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-muted" style={{ fontSize: "0.85em" }}>
                    {t("requested")} {new Date(account.created_at).toLocaleDateString(locale)}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {isApproved ? (
                    isDefault ? (
                      <button
                        className="button"
                        type="button"
                        onClick={() => handleSetDefault(null)}
                        style={{ fontSize: "0.8em", padding: "0.25rem 0.5rem" }}
                      >
                        {t("removeDefault")}
                      </button>
                    ) : (
                      <button
                        className="button"
                        type="button"
                        onClick={() => handleSetDefault(account.id)}
                        style={{ fontSize: "0.8em", padding: "0.25rem 0.5rem" }}
                      >
                        {t("setAsDefault")}
                      </button>
                    )
                  ) : null}
                  <span className={`badge ${STATUS_BADGE_CLASS[account.approval_status] ?? ""}`}>
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
