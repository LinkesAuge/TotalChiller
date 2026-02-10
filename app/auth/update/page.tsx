"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import createSupabaseBrowserClient from "../../../lib/supabase/browser-client";

interface PasswordFormState {
  readonly password: string;
  readonly confirmPassword: string;
  readonly status: string;
}

const initialPasswordState: PasswordFormState = {
  password: "",
  confirmPassword: "",
  status: "",
};

/**
 * Renders the password update form for reset links.
 */
function UpdatePasswordPage(): JSX.Element {
  const [formState, setFormState] = useState<PasswordFormState>(initialPasswordState);
  const supabase = createSupabaseBrowserClient();
  const t = useTranslations("auth.update");

  function updateFormState(nextState: Partial<PasswordFormState>): void {
    setFormState((currentState) => ({ ...currentState, ...nextState }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (formState.password !== formState.confirmPassword) {
      updateFormState({ status: t("mismatch") });
      return;
    }
    updateFormState({ status: t("updating") });
    const { error } = await supabase.auth.updateUser({ password: formState.password });
    if (error) {
      updateFormState({ status: error.message });
      return;
    }
    updateFormState({ status: t("updated") });
  }

  return (
    <div className="flex justify-center pt-10">
      <section className="card max-w-[440px] w-full">
        <div className="tooltip-head">
          <img src="/assets/vip/back_tooltip_2.png" alt="" className="tooltip-head-bg" width={400} height={44} />
          <div className="tooltip-head-inner">
            <img src="/assets/vip/batler_icons_star_4.png" alt="Update password" width={18} height={18} />
            <h3 className="card-title">{t("heading")}</h3>
          </div>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="password">{t("newPassword")}</label>
              <input
                id="password"
                type="password"
                value={formState.password}
                onChange={(event) => updateFormState({ password: event.target.value })}
                placeholder="••••••••"
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
                placeholder="••••••••"
                required
              />
            </div>
            <button className="button primary mt-2 w-full" type="submit">
              {t("submit")}
            </button>
            {formState.status ? <p className="text-muted mt-2">{formState.status}</p> : null}
          </form>
        </div>
      </section>
    </div>
  );
}

export default UpdatePasswordPage;
