"use client";

import { useTranslations } from "next-intl";
import AuthActions from "./auth-actions";
import { useAuth } from "../hooks/use-auth";

/**
 * Renders public auth buttons when signed out.
 */
function PublicAuthActions(): JSX.Element {
  const t = useTranslations("publicAuth");
  const { isAuthenticated } = useAuth();

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
