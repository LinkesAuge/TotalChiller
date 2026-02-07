"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import createSupabaseBrowserClient from "../../../lib/supabase/browser-client";

/**
 * Renders the password reset request form.
 */
function ForgotPasswordPage(): JSX.Element {
  const [email, setEmail] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const supabase = createSupabaseBrowserClient();
  const t = useTranslations("auth.forgot");

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setStatus(t("sending"));
    const redirectTo = `${window.location.origin}/auth/update`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      setStatus(error.message);
      return;
    }
    setStatus(t("sent"));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 40, gap: 24, maxWidth: 720, margin: "0 auto" }}>
      <section className="card" style={{ maxWidth: 440, width: "100%" }}>
        <div className="tooltip-head">
          <img src="/assets/vip/back_tooltip_2.png" alt="Card header decorative background" className="tooltip-head-bg" width={400} height={44} loading="lazy" />
          <div className="tooltip-head-inner">
            <img src="/assets/vip/batler_icons_star_4.png" alt="Reset password icon" width={18} height={18} loading="lazy" />
            <h1 className="card-title">{t("heading")}</h1>
          </div>
        </div>
        <div className="card-body">
          <p style={{ fontSize: "0.85rem", color: "var(--color-text-2)", marginBottom: 12 }}>
            {t("description")}
          </p>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">{t("email")}</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t("emailPlaceholder")}
                required
              />
            </div>
            <button className="button primary" type="submit" style={{ width: "100%", marginTop: 8 }}>
              {t("submit")}
            </button>
            {status ? <p className="text-muted" style={{ marginTop: 8 }}>{status}</p> : null}
            <div style={{ textAlign: "center", marginTop: 12, fontSize: "0.82rem" }}>
              <a href="/auth/login" style={{ color: "var(--color-gold)", textDecoration: "none" }}>{t("backToLogin")}</a>
              <span style={{ margin: "0 8px", color: "var(--color-text-muted)" }}>&bull;</span>
              <a href="/auth/register" style={{ color: "var(--color-gold)", textDecoration: "none" }}>{t("createAccount")}</a>
            </div>
          </form>
        </div>
      </section>
      <section className="card" style={{ maxWidth: 440, width: "100%" }}>
        <div className="card-body" style={{ lineHeight: 1.7, fontSize: "0.85rem" }}>
          <h2 style={{ fontSize: "0.95rem", marginBottom: 8 }}>{t("recoveryTitle")}</h2>
          <p style={{ margin: 0 }}>{t("recoveryText")}</p>
          <h3 style={{ fontSize: "0.88rem", marginTop: 12, marginBottom: 6 }}>{t("howItWorks")}</h3>
          <ol style={{ paddingLeft: 18, margin: 0, fontSize: "0.82rem" }}>
            <li>{t("step1")}</li>
            <li>{t("step2")}</li>
            <li>{t("step3")}</li>
            <li>{t("step4")}</li>
            <li>{t("step5")}</li>
          </ol>
          <h3 style={{ fontSize: "0.88rem", marginTop: 12, marginBottom: 6 }}>{t("troubleshooting")}</h3>
          <p style={{ margin: 0 }}>
            {t("troubleshootingText")}{" "}
            <a href="/contact" style={{ color: "var(--color-gold)" }}>{t("contactPage")}</a>{" "}
            {t("orDiscord")}
          </p>
          <h3 style={{ fontSize: "0.88rem", marginTop: 12, marginBottom: 6 }}>{t("securityTitle")}</h3>
          <p style={{ margin: 0 }}>{t("securityText")}</p>
          <p style={{ marginTop: 10 }}>
            {t("rememberPassword")} <a href="/auth/login" style={{ color: "var(--color-gold)" }}>{t("goToLogin")}</a>{" "}
            {t("toSignIn")} <a href="/auth/register" style={{ color: "var(--color-gold)" }}>{t("registerHere")}</a>.{" "}
            {t("visitHome")} <a href="/home" style={{ color: "var(--color-gold)" }}>{t("homePage")}</a>{" "}
            {t("toLearnMore")} <a href="/about" style={{ color: "var(--color-gold)" }}>{t("aboutPage")}</a>{" "}
            {t("forDetails")}
          </p>
        </div>
      </section>
    </div>
  );
}

export default ForgotPasswordPage;
