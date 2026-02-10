"use client";

import { useState, type FormEvent } from "react";
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
            <button className="button leather mt-2 py-3.5 px-6 w-full" type="submit">
              <img
                src="/assets/ui/backs_leather_1.png"
                alt="Leather button texture"
                className="leather-bg"
                width={800}
                height={60}
                loading="lazy"
              />
              <span>{t("submit")}</span>
            </button>
            {status ? <p className="text-muted mt-2">{status}</p> : null}
            <div className="mt-3 text-center text-[0.82rem]">
              <a href="/auth/forgot" className="text-text-2 no-underline">
                {t("forgotPassword")}
              </a>
              <span className="my-0 mx-2 text-text-muted">&bull;</span>
              <a href="/auth/register" className="text-gold no-underline">
                {t("createAccount")}
              </a>
            </div>
          </form>
        </div>
      </section>
      <section className="card max-w-[440px] w-full">
        <div className="card-body leading-relaxed text-sm">
          <h2 className="mb-2 text-[0.95rem]">{t("welcomeBack")}</h2>
          <p className="m-0">{t("welcomeText")}</p>
          <p className="mt-2.5">{t("aboutPlatform")}</p>
          <h3 className="mt-3 mb-1.5 text-[0.88rem]">{t("afterSignIn")}</h3>
          <ul className="pl-[18px] m-0 text-[0.82rem]">
            <li>{t("feature1")}</li>
            <li>{t("feature2")}</li>
            <li>{t("feature3")}</li>
            <li>{t("feature4")}</li>
            <li>{t("feature5")}</li>
            <li>{t("feature6")}</li>
            <li>{t("feature7")}</li>
          </ul>
          <h3 className="mt-3 mb-1.5 text-[0.88rem]">{t("secureAuth")}</h3>
          <p className="m-0">
            {t("secureAuthText")}{" "}
            <a href="/auth/forgot" className="text-gold">
              {t("passwordRecoveryPage")}
            </a>{" "}
            {t("toRegainEntry")}
          </p>
          <p className="mt-2.5">
            {t("newToChillers")}{" "}
            <a href="/auth/register" className="text-gold">
              {t("createAnAccount")}
            </a>{" "}
            {t("toApply")}{" "}
            <a href="/about" className="text-gold">
              {t("aboutPage")}
            </a>{" "}
            {t("toLearnMore")}{" "}
            <a href="/home" className="text-gold">
              {t("homePage")}
            </a>{" "}
            {t("forOverview")}{" "}
            <a href="/contact" className="text-gold">
              {t("contactPage")}
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  );
}

export default LoginPage;
