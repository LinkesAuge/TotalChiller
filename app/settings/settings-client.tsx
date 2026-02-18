"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useSupabase } from "../hooks/use-supabase";
import { useUserRole } from "@/lib/hooks/use-user-role";
import LanguageSelector from "../components/language-selector";
import GameButton from "../components/ui/game-button";
import { buildFallbackUserDb } from "@/app/admin/admin-types";

import type { NotificationPrefs } from "@/lib/types/domain";

interface SettingsFormState {
  readonly email: string;
  readonly username: string;
  readonly displayName: string;
  readonly password: string;
  readonly confirmPassword: string;
  readonly emailStatus: string;
  readonly usernameStatus: string;
  readonly displayNameStatus: string;
  readonly passwordStatus: string;
}

const initialSettingsState: SettingsFormState = {
  email: "",
  username: "",
  displayName: "",
  password: "",
  confirmPassword: "",
  emailStatus: "",
  usernameStatus: "",
  displayNameStatus: "",
  passwordStatus: "",
};

function updateFormState(
  setFormState: React.Dispatch<React.SetStateAction<SettingsFormState>>,
  nextState: Partial<SettingsFormState>,
): void {
  setFormState((currentState) => ({ ...currentState, ...nextState }));
}

interface SettingsClientProps {
  readonly userId: string;
}

/**
 * Settings form with account details, password, notifications, and language.
 */
