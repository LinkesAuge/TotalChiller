"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import createSupabaseBrowserClient from "../../../lib/supabase/browser-client";

interface RegisterFormState {
  readonly email: string;
  readonly username: string;
  readonly password: string;
  readonly confirmPassword: string;
  readonly status: string;
}

const initialFormState: RegisterFormState = {
  email: "",
  username: "",
  password: "",
  confirmPassword: "",
  status: "",
};

/**
 * Renders the Supabase email/password registration form.
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
    const { error } = await supabase.auth.signUp({
      email: formState.email,
      password: formState.password,
      options: {
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
    updateFormState({ status: t("created") });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 40, gap: 24, maxWidth: 720, margin: "0 auto" }}>
      <section className="card" style={{ maxWidth: 480, width: "100%" }}>
        <div className="tooltip-head">
          <img src="/assets/vip/back_tooltip_2.png" alt="Card header decorative background" className="tooltip-head-bg" width={400} height={44} loading="lazy" />
          <div className="tooltip-head-inner">
            <img src="/assets/vip/batler_icons_star_4.png" alt="Registration icon" width={18} height={18} loading="lazy" />
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
            <button className="button leather" type="submit" style={{ width: "100%", marginTop: 8 }}>
              <img src="/assets/vip/backs_1.png" alt="Leather button texture" className="leather-bg" width={200} height={40} loading="lazy" />
              <span>{t("submit")}</span>
            </button>
            {formState.status ? <p className="text-muted" style={{ marginTop: 8 }}>{formState.status}</p> : null}
            <div style={{ textAlign: "center", marginTop: 12, fontSize: "0.82rem" }}>
              {t("alreadyHaveAccount")} <a href="/auth/login" style={{ color: "var(--color-gold)", textDecoration: "none" }}>{t("signInToExisting")}</a>
            </div>
          </form>
        </div>
      </section>
      <section className="card" style={{ maxWidth: 480, width: "100%" }}>
        <div className="card-body" style={{ lineHeight: 1.7, fontSize: "0.85rem" }}>
          <h2 style={{ fontSize: "0.95rem", marginBottom: 8 }}>{t("joinCommunity")}</h2>
          <p style={{ margin: 0 }}>{t("joinText")}</p>
          <h3 style={{ fontSize: "0.88rem", marginTop: 12, marginBottom: 6 }}>{t("afterRegistration")}</h3>
          <p style={{ margin: 0 }}>{t("afterRegText")}</p>
          <h3 style={{ fontSize: "0.88rem", marginTop: 12, marginBottom: 6 }}>{t("benefits")}</h3>
          <ul style={{ paddingLeft: 18, margin: 0, fontSize: "0.82rem" }}>
            <li>{t("benefit1")}</li>
            <li>{t("benefit2")}</li>
            <li>{t("benefit3")}</li>
            <li>{t("benefit4")}</li>
            <li>{t("benefit5")}</li>
            <li>{t("benefit6")}</li>
            <li>{t("benefit7")}</li>
          </ul>
          <h3 style={{ fontSize: "0.88rem", marginTop: 12, marginBottom: 6 }}>{t("requirements")}</h3>
          <p style={{ margin: 0 }}>
            {t("requirementsText")}{" "}
            <a href="/auth/forgot" style={{ color: "var(--color-gold)" }}>{t("passwordRecoveryPage")}</a>{t("resetPasswords")}
          </p>
          <p style={{ marginTop: 10 }}>
            {t("learnMore")} <a href="/home" style={{ color: "var(--color-gold)" }}>{t("homePage")}</a>{" "}
            {t("forOverview")} <a href="/about" style={{ color: "var(--color-gold)" }}>{t("aboutPage")}</a>{" "}
            {t("toUnderstand")} <a href="/contact" style={{ color: "var(--color-gold)" }}>{t("contactUs")}</a>{" "}
            {t("withQuestions")} <a href="/privacy-policy" style={{ color: "var(--color-gold)" }}>{t("privacyPolicy")}</a>{" "}
            {t("toUnderstandData")}
          </p>
        </div>
      </section>
    </div>
  );
}

export default RegisterPage;
