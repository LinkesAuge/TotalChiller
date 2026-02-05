"use client";

import { useState, type FormEvent } from "react";
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

  function updateFormState(nextState: Partial<RegisterFormState>): void {
    setFormState((currentState) => ({ ...currentState, ...nextState }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const nextUsername = formState.username.trim();
    if (nextUsername.length < 2 || nextUsername.length > 32) {
      updateFormState({ status: "Username must be 2-32 characters." });
      return;
    }
    if (!nextUsername) {
      updateFormState({ status: "Username is required." });
      return;
    }
    if (formState.password !== formState.confirmPassword) {
      updateFormState({ status: "Passwords do not match." });
      return;
    }
    updateFormState({ status: "Creating account..." });
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
    updateFormState({ status: "Account created. Check your email to verify." });
  }

  return (
    <section className="card" style={{ maxWidth: 560 }}>
      <div className="card-header">
        <div>
          <div className="card-title">Create Account</div>
          <div className="card-subtitle">Join the clan community</div>
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={formState.email}
            onChange={(event) => updateFormState({ email: event.target.value })}
            placeholder="you@example.com"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            value={formState.username}
            onChange={(event) => updateFormState({ username: event.target.value })}
            placeholder="your_username"
            minLength={2}
            maxLength={32}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
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
            Create Account
          </button>
        </div>
        {formState.status ? <p className="text-muted">{formState.status}</p> : null}
      </form>
    </section>
  );
}

export default RegisterPage;
