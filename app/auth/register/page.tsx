"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import createSupabaseBrowserClient from "../../../lib/supabase/browser-client";

interface RegisterFormState {
  readonly email: string;
  readonly username: string;
  readonly password: string;
  readonly confirmPassword: string;
  readonly status: string;
  readonly isRegistered: boolean;
}

const initialFormState: RegisterFormState = {
  email: "",
  username: "",
  password: "",
  confirmPassword: "",
  status: "",
  isRegistered: false,
};

/**
 * Renders a single numbered step in the post-registration success panel.
 */
function SuccessStep({
  step,
  title,
  text,
}: {
  readonly step: number;
  readonly title: string;
  readonly text: string;
}): JSX.Element {
  return (
    <div className="flex gap-3 items-start">
      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gold/20 text-gold flex items-center justify-center text-sm font-bold">
        {step}
      </span>
      <div>
        <p className="m-0 font-semibold text-[0.88rem]">{title}</p>
        <p className="m-0 mt-0.5 text-[0.82rem] text-muted">{text}</p>
      </div>
    </div>
  );
}

/**
 * Renders the Supabase email/password registration form.
 * After successful registration, displays a success panel with clear next steps.
 */
function RegisterPage(): JSX.Element {
  const [formState, setFormState] = useState<RegisterFormState>(initialFormState);
  const supabase = createSupabaseBrowserClient();
  const t = useTranslations("auth.register");

  function updateFormState(nextState: Partial<RegisterFormState>): void {
    setFormState((currentState) => ({ ...currentState, ...nextState }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const nextUsername = formState.username.trim();
    if (nextUsername.length < 2 || nextUsername.length > 32) {
      updateFormState({ status: t("usernameLengthError") });
      return;
    }
    if (!nextUsername) {
      updateFormState({ status: t("usernameRequired") });
      return;
    }
    if (formState.password !== formState.confirmPassword) {
      updateFormState({ status: t("passwordMismatch") });
      return;
    }
    updateFormState({ status: t("creating") });
    /* Set fallback cookie in case Supabase ignores the redirect URL */
    document.cookie = "auth_redirect_next=/auth/login; path=/; max-age=600; SameSite=Lax";
    const { error } = await supabase.auth.signUp({
      email: formState.email,
      password: formState.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/auth/login`,
        data: {
          username: nextUsername,
          display_name: nextUsername,
        },
      },
    });
    if (error) {
      updateFormState({ status: error.message });
      return;
    }
    updateFormState({ status: t("created"), isRegistered: true });
  }

  if (formState.isRegistered) {
    return (
      <div className="flex flex-col items-center gap-6 pt-10 mx-auto max-w-[720px]">
        <section className="card max-w-[480px] w-full">
          <div className="tooltip-head">
            <Image
              src="/assets/vip/back_tooltip_2.png"
              alt="Card header decorative background"
              className="tooltip-head-bg"
              width={400}
              height={44}
            />
            <div className="tooltip-head-inner">
              <Image src="/assets/vip/batler_icons_star_4.png" alt="Success icon" width={18} height={18} />
              <h1 className="card-title">{t("successHeading")}</h1>
            </div>
          </div>
          <div className="card-body leading-relaxed text-sm">
            <p className="m-0 mb-4">{t("successIntro")}</p>
            <div className="flex flex-col gap-4">
              <SuccessStep step={1} title={t("successStep1Title")} text={t("successStep1Text")} />
              <SuccessStep step={2} title={t("successStep2Title")} text={t("successStep2Text")} />
              <SuccessStep step={3} title={t("successStep3Title")} text={t("successStep3Text")} />
              <SuccessStep step={4} title={t("successStep4Title")} text={t("successStep4Text")} />
            </div>
            <p className="mt-4 mb-0 text-[0.8rem] text-muted italic">{t("successNote")}</p>
            <div className="mt-4 text-center">
              <a href="/auth/login" className="text-gold no-underline text-[0.88rem]">
                {t("backToLogin")}
              </a>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 pt-10 mx-auto max-w-[720px]">
      <section className="card max-w-[480px] w-full">
        <div className="tooltip-head">
          <Image
            src="/assets/vip/back_tooltip_2.png"
            alt="Card header decorative background"
            className="tooltip-head-bg"
            width={400}
            height={44}
          />
          <div className="tooltip-head-inner">
            <Image src="/assets/vip/batler_icons_star_4.png" alt="Registration icon" width={18} height={18} />
            <h1 className="card-title">{t("heading")}</h1>
          </div>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">{t("email")}</label>
              <input
                id="email"
                type="email"
                value={formState.email}
                onChange={(event) => updateFormState({ email: event.target.value })}
                placeholder={t("emailPlaceholder")}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="username">{t("username")}</label>
              <input
                id="username"
                value={formState.username}
                onChange={(event) => updateFormState({ username: event.target.value })}
                placeholder={t("usernamePlaceholder")}
                minLength={2}
                maxLength={32}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">{t("password")}</label>
              <input
                id="password"
                type="password"
                value={formState.password}
                onChange={(event) => updateFormState({ password: event.target.value })}
                placeholder={t("passwordPlaceholder")}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">{t("confirmPassword")}</label>
              <input
                id="confirmPassword"
                type="password"
                value={formState.confirmPassword}
                onChange={(event) => updateFormState({ confirmPassword: event.target.value })}
                placeholder={t("passwordPlaceholder")}
                required
              />
            </div>
            <button className="button leather mt-2 w-full" type="submit">
              <Image
                src="/assets/vip/backs_1.png"
                alt="Leather button texture"
                className="leather-bg"
                width={200}
                height={40}
              />
              <span>{t("submit")}</span>
            </button>
            {formState.status ? <p className="text-muted mt-2">{formState.status}</p> : null}
            <div className="mt-3 text-center text-[0.82rem]">
              {t("alreadyHaveAccount")}{" "}
              <a href="/auth/login" className="text-gold no-underline">
                {t("signInToExisting")}
              </a>
            </div>
          </form>
        </div>
      </section>
      <section className="card max-w-[480px] w-full">
        <div className="card-body leading-relaxed text-sm">
          <h2 className="mb-2 text-[0.95rem]">{t("joinCommunity")}</h2>
          <p className="m-0">{t("joinText")}</p>
          <h3 className="mt-3 mb-1.5 text-[0.88rem]">{t("afterRegistration")}</h3>
          <p className="m-0">{t("afterRegText")}</p>
          <h3 className="mt-3 mb-1.5 text-[0.88rem]">{t("benefits")}</h3>
          <ul className="pl-[18px] m-0 text-[0.82rem]">
            <li>{t("benefit1")}</li>
            <li>{t("benefit2")}</li>
            <li>{t("benefit3")}</li>
            <li>{t("benefit4")}</li>
            <li>{t("benefit5")}</li>
            <li>{t("benefit6")}</li>
            <li>{t("benefit7")}</li>
          </ul>
          <h3 className="mt-3 mb-1.5 text-[0.88rem]">{t("requirements")}</h3>
          <p className="m-0">
            {t("requirementsText")}{" "}
            <a href="/auth/forgot" className="text-gold">
              {t("passwordRecoveryPage")}
            </a>
            {t("resetPasswords")}
          </p>
          <p className="mt-2.5">
            {t("learnMore")}{" "}
            <a href="/home" className="text-gold">
              {t("homePage")}
            </a>{" "}
            {t("forOverview")}{" "}
            <a href="/about" className="text-gold">
              {t("aboutPage")}
            </a>{" "}
            {t("toUnderstand")}{" "}
            <a href="/contact" className="text-gold">
              {t("contactUs")}
            </a>{" "}
            {t("withQuestions")}{" "}
            <a href="/privacy-policy" className="text-gold">
              {t("privacyPolicy")}
            </a>{" "}
            {t("toUnderstandData")}
          </p>
        </div>
      </section>
    </div>
  );
}

export default RegisterPage;
