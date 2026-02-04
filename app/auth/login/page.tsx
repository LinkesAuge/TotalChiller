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
    <section className="card" style={{ maxWidth: 520 }}>
      <div className="card-header">
        <div>
          <div className="card-title">Log In</div>
          <div className="card-subtitle">Access your clan dashboard</div>
        </div>
      </div>
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
        <div className="list">
          <button className="button primary" type="submit">
            Sign In
          </button>
        </div>
        {status ? <p className="text-muted">{status}</p> : null}
      </form>
    </section>
  );
}

export default LoginPage;
