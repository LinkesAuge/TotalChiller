"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import AuthActions from "./auth-actions";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";

/**
 * Renders public auth buttons when signed out.
 */
function PublicAuthActions(): JSX.Element {
  const supabase = createSupabaseBrowserClient();
  const t = useTranslations("publicAuth");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    let isActive = true;
    async function loadSession(): Promise<void> {
      const { data } = await supabase.auth.getUser();
      if (isActive) {
        setIsAuthenticated(Boolean(data.user));
      }
    }
    void loadSession();
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      void loadSession();
    });
    return () => {
      isActive = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <>
      {!isAuthenticated ? (
        <>
          <a className="button" href="/auth/login">
            {t("signIn")}
          </a>
          <a className="button primary" href="/auth/register">
            {t("joinTheChillers")}
          </a>
        </>
      ) : null}
      <AuthActions />
    </>
  );
}

export default PublicAuthActions;
