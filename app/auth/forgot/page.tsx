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
    <div className="flex flex-col items-center gap-6 pt-10 mx-auto max-w-[720px]">
      <section className="card max-w-[440px] w-full">
        <div className="tooltip-head">
          <img
            src="/assets/vip/back_tooltip_2.png"
            alt="Card header decorative background"
            className="tooltip-head-bg"
            width={400}
            height={44}
            loading="lazy"
          />
          <div className="tooltip-head-inner">
            <img
              src="/assets/vip/batler_icons_star_4.png"
              alt="Reset password icon"
              width={18}
              height={18}
              loading="lazy"
            />
            <h1 className="card-title">{t("heading")}</h1>
          </div>
        </div>
        <div className="card-body">
          <p className="mb-3" style={{ fontSize: "0.85rem", color: "var(--color-text-2)" }}>
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
            <button className="button primary mt-2 w-full" type="submit">
              {t("submit")}
            </button>
            {status ? <p className="text-muted mt-2">{status}</p> : null}
            <div className="mt-3" style={{ textAlign: "center", fontSize: "0.82rem" }}>
              <a href="/auth/login" style={{ color: "var(--color-gold)", textDecoration: "none" }}>
                {t("backToLogin")}
              </a>
              <span className="my-0 mx-2" style={{ color: "var(--color-text-muted)" }}>
                &bull;
              </span>
              <a href="/auth/register" style={{ color: "var(--color-gold)", textDecoration: "none" }}>
                {t("createAccount")}
              </a>
            </div>
          </form>
        </div>
      </section>
      <section className="card max-w-[440px] w-full">
        <div className="card-body" style={{ lineHeight: 1.7, fontSize: "0.85rem" }}>
          <h2 className="mb-2 text-[0.95rem]">{t("recoveryTitle")}</h2>
          <p className="m-0">{t("recoveryText")}</p>
          <h3 className="mt-3 mb-1.5 text-[0.88rem]">{t("howItWorks")}</h3>
          <ol className="pl-[18px] m-0 text-[0.82rem]">
            <li>{t("step1")}</li>
            <li>{t("step2")}</li>
            <li>{t("step3")}</li>
            <li>{t("step4")}</li>
            <li>{t("step5")}</li>
          </ol>
          <h3 className="mt-3 mb-1.5 text-[0.88rem]">{t("troubleshooting")}</h3>
          <p className="m-0">
            {t("troubleshootingText")}{" "}
            <a href="/contact" className="text-gold">
              {t("contactPage")}
            </a>{" "}
            {t("orDiscord")}
          </p>
          <h3 className="mt-3 mb-1.5 text-[0.88rem]">{t("securityTitle")}</h3>
          <p className="m-0">{t("securityText")}</p>
          <p className="mt-2.5">
            {t("rememberPassword")}{" "}
            <a href="/auth/login" className="text-gold">
              {t("goToLogin")}
            </a>{" "}
            {t("toSignIn")}{" "}
            <a href="/auth/register" className="text-gold">
              {t("registerHere")}
            </a>
            . {t("visitHome")}{" "}
            <a href="/home" className="text-gold">
              {t("homePage")}
            </a>{" "}
            {t("toLearnMore")}{" "}
            <a href="/about" className="text-gold">
              {t("aboutPage")}
            </a>{" "}
            {t("forDetails")}
          </p>
        </div>
      </section>
    </div>
  );
}

export default ForgotPasswordPage;
