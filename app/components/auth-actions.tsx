"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useSupabase } from "../hooks/use-supabase";
import NotificationBell from "./notification-bell";

type ActivePanel = "profile" | "notifications" | null;

interface AuthActionState {
  readonly email: string;
  readonly userDb: string;
  readonly username: string;
  readonly displayName: string;
  readonly status: string;
}

const initialAuthState: AuthActionState = {
  email: "",
  userDb: "",
  username: "",
  displayName: "",
  status: "",
};

/**
 * Shows the current user and provides a sign-out action.
 */
function AuthActions(): JSX.Element | null {
  const [authState, setAuthState] = useState<AuthActionState>(initialAuthState);
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const supabase = useSupabase();
  const t = useTranslations("userMenu");

  useEffect(() => {
    let isMounted = true;
    async function loadUser(): Promise<void> {
      const { data } = await supabase.auth.getUser();
      if (!isMounted) {
        return;
      }
      const userEmail = data.user?.email ?? "";
      const userId = data.user?.id;
      if (!userId) {
        setAuthState({ email: userEmail, userDb: "", username: "", displayName: "", status: "" });
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_db,username,display_name")
        .eq("id", userId)
        .maybeSingle();
      setAuthState({
        email: userEmail,
        userDb: profile?.user_db ?? "",
        username: profile?.username ?? "",
        displayName: profile?.display_name ?? "",
        status: "",
      });
    }
    void loadUser();
    return () => {
      isMounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setActivePanel(null);
      }
    }
    if (activePanel) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activePanel]);

  function handleToggleProfile(): void {
    setActivePanel((current) => (current === "profile" ? null : "profile"));
  }
  function handleToggleNotifications(): void {
    setActivePanel((current) => (current === "notifications" ? null : "notifications"));
  }
  function handleClosePanel(): void {
    setActivePanel(null);
  }

  async function handleSignOut(): Promise<void> {
    setAuthState((state) => ({ ...state, status: "Signing out..." }));
    await supabase.auth.signOut();
    setAuthState({ email: "", userDb: "", username: "", displayName: "", status: "" });
    window.location.href = "/home";
  }

  function getInitials(): string {
    const base = authState.displayName || authState.username || authState.userDb || authState.email;
    if (!base) {
      return "U";
    }
    return base.slice(0, 2).toUpperCase();
  }

  if (!authState.email) {
    return null;
  }

  return (
    <div className="user-actions-bar" ref={containerRef}>
      <NotificationBell
        isOpen={activePanel === "notifications"}
        onToggle={handleToggleNotifications}
        onClose={handleClosePanel}
      />
      <div className={`user-menu${activePanel === "profile" ? " user-menu--open" : ""}`}>
        <button type="button" className="user-menu__summary" onClick={handleToggleProfile}>
          <span className="user-menu__avatar">{getInitials()}</span>
          <span className="text-muted">
            {authState.displayName || authState.username || authState.userDb || authState.email}
          </span>
        </button>
        {activePanel === "profile" ? (
          <div className="user-menu__panel">
            {authState.displayName ? <span className="text-muted">{authState.displayName}</span> : null}
            {authState.email ? <span className="text-muted">{authState.email}</span> : null}
            <div className="user-menu__divider" />
            <a className="user-menu__link" href="/profile">
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M2.5 14C2.5 11 5 9 8 9C11 9 13.5 11 13.5 14"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              {t("profile")}
            </a>
            <a className="user-menu__link" href="/messages">
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none">
                <rect x="1.5" y="3" width="13" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M1.5 5.5L8 9L14.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {t("messages")}
            </a>
            <a className="user-menu__link" href="/settings">
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M8 1.5V3M8 13V14.5M1.5 8H3M13 8H14.5M3.05 3.05L4.1 4.1M11.9 11.9L12.95 12.95M12.95 3.05L11.9 4.1M4.1 11.9L3.05 12.95"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
              {t("settings")}
            </a>
            <div className="user-menu__divider" />
            {authState.email ? (
              <button className="button" type="button" onClick={handleSignOut}>
                {t("signOut")}
              </button>
            ) : null}
            {authState.status ? <span className="text-muted">{authState.status}</span> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default AuthActions;
