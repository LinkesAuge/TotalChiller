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

/** Skeleton placeholder shown while auth state loads. */
function AuthSkeleton(): JSX.Element {
  return (
    <div className="user-actions-bar" aria-busy="true">
      <div className="skeleton" style={{ width: 28, height: 28, borderRadius: "50%" }} />
      <div className="skeleton" style={{ width: 28, height: 28, borderRadius: "50%" }} />
    </div>
  );
}

/**
 * Shows the current user and provides a sign-out action.
 * Renders a skeleton while the initial auth check is in progress.
 */
function AuthActions(): JSX.Element {
  const [isLoading, setIsLoading] = useState(true);
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
        setIsLoading(false);
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
      setIsLoading(false);
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

  /** Full page reload after sign-out ensures all server components re-render without stale auth. */
  async function handleSignOut(): Promise<void> {
    setAuthState((state) => ({ ...state, status: t("signingOut") }));
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

  if (isLoading) {
    return <AuthSkeleton />;
  }
  if (!authState.email) {
    return <AuthSkeleton />;
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
              <img src="/assets/game/icons/icons_player_5.png" alt="" width={20} height={20} />
              {t("profile")}
            </a>
            <a className="user-menu__link" href="/messages">
              <img src="/assets/game/icons/icons_envelope_1.png" alt="" width={20} height={20} />
              {t("messages")}
            </a>
            <a className="user-menu__link" href="/settings">
              <img src="/assets/game/icons/icons_options_gear_on_1.png" alt="" width={20} height={20} />
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
