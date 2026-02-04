"use client";

import { useState, type FormEvent } from "react";
import createSupabaseBrowserClient from "../../../lib/supabase/browser-client";

/**
 * Renders the password reset request form.
 */
function ForgotPasswordPage(): JSX.Element {
  const [email, setEmail] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const supabase = createSupabaseBrowserClient();

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setStatus("Sending reset email...");
    const redirectTo = `${window.location.origin}/auth/update`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      setStatus(error.message);
      return;
    }
    setStatus("Reset email sent. Check your inbox.");
  }

  return (
    <section className="card" style={{ maxWidth: 520 }}>
      <div className="card-header">
        <div>
          <div className="card-title">Reset Password</div>
          <div className="card-subtitle">We will email you a reset link</div>
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>
        <div className="list">
          <button className="button primary" type="submit">
            Send Reset Link
          </button>
        </div>
        {status ? <p className="text-muted">{status}</p> : null}
      </form>
    </section>
  );
}

export default ForgotPasswordPage;
