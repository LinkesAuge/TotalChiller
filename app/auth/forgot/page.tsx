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
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 40 }}>
      <section className="card" style={{ maxWidth: 440, width: "100%" }}>
        <div className="tooltip-head">
          <img src="/assets/vip/back_tooltip_2.png" alt="" className="tooltip-head-bg" />
          <div className="tooltip-head-inner">
            <img src="/assets/vip/batler_icons_star_4.png" alt="" style={{ width: 18, height: 18 }} />
            <h3 className="card-title">Reset Password</h3>
          </div>
        </div>
        <div className="card-body">
          <p style={{ fontSize: "0.85rem", color: "var(--color-text-2)", marginBottom: 12 }}>We will email you a reset link.</p>
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
            <button className="button primary" type="submit" style={{ width: "100%", marginTop: 8 }}>
              Send Reset Link
            </button>
            {status ? <p className="text-muted" style={{ marginTop: 8 }}>{status}</p> : null}
            <div style={{ textAlign: "center", marginTop: 12, fontSize: "0.82rem" }}>
              <a href="/auth/login" style={{ color: "var(--color-gold)", textDecoration: "none" }}>Back to login</a>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

export default ForgotPasswordPage;
