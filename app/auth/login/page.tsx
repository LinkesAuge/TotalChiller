"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import createSupabaseBrowserClient from "../../../lib/supabase/browser-client";

/**
 * Renders the Supabase email/password login form.
 */
function LoginPage(): JSX.Element {
  const [identifier, setIdentifier] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const t = useTranslations("auth.login");
  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setStatus(t("signingIn"));
    const trimmedIdentifier = identifier.trim();
    let resolvedEmail = trimmedIdentifier;
    if (trimmedIdentifier && !trimmedIdentifier.includes("@")) {
      const { data: lookupEmail, error: lookupError } = await supabase.rpc("get_email_for_username", {
        input_username: trimmedIdentifier,
      });
      if (lookupError || !lookupEmail) {
        setStatus(t("usernameNotFound"));
        return;
      }
      resolvedEmail = lookupEmail;
    }
    const { error } = await supabase.auth.signInWithPassword({ email: resolvedEmail, password });
    if (error) {
      setStatus(error.message);
      return;
    }
    setStatus(t("signedIn"));
    window.location.href = "/";
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 40, gap: 24, maxWidth: 720, margin: "0 auto" }}>
      <section className="card" style={{ maxWidth: 440, width: "100%" }}>
        <div className="tooltip-head">
          <img src="/assets/vip/back_tooltip_2.png" alt="Card header decorative background" className="tooltip-head-bg" width={400} height={44} loading="lazy" />
          <div className="tooltip-head-inner">
            <img src="/assets/vip/batler_icons_star_4.png" alt="Login icon" width={18} height={18} loading="lazy" />
            <h1 className="card-title">{t("heading")}</h1>
          </div>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="identifier">{t("identifier")}</label>
              <input
                id="identifier"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder={t("identifierPlaceholder")}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">{t("password")}</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t("passwordPlaceholder")}
                required
              />
            </div>
            <button className="button leather" type="submit" style={{ width: "100%", marginTop: 8 }}>
              <img src="/assets/vip/backs_1.png" alt="Leather button texture" className="leather-bg" width={200} height={40} loading="lazy" />
              <span>{t("submit")}</span>
            </button>
            {status ? <p className="text-muted" style={{ marginTop: 8 }}>{status}</p> : null}
            <div style={{ textAlign: "center", marginTop: 12, fontSize: "0.82rem" }}>
              <a href="/auth/forgot" style={{ color: "var(--color-text-2)", textDecoration: "none" }}>{t("forgotPassword")}</a>
              <span style={{ margin: "0 8px", color: "var(--color-text-muted)" }}>&bull;</span>
              <a href="/auth/register" style={{ color: "var(--color-gold)", textDecoration: "none" }}>{t("createAccount")}</a>
            </div>
          </form>
        </div>
      </section>
      <section className="card" style={{ maxWidth: 440, width: "100%" }}>
        <div className="card-body" style={{ lineHeight: 1.7, fontSize: "0.85rem" }}>
          <h2 style={{ fontSize: "0.95rem", marginBottom: 8 }}>{t("welcomeBack")}</h2>
          <p style={{ margin: 0 }}>{t("welcomeText")}</p>
          <p style={{ marginTop: 10 }}>{t("aboutPlatform")}</p>
          <h3 style={{ fontSize: "0.88rem", marginTop: 12, marginBottom: 6 }}>{t("afterSignIn")}</h3>
          <ul style={{ paddingLeft: 18, margin: 0, fontSize: "0.82rem" }}>
            <li>{t("feature1")}</li>
            <li>{t("feature2")}</li>
            <li>{t("feature3")}</li>
            <li>{t("feature4")}</li>
            <li>{t("feature5")}</li>
            <li>{t("feature6")}</li>
            <li>{t("feature7")}</li>
          </ul>
          <h3 style={{ fontSize: "0.88rem", marginTop: 12, marginBottom: 6 }}>{t("secureAuth")}</h3>
          <p style={{ margin: 0 }}>
            {t("secureAuthText")}{" "}
            <a href="/auth/forgot" style={{ color: "var(--color-gold)" }}>{t("passwordRecoveryPage")}</a>{" "}
            {t("toRegainEntry")}
          </p>
          <p style={{ marginTop: 10 }}>
            {t("newToChillers")} <a href="/auth/register" style={{ color: "var(--color-gold)" }}>{t("createAnAccount")}</a>{" "}
            {t("toApply")} <a href="/about" style={{ color: "var(--color-gold)" }}>{t("aboutPage")}</a>{" "}
            {t("toLearnMore")} <a href="/home" style={{ color: "var(--color-gold)" }}>{t("homePage")}</a>{" "}
            {t("forOverview")} <a href="/contact" style={{ color: "var(--color-gold)" }}>{t("contactPage")}</a>.
          </p>
        </div>
      </section>
    </div>
  );
}

export default LoginPage;