function SettingsClient({ userId }: SettingsClientProps): JSX.Element {
  const t = useTranslations("settings");
  const [formState, setFormState] = useState<SettingsFormState>(initialSettingsState);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({
    messages_enabled: true,
    news_enabled: true,
    events_enabled: true,
    system_enabled: true,
    bugs_email_enabled: false,
  });
  const [notifStatus, setNotifStatus] = useState<string>("");
  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = useSupabase();
  const { isAdmin } = useUserRole(supabase);

  useEffect(() => {
    let isMounted = true;
    async function loadUser(): Promise<void> {
      const { data } = await supabase.auth.getUser();
      if (!isMounted) return;
      const currentEmail = data.user?.email ?? "";
      updateFormState(setFormState, { email: currentEmail });
      if (userId) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("user_db,username,display_name")
          .eq("id", userId)
          .maybeSingle();
        if (!profileData && currentEmail) {
          const emailPrefix = currentEmail.split("@")[0];
          const fallbackUsername = buildFallbackUserDb(currentEmail, userId);
          const { data: createdProfile } = await supabase
            .from("profiles")
            .upsert(
              {
                id: userId,
                email: currentEmail,
                user_db: fallbackUsername,
                username: emailPrefix,
                display_name: emailPrefix,
              },
              { onConflict: "id" },
            )
            .select("user_db,username,display_name")
            .single();
          if (!isMounted) return;
          updateFormState(setFormState, {
            username: createdProfile?.username ?? "",
            displayName: createdProfile?.display_name ?? createdProfile?.username ?? "",
          });
        } else {
          updateFormState(setFormState, {
            username: profileData?.username ?? "",
            displayName: profileData?.display_name ?? profileData?.username ?? "",
          });
        }
        const notifRes = await fetch("/api/notification-settings");
        if (!isMounted) return;
        if (notifRes.ok) {
          const notifResult = await notifRes.json();
          if (notifResult.data) {
            setNotifPrefs(notifResult.data);
          }
        }
      }
    }
    void loadUser();
    return () => {
      isMounted = false;
    };
  }, [supabase, userId]);

  /* Clean up notification status timer on unmount */
  useEffect(() => {
    return () => {
      if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    };
  }, []);

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (formState.password !== formState.confirmPassword) {
      updateFormState(setFormState, { passwordStatus: t("passwordMismatch") });
      return;
    }
    if (formState.password.length < 8) {
      updateFormState(setFormState, { passwordStatus: t("passwordTooShort") });
      return;
    }
    updateFormState(setFormState, { passwordStatus: t("updatingPassword") });
    const { error } = await supabase.auth.updateUser({ password: formState.password });
    if (error) {
      updateFormState(setFormState, { passwordStatus: error.message });
      return;
    }
    updateFormState(setFormState, { passwordStatus: t("passwordUpdated") });
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!formState.email) {
      updateFormState(setFormState, { emailStatus: t("emailRequired") });
      return;
    }
    updateFormState(setFormState, { emailStatus: t("updatingEmail") });
    const redirectTo = `${window.location.origin}/auth/callback?next=/settings`;
    /* Set fallback cookie in case Supabase ignores the redirect URL */
    document.cookie = "auth_redirect_next=/settings; path=/; max-age=600; SameSite=Lax";
    const { error } = await supabase.auth.updateUser({ email: formState.email }, { emailRedirectTo: redirectTo });
    if (error) {
      updateFormState(setFormState, { emailStatus: error.message });
      return;
    }
    updateFormState(setFormState, {
      emailStatus: t("emailUpdateRequested"),
    });
  }

  async function handleUsernameSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!isAdmin) {
      updateFormState(setFormState, { usernameStatus: t("onlyAdminsCanChangeUsername") });
      return;
    }
    const rawUsername = formState.username.trim();
    const nextUsername = rawUsername.toLowerCase();
    if (nextUsername.length < 2 || nextUsername.length > 32) {
      updateFormState(setFormState, { usernameStatus: t("usernameLengthError") });
      return;
    }
    if (!nextUsername) {
      updateFormState(setFormState, { usernameStatus: t("usernameRequired") });
      return;
    }
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id")
      .ilike("user_db", nextUsername)
      .neq("id", userId)
      .maybeSingle();
    if (existingUser) {
      updateFormState(setFormState, { usernameStatus: t("usernameExists") });
      return;
    }
    updateFormState(setFormState, { usernameStatus: t("updatingUsername") });
    const { error } = await supabase
      .from("profiles")
      .upsert(
        { id: userId, email: formState.email, user_db: nextUsername, username: rawUsername },
        { onConflict: "id" },
      );
    if (error) {
      updateFormState(setFormState, { usernameStatus: error.message });
      return;
    }
    updateFormState(setFormState, {
      username: rawUsername,
      usernameStatus: t("usernameUpdated"),
    });
  }

  async function handleDisplayNameSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const nextDisplayName = formState.displayName.trim();
    updateFormState(setFormState, { displayNameStatus: t("updatingNickname") });
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: nextDisplayName || null })
      .eq("id", userId);
    if (error) {
      if (error.code === "23505") {
        updateFormState(setFormState, { displayNameStatus: t("nicknameExists") });
        return;
      }
      updateFormState(setFormState, { displayNameStatus: error.message });
      return;
    }
    updateFormState(setFormState, {
      displayName: nextDisplayName,
      displayNameStatus: t("nicknameUpdated"),
    });
  }

  async function handleToggleNotification(key: keyof NotificationPrefs): Promise<void> {
    const nextValue = !notifPrefs[key];
    setNotifPrefs((current) => ({ ...current, [key]: nextValue }));
    setNotifStatus(t("saving"));
    const response = await fetch("/api/notification-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: nextValue }),
    });
    if (!response.ok) {
      setNotifPrefs((current) => ({ ...current, [key]: !nextValue }));
      setNotifStatus(t("failedToSave"));
      return;
    }
    setNotifStatus(t("saved"));
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    notifTimerRef.current = setTimeout(() => setNotifStatus(""), 2000);
  }

  const updater = (next: Partial<SettingsFormState>) => updateFormState(setFormState, next);

  return (
    <div className="content-inner settings-layout">
      <div className="settings-grid">
        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">{t("accountDetails")}</div>
              <div className="card-subtitle">{t("emailHint")}</div>
            </div>
          </div>
          <form onSubmit={handleEmailSubmit}>
            <div className="form-group">
              <label htmlFor="email">{t("email")}</label>
              <input
                id="email"
                type="email"
                value={formState.email}
                onChange={(event) => updater({ email: event.target.value })}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="list">
              <GameButton variant="green" fontSize="0.58rem" type="submit">
                {t("updateEmail")}
              </GameButton>
            </div>
            {formState.emailStatus ? <p className="text-muted">{formState.emailStatus}</p> : null}
          </form>
        </section>
        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">{t("username")}</div>
              <div className="card-subtitle">{t("usernameHint")}</div>
            </div>
          </div>
          <form onSubmit={handleUsernameSubmit}>
            <div className="form-group">
              <label htmlFor="username">{t("username")}</label>
              <input
                id="username"
                value={formState.username}
                onChange={(event) => updater({ username: event.target.value })}
                placeholder="your_username"
                minLength={2}
                maxLength={32}
                disabled={!isAdmin}
                required
              />
            </div>
            <div className="list">
              <GameButton variant="green" fontSize="0.58rem" type="submit">
                {t("updateUsername")}
              </GameButton>
            </div>
            {!isAdmin ? <span className="badge">{t("usernameHint")}</span> : null}
            {formState.usernameStatus ? <p className="text-muted">{formState.usernameStatus}</p> : null}
          </form>
        </section>
        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">{t("nickname")}</div>
              <div className="card-subtitle">{t("nicknameHint")}</div>
            </div>
          </div>
          <form onSubmit={handleDisplayNameSubmit}>
            <div className="form-group">
              <label htmlFor="displayName">{t("nickname")}</label>
              <input
                id="displayName"
                value={formState.displayName}
                onChange={(event) => updater({ displayName: event.target.value })}
                placeholder="Nickname"
              />
            </div>
            <div className="list">
              <GameButton variant="green" fontSize="0.58rem" type="submit">
                {t("updateNickname")}
              </GameButton>
            </div>
            {formState.displayNameStatus ? <p className="text-muted">{formState.displayNameStatus}</p> : null}
          </form>
        </section>
        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">{t("password")}</div>
              <div className="card-subtitle">{t("updatePassword")}</div>
            </div>
          </div>
          <form onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <label htmlFor="password">{t("newPassword")}</label>
              <input
                id="password"
                type="password"
                value={formState.password}
                onChange={(event) => updater({ password: event.target.value })}
                placeholder="••••••••"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">{t("confirmPassword")}</label>
              <input
                id="confirmPassword"
                type="password"
                value={formState.confirmPassword}
                onChange={(event) => updater({ confirmPassword: event.target.value })}
                placeholder="••••••••"
                required
              />
            </div>
            <div className="list">
              <GameButton variant="green" fontSize="0.58rem" type="submit">
                {t("updatePassword")}
              </GameButton>
            </div>
            {formState.passwordStatus ? <p className="text-muted">{formState.passwordStatus}</p> : null}
          </form>
        </section>
        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">{t("notifications")}</div>
              <div className="card-subtitle">{t("notificationsHint")}</div>
            </div>
          </div>
          <div className="list">
            <div className="list-item">
              <span>{t("notifMessages")}</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notifPrefs.messages_enabled}
                  onChange={() => handleToggleNotification("messages_enabled")}
                  aria-label={t("notifMessages")}
                />
                <span className="toggle-slider" />
              </label>
            </div>
            <div className="list-item">
              <span>{t("notifNews")}</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notifPrefs.news_enabled}
                  onChange={() => handleToggleNotification("news_enabled")}
                  aria-label={t("notifNews")}
                />
                <span className="toggle-slider" />
              </label>
            </div>
            <div className="list-item">
              <span>{t("notifEvents")}</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notifPrefs.events_enabled}
                  onChange={() => handleToggleNotification("events_enabled")}
                  aria-label={t("notifEvents")}
                />
                <span className="toggle-slider" />
              </label>
            </div>
            <div className="list-item">
              <span>{t("notifSystem")}</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notifPrefs.system_enabled}
                  onChange={() => handleToggleNotification("system_enabled")}
                  aria-label={t("notifSystem")}
                />
                <span className="toggle-slider" />
              </label>
            </div>
            {isAdmin ? (
              <div className="list-item">
                <span>{t("notifBugsEmail")}</span>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={notifPrefs.bugs_email_enabled}
                    onChange={() => handleToggleNotification("bugs_email_enabled")}
                    aria-label={t("notifBugsEmail")}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            ) : null}
          </div>
          {notifStatus ? <p className="text-muted pt-0 px-[18px] pb-3">{notifStatus}</p> : null}
        </section>
        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">{t("language")}</div>
              <div className="card-subtitle">{t("languageHint")}</div>
            </div>
          </div>
          <div className="list">
            <div className="list-item">
              <span>{t("languageLabel")}</span>
              <LanguageSelector />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default SettingsClient;
