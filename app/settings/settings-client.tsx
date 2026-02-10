"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";
import { useUserRole } from "@/lib/hooks/use-user-role";
import LanguageSelector from "../components/language-selector";

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
  });
  const [notifStatus, setNotifStatus] = useState<string>("");
  const [supabase] = useState(() => createSupabaseBrowserClient());
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
          const fallbackUsername = `${emailPrefix}_${userId.replace(/-/g, "").slice(-6)}`.toLowerCase();
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

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (formState.password !== formState.confirmPassword) {
      updateFormState(setFormState, { passwordStatus: "Passwords do not match." });
      return;
    }
    updateFormState(setFormState, { passwordStatus: "Updating password..." });
    const { error } = await supabase.auth.updateUser({ password: formState.password });
    if (error) {
      updateFormState(setFormState, { passwordStatus: error.message });
      return;
    }
    updateFormState(setFormState, { passwordStatus: "Password updated successfully." });
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!formState.email) {
      updateFormState(setFormState, { emailStatus: "Email is required." });
      return;
    }
    updateFormState(setFormState, { emailStatus: "Updating email..." });
    const { error } = await supabase.auth.updateUser({ email: formState.email });
    if (error) {
      updateFormState(setFormState, { emailStatus: error.message });
      return;
    }
    updateFormState(setFormState, {
      emailStatus: "Email update requested. Check your inbox to confirm.",
    });
  }

  async function handleUsernameSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!isAdmin) {
      updateFormState(setFormState, { usernameStatus: "Only admins can change usernames." });
      return;
    }
    const rawUsername = formState.username.trim();
    const nextUsername = rawUsername.toLowerCase();
    if (nextUsername.length < 2 || nextUsername.length > 32) {
      updateFormState(setFormState, { usernameStatus: "Username must be 2-32 characters." });
      return;
    }
    if (!nextUsername) {
      updateFormState(setFormState, { usernameStatus: "Username is required." });
      return;
    }
    updateFormState(setFormState, { usernameStatus: "Updating username..." });
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
      usernameStatus: "Username updated successfully.",
    });
  }

  async function handleDisplayNameSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const nextDisplayName = formState.displayName.trim();
    updateFormState(setFormState, { displayNameStatus: "Updating nickname..." });
    if (nextDisplayName) {
      const { data: existingDisplayName, error: displayNameError } = await supabase
        .from("profiles")
        .select("id")
        .ilike("display_name", nextDisplayName)
        .neq("id", userId)
        .maybeSingle();
      if (displayNameError) {
        updateFormState(setFormState, { displayNameStatus: displayNameError.message });
        return;
      }
      if (existingDisplayName) {
        updateFormState(setFormState, { displayNameStatus: "Nickname already exists." });
        return;
      }
    }
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: nextDisplayName || null })
      .eq("id", userId);
    if (error) {
      updateFormState(setFormState, { displayNameStatus: error.message });
      return;
    }
    updateFormState(setFormState, {
      displayName: nextDisplayName,
      displayNameStatus: "Nickname updated successfully.",
    });
  }

  async function handleToggleNotification(key: keyof NotificationPrefs): Promise<void> {
    const nextValue = !notifPrefs[key];
    setNotifPrefs((current) => ({ ...current, [key]: nextValue }));
    setNotifStatus("Saving...");
    const response = await fetch("/api/notification-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: nextValue }),
    });
    if (!response.ok) {
      setNotifPrefs((current) => ({ ...current, [key]: !nextValue }));
      setNotifStatus("Failed to save.");
      return;
    }
    setNotifStatus("Saved.");
    setTimeout(() => setNotifStatus(""), 2000);
  }

  const updater = (next: Partial<SettingsFormState>) => updateFormState(setFormState, next);

  return (
    <div className="content-inner">
      <div className="grid">
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
              <button className="button primary" type="submit">
                {t("updateEmail")}
              </button>
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
              <button className="button primary" type="submit">
                {t("updateUsername")}
              </button>
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
              <button className="button primary" type="submit">
                {t("updateNickname")}
              </button>
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
              <button className="button primary" type="submit">
                {t("updatePassword")}
              </button>
            </div>
            {formState.passwordStatus ? <p className="text-muted">{formState.passwordStatus}</p> : null}
          </form>
        </section>
        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">{t("notifications")}</div>
              <div className="card-subtitle">{t("languageHint")}</div>
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
                />
                <span className="toggle-slider" />
              </label>
            </div>
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
