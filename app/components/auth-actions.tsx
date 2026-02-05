"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";

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
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

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
    <details className="user-menu">
      <summary className="user-menu__summary">
        <span className="user-menu__avatar">{getInitials()}</span>
        <span className="text-muted">
          {authState.displayName || authState.username || authState.userDb || authState.email}
        </span>
      </summary>
      <div className="user-menu__panel">
        {authState.displayName ? <span className="text-muted">Display: {authState.displayName}</span> : null}
        {authState.usernameDisplay ? <span className="text-muted">Username: {authState.usernameDisplay}</span> : null}
        {authState.email ? <span className="text-muted">Email: {authState.email}</span> : null}
        <a className="user-menu__link" href="/profile">
          Profile
        </a>
        <a className="user-menu__link" href="/settings">
          Settings
        </a>
        {authState.email ? (
          <button className="button" type="button" onClick={handleSignOut}>
            Sign Out
          </button>
        ) : null}
        {authState.status ? <span className="text-muted">{authState.status}</span> : null}
      </div>
    </details>
  );
}

export default AuthActions;
