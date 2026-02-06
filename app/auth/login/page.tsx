"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import createSupabaseBrowserClient from "../../../lib/supabase/browser-client";

/**
 * Renders the Supabase email/password login form.
 */
function LoginPage(): JSX.Element {
  const [identifier, setIdentifier] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setStatus("Signing in...");
    const trimmedIdentifier = identifier.trim();
    let resolvedEmail = trimmedIdentifier;
    if (trimmedIdentifier && !trimmedIdentifier.includes("@")) {
      const { data: lookupEmail, error: lookupError } = await supabase.rpc("get_email_for_username", {
        input_username: trimmedIdentifier,
      });
      if (lookupError || !lookupEmail) {
        setStatus("Username not found.");
        return;
      }
      resolvedEmail = lookupEmail;
    }
    const { error } = await supabase.auth.signInWithPassword({ email: resolvedEmail, password });
    if (error) {
      setStatus(error.message);
      return;
    }
    setStatus("Signed in. Redirecting...");
    window.location.href = "/";
  }
  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 40 }}>
      <section className="card" style={{ maxWidth: 440, width: "100%" }}>
        <div className="tooltip-head">
          <img src="/assets/vip/back_tooltip_2.png" alt="" className="tooltip-head-bg" />
          <div className="tooltip-head-inner">
            <img src="/assets/vip/batler_icons_star_4.png" alt="" style={{ width: 18, height: 18 }} />
            <h3 className="card-title">Log In</h3>
          </div>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="identifier">Email or username</label>
              <input
                id="identifier"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="you@example.com or username"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <button className="button leather" type="submit" style={{ width: "100%", marginTop: 8 }}>
              <img src="/assets/vip/backs_1.png" alt="" className="leather-bg" />
              <span>Enter the Sanctum</span>
            </button>
            {status ? <p className="text-muted" style={{ marginTop: 8 }}>{status}</p> : null}
            <div style={{ textAlign: "center", marginTop: 12, fontSize: "0.82rem" }}>
              <a href="/auth/forgot" style={{ color: "var(--color-text-2)", textDecoration: "none" }}>Forgot password?</a>
              <span style={{ margin: "0 8px", color: "var(--color-text-muted)" }}>&bull;</span>
              <a href="/auth/register" style={{ color: "var(--color-gold)", textDecoration: "none" }}>Create account</a>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

export default LoginPage;
