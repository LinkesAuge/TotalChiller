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
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  approved: "success",
  pending: "warning",
};

/**
 * Displays the user's game accounts with status and a form to request new ones.
 */
function GameAccountManager({ userId, initialAccounts }: GameAccountManagerProps): JSX.Element {
  const t = useTranslations("gameAccountManager");
  const locale = useLocale();
  const [accounts, setAccounts] = useState<readonly GameAccountView[]>(initialAccounts);
  const [newGameUsername, setNewGameUsername] = useState<string>("");
  const [requestStatus, setRequestStatus] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    setAccounts(initialAccounts);
  }, [initialAccounts]);

  async function refreshAccounts(): Promise<void> {
    const response = await fetch("/api/game-accounts");
    if (response.ok) {
      const result = await response.json();
      setAccounts(result.data ?? []);
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
      <div className="list">
        {accounts.length === 0 ? (
          <div className="list-item">
            <span>{t("noAccounts")}</span>
            <span className="badge">{t("addOneAbove")}</span>
          </div>
        ) : (
          accounts.map((account) => (
            <div className="list-item" key={account.id}>
              <div>
                <div><strong>{account.game_username}</strong></div>
                <div className="text-muted" style={{ fontSize: "0.85em" }}>
                  {t("requested")} {new Date(account.created_at).toLocaleDateString(locale)}
                </div>
              </div>
              <span className={`badge ${STATUS_BADGE_CLASS[account.approval_status] ?? ""}`}>
                {formatStatus(account.approval_status)}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default GameAccountManager;
