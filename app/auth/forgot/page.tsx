"use client";

import Image from "next/image";
import { useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import AuthInfoCard from "../components/auth-info-card";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

/**
 * Renders the password reset request form with Cloudflare Turnstile CAPTCHA.
 */
function ForgotPasswordPage(): JSX.Element {
  const [email, setEmail] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const turnstileRef = useRef<TurnstileInstance>(null);
  const t = useTranslations("auth.forgot");
  const tErrors = useTranslations("auth.errors");

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!turnstileToken && TURNSTILE_SITE_KEY) {
      setStatus(t("completeCaptcha"));
      return;
    }
    setIsSubmitting(true);
    setStatus(t("sending"));
    const redirectTo = `${window.location.origin}/auth/callback?next=/auth/update`;

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, turnstileToken, redirectTo }),
      });

      const result = (await response.json()) as { ok?: boolean; errorKey?: string };
      if (!response.ok || result.errorKey) {
        setStatus(tErrors(result.errorKey ?? "unknownError"));
        turnstileRef.current?.reset();
        setTurnstileToken("");
        return;
      }
      setStatus(t("sent"));
    } catch {
      setStatus(tErrors("unknownError"));
      turnstileRef.current?.reset();
      setTurnstileToken("");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 pt-10 mx-auto max-w-[720px]">
      <section className="card max-w-[440px] w-full">
        <div className="tooltip-head">
          <Image
            src="/assets/vip/back_tooltip_2.png"
            alt="Card header decorative background"
            className="tooltip-head-bg"
            fill
            loading="eager"
            sizes="(max-width: 900px) 90vw, 70vw"
          />
          <div className="tooltip-head-inner">
            <Image
              src="/assets/vip/batler_icons_star_4.png"
              alt="Reset password icon"
              width={18}
              height={18}
              sizes="18px"
            />
            <h1 className="card-title">{t("heading")}</h1>
          </div>
        </div>
        <div className="card-body">
          <p className="mb-3 text-sm text-text-2">{t("description")}</p>
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
            {TURNSTILE_SITE_KEY ? (
              <div className="mt-2 mb-2">
                <Turnstile
                  ref={turnstileRef}
                  siteKey={TURNSTILE_SITE_KEY}
                  onSuccess={setTurnstileToken}
                  onError={() => setTurnstileToken("")}
                  onExpire={() => setTurnstileToken("")}
                  options={{ theme: "dark", size: "flexible" }}
                />
              </div>
            ) : null}
            <button
              className="button primary mt-2 w-full"
              type="submit"
              disabled={isSubmitting || (TURNSTILE_SITE_KEY ? !turnstileToken : false)}
            >
              {t("submit")}
            </button>
            {status ? <p className="text-muted mt-2">{status}</p> : null}
            <div className="mt-3 text-center text-[0.82rem]">
              <a href="/auth/login" className="text-gold no-underline">
                {t("backToLogin")}
              </a>
              <span className="my-0 mx-2 text-text-muted">&bull;</span>
              <a href="/auth/register" className="text-gold no-underline">
                {t("createAccount")}
              </a>
            </div>
          </form>
        </div>
      </section>
      <AuthInfoCard title={t("recoveryTitle")} className="max-w-[440px] w-full" bodyClassName="leading-relaxed text-sm">
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
      </AuthInfoCard>
    </div>
  );
}

export default ForgotPasswordPage;
