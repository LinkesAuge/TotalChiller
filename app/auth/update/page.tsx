"use client";

import { useState, type FormEvent } from "react";
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

  function updateFormState(nextState: Partial<PasswordFormState>): void {
    setFormState((currentState) => ({ ...currentState, ...nextState }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (formState.password !== formState.confirmPassword) {
      updateFormState({ status: "Passwords do not match." });
      return;
    }
    updateFormState({ status: "Updating password..." });
    const { error } = await supabase.auth.updateUser({ password: formState.password });
    if (error) {
      updateFormState({ status: error.message });
      return;
    }
    updateFormState({ status: "Password updated. You can log in now." });
  }

  return (
    <section className="card" style={{ maxWidth: 520 }}>
      <div className="card-header">
        <div>
          <div className="card-title">Update Password</div>
          <div className="card-subtitle">Choose a new password</div>
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="password">New password</label>
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
          <label htmlFor="confirmPassword">Confirm password</label>
          <input
            id="confirmPassword"
            type="password"
            value={formState.confirmPassword}
            onChange={(event) => updateFormState({ confirmPassword: event.target.value })}
            placeholder="••••••••"
            required
          />
        </div>
        <div className="list">
          <button className="button primary" type="submit">
            Update Password
          </button>
        </div>
        {formState.status ? <p className="text-muted">{formState.status}</p> : null}
      </form>
    </section>
  );
}

export default UpdatePasswordPage;
