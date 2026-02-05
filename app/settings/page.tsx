"use client";

import { useEffect, useState, type FormEvent } from "react";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";
import AuthActions from "../components/auth-actions";
import getIsAdminAccess from "../../lib/supabase/admin-access";

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

/**
 * Renders the settings page with password update.
 */
function SettingsPage(): JSX.Element {
  const [formState, setFormState] = useState<SettingsFormState>(initialSettingsState);
  const [userId, setUserId] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const supabase = createSupabaseBrowserClient();

  function updateFormState(nextState: Partial<SettingsFormState>): void {
    setFormState((currentState) => ({ ...currentState, ...nextState }));
  }

  useEffect(() => {
    let isMounted = true;
    async function loadUser(): Promise<void> {
      const { data } = await supabase.auth.getUser();
      if (!isMounted) {
        return;
      }
      const currentUserId = data.user?.id ?? "";
      setUserId(currentUserId);
      const currentEmail = data.user?.email ?? "";
      updateFormState({ email: currentEmail });
      if (currentUserId) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("user_db,username,display_name")
          .eq("id", currentUserId)
          .maybeSingle();
        if (!profileData && currentEmail) {
          const emailPrefix = currentEmail.split("@")[0];
          const fallbackUsername = `${emailPrefix}_${currentUserId.replace(/-/g, "").slice(-6)}`.toLowerCase();
          const { data: createdProfile } = await supabase
            .from("profiles")
            .upsert(
              {
                id: currentUserId,
                email: currentEmail,
                user_db: fallbackUsername,
                username: emailPrefix,
                display_name: emailPrefix,
              },
              { onConflict: "id" },
            )
            .select("user_db,username,display_name")
            .single();
          updateFormState({
            username: createdProfile?.username ?? "",
            displayName: createdProfile?.display_name ?? createdProfile?.username ?? "",
          });
        } else {
          updateFormState({
            username: profileData?.username ?? "",
            displayName: profileData?.display_name ?? profileData?.username ?? "",
          });
        }
        setIsAdmin(await getIsAdminAccess({ supabase }));
      }
    }
    void loadUser();
    return () => {
      isMounted = false;
    };
  }, [supabase]);

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (formState.password !== formState.confirmPassword) {
      updateFormState({ passwordStatus: "Passwords do not match." });
      return;
    }
    updateFormState({ passwordStatus: "Updating password..." });
    const { error } = await supabase.auth.updateUser({ password: formState.password });
    if (error) {
      updateFormState({ passwordStatus: error.message });
      return;
    }
    updateFormState({ passwordStatus: "Password updated successfully." });
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!formState.email) {
      updateFormState({ emailStatus: "Email is required." });
      return;
    }
    updateFormState({ emailStatus: "Updating email..." });
    const { error } = await supabase.auth.updateUser({ email: formState.email });
    if (error) {
      updateFormState({ emailStatus: error.message });
      return;
    }
    updateFormState({
      emailStatus: "Email update requested. Check your inbox to confirm.",
    });
  }

  async function handleUsernameSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!isAdmin) {
      updateFormState({ usernameStatus: "Only admins can change usernames." });
      return;
    }
    const rawUsername = formState.username.trim();
    const nextUsername = rawUsername.toLowerCase();
    if (nextUsername.length < 2 || nextUsername.length > 32) {
      updateFormState({ usernameStatus: "Username must be 2-32 characters." });
      return;
    }
    if (!nextUsername) {
      updateFormState({ usernameStatus: "Username is required." });
      return;
    }
    if (!userId) {
      updateFormState({ usernameStatus: "You must be logged in to update username." });
      return;
    }
    updateFormState({ usernameStatus: "Updating username..." });
    const { error } = await supabase
      .from("profiles")
      .upsert(
        { id: userId, email: formState.email, user_db: nextUsername, username: rawUsername },
        { onConflict: "id" },
      );
    if (error) {
      updateFormState({ usernameStatus: error.message });
      return;
    }
    updateFormState({
      username: rawUsername,
      usernameStatus: "Username updated successfully.",
    });
  }

  async function handleDisplayNameSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const nextDisplayName = formState.displayName.trim();
    if (!userId) {
      updateFormState({ displayNameStatus: "You must be logged in to update nickname." });
      return;
    }
    updateFormState({ displayNameStatus: "Updating nickname..." });
    if (nextDisplayName) {
      const { data: existingDisplayName, error: displayNameError } = await supabase
        .from("profiles")
        .select("id")
        .ilike("display_name", nextDisplayName)
        .neq("id", userId)
        .maybeSingle();
      if (displayNameError) {
        updateFormState({ displayNameStatus: displayNameError.message });
        return;
      }
      if (existingDisplayName) {
        updateFormState({ displayNameStatus: "Nickname already exists." });
        return;
      }
    }
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: nextDisplayName || null })
      .eq("id", userId);
    if (error) {
      updateFormState({ displayNameStatus: error.message });
      return;
    }
    updateFormState({
      displayName: nextDisplayName,
      displayNameStatus: "Nickname updated successfully.",
    });
  }

  return (
    <>
      <section className="header header-inline">
        <div className="title">Settings</div>
        <div className="actions">
          <AuthActions />
        </div>
      </section>
      <div className="grid">
        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Account Details</div>
              <div className="card-subtitle">Update your email address</div>
            </div>
          </div>
          <form onSubmit={handleEmailSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={formState.email}
                onChange={(event) => updateFormState({ email: event.target.value })}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="list">
              <button className="button primary" type="submit">
                Update Email
              </button>
            </div>
            {formState.emailStatus ? <p className="text-muted">{formState.emailStatus}</p> : null}
          </form>
        </section>
        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Username</div>
              <div className="card-subtitle">Admins only</div>
            </div>
          </div>
          <form onSubmit={handleUsernameSubmit}>
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                value={formState.username}
                onChange={(event) => updateFormState({ username: event.target.value })}
                placeholder="your_username"
                minLength={2}
                maxLength={32}
                disabled={!isAdmin}
                required
              />
            </div>
            <div className="list">
              <button className="button primary" type="submit">
                Update Username
              </button>
            </div>
            {!isAdmin ? <span className="badge">Admin only</span> : null}
            {formState.usernameStatus ? <p className="text-muted">{formState.usernameStatus}</p> : null}
          </form>
        </section>
        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Nickname</div>
              <div className="card-subtitle">Shown to other members</div>
            </div>
          </div>
          <form onSubmit={handleDisplayNameSubmit}>
            <div className="form-group">
              <label htmlFor="displayName">Nickname</label>
              <input
                id="displayName"
                value={formState.displayName}
                onChange={(event) => updateFormState({ displayName: event.target.value })}
                placeholder="Nickname"
              />
            </div>
            <div className="list">
              <button className="button primary" type="submit">
                Update Nickname
              </button>
            </div>
            {formState.displayNameStatus ? <p className="text-muted">{formState.displayNameStatus}</p> : null}
          </form>
        </section>
        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Update Password</div>
              <div className="card-subtitle">Change your account password</div>
            </div>
          </div>
          <form onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <label htmlFor="password">New password</label>
              <input
                id="password"
                type="password"
                value={formState.password}
                onChange={(event) => updateFormState({ password: event.target.value })}
                placeholder="••••••••"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm password</label>
              <input
                id="confirmPassword"
                type="password"
                value={formState.confirmPassword}
                onChange={(event) => updateFormState({ confirmPassword: event.target.value })}
                placeholder="••••••••"
                required
              />
            </div>
            <div className="list">
              <button className="button primary" type="submit">
                Update Password
              </button>
            </div>
            {formState.passwordStatus ? (
              <p className="text-muted">{formState.passwordStatus}</p>
            ) : null}
          </form>
        </section>
      </div>
    </>
  );
}

export default SettingsPage;
