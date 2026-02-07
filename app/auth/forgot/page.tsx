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
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 40, gap: 24, maxWidth: 720, margin: "0 auto" }}>
      <section className="card" style={{ maxWidth: 440, width: "100%" }}>
        <div className="tooltip-head">
          <img src="/assets/vip/back_tooltip_2.png" alt="Card header decorative background" className="tooltip-head-bg" width={400} height={44} loading="lazy" />
          <div className="tooltip-head-inner">
            <img src="/assets/vip/batler_icons_star_4.png" alt="Reset password icon" width={18} height={18} loading="lazy" />
            <h1 className="card-title">Reset Password</h1>
          </div>
        </div>
        <div className="card-body">
          <p style={{ fontSize: "0.85rem", color: "var(--color-text-2)", marginBottom: 12 }}>
            Enter the email address associated with your TotalChiller account and we will send you a
            secure link to create a new password.
          </p>
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
              <a href="/auth/login" style={{ color: "var(--color-gold)", textDecoration: "none" }}>Return to the login page</a>
              <span style={{ margin: "0 8px", color: "var(--color-text-muted)" }}>&bull;</span>
              <a href="/auth/register" style={{ color: "var(--color-gold)", textDecoration: "none" }}>Create a new account</a>
            </div>
          </form>
        </div>
      </section>
      <section className="card" style={{ maxWidth: 440, width: "100%" }}>
        <div className="card-body" style={{ lineHeight: 1.7, fontSize: "0.85rem" }}>
          <h2 style={{ fontSize: "0.95rem", marginBottom: 8 }}>Password Recovery for TotalChiller</h2>
          <p style={{ margin: 0 }}>
            Lost access to the TotalChiller platform? The password reset process is
            straightforward and secure. Use the form above to request a recovery link,
            which will be sent to the email address associated with the account. The
            link remains valid for a limited time to ensure security. This page is
            available to all visitors and does not require an active session.
          </p>
          <h3 style={{ fontSize: "0.88rem", marginTop: 12, marginBottom: 6 }}>How the Reset Process Works</h3>
          <ol style={{ paddingLeft: 18, margin: 0, fontSize: "0.82rem" }}>
            <li>Enter the email address linked to the account in the form above</li>
            <li>Check the inbox for a message from TotalChiller</li>
            <li>Click the secure recovery link in the email</li>
            <li>Choose a new password and confirm it on the update page</li>
            <li>Sign in with the updated credentials to resume access</li>
          </ol>
          <h3 style={{ fontSize: "0.88rem", marginTop: 12, marginBottom: 6 }}>Troubleshooting Tips</h3>
          <p style={{ margin: 0 }}>
            If the reset email does not arrive within a few minutes, check the spam
            or junk folder. Ensure the entered email matches the one used during
            registration. Members who continue to experience issues should reach out to
            our team through the <a href="/contact" style={{ color: "var(--color-gold)" }}>contact page</a> or
            via Discord for personalized assistance.
          </p>
          <h3 style={{ fontSize: "0.88rem", marginTop: 12, marginBottom: 6 }}>Account Security at TotalChiller</h3>
          <p style={{ margin: 0 }}>
            All password reset links are generated securely through Supabase Auth and
            encrypted in transit via TLS. We never store passwords in plain text, and
            the platform enforces modern security standards including Content-Security-Policy
            headers, Strict-Transport-Security, and row-level database access controls.
            This ensures that member accounts remain protected at every level.
          </p>
          <p style={{ marginTop: 10 }}>
            Remember the password? <a href="/auth/login" style={{ color: "var(--color-gold)" }}>Go back to the login page</a> to
            sign in. Need a new account instead? <a href="/auth/register" style={{ color: "var(--color-gold)" }}>Register here</a>.
            Visit the <a href="/home" style={{ color: "var(--color-gold)" }}>home page</a> to learn more about
            The Chillers community, or read the <a href="/about" style={{ color: "var(--color-gold)" }}>About page</a> for
            details on our mission and values.
          </p>
        </div>
      </section>
    </div>
  );
}

export default ForgotPasswordPage;
