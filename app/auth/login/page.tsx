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
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 40, gap: 24, maxWidth: 720, margin: "0 auto" }}>
      <section className="card" style={{ maxWidth: 440, width: "100%" }}>
        <div className="tooltip-head">
          <img src="/assets/vip/back_tooltip_2.png" alt="Card header decorative background" className="tooltip-head-bg" width={400} height={44} loading="lazy" />
          <div className="tooltip-head-inner">
            <img src="/assets/vip/batler_icons_star_4.png" alt="Login icon" width={18} height={18} loading="lazy" />
            <h1 className="card-title">Log In</h1>
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
              <img src="/assets/vip/backs_1.png" alt="Leather button texture" className="leather-bg" width={200} height={40} loading="lazy" />
              <span>Enter the Sanctum</span>
            </button>
            {status ? <p className="text-muted" style={{ marginTop: 8 }}>{status}</p> : null}
            <div style={{ textAlign: "center", marginTop: 12, fontSize: "0.82rem" }}>
              <a href="/auth/forgot" style={{ color: "var(--color-text-2)", textDecoration: "none" }}>Reset your forgotten password</a>
              <span style={{ margin: "0 8px", color: "var(--color-text-muted)" }}>&bull;</span>
              <a href="/auth/register" style={{ color: "var(--color-gold)", textDecoration: "none" }}>Create a new account</a>
            </div>
          </form>
        </div>
      </section>
      <section className="card" style={{ maxWidth: 440, width: "100%" }}>
        <div className="card-body" style={{ lineHeight: 1.7, fontSize: "0.85rem" }}>
          <h2 style={{ fontSize: "0.95rem", marginBottom: 8 }}>Welcome Back to The Chillers Hub</h2>
          <p style={{ margin: 0 }}>
            Sign in with an email address or username to access the full TotalChiller
            community platform. Once authenticated, members can view performance charts,
            coordinate war strategies, check event schedules, and read the latest
            announcements from leadership. The platform is designed to be fast, secure,
            and accessible from any device, so staying connected with the alliance is
            always convenient.
          </p>
          <p style={{ marginTop: 10 }}>
            TotalChiller is the dedicated management hub for The Chillers, a competitive
            Total Battle alliance focused on teamwork and strategic coordination. Our
            platform provides chest score tracking, automated leaderboards, an interactive
            event calendar, and a messaging system that keeps every member aligned and
            informed about upcoming activities.
          </p>
          <h3 style={{ fontSize: "0.88rem", marginTop: 12, marginBottom: 6 }}>What You Can Do After Signing In</h3>
          <ul style={{ paddingLeft: 18, margin: 0, fontSize: "0.82rem" }}>
            <li>View personal and alliance-wide performance analytics</li>
            <li>Track chest scores with historical trend charts</li>
            <li>Browse the event calendar and set reminders for upcoming wars</li>
            <li>Read pinned news and leadership announcements</li>
            <li>Update profile information, preferences, and notification settings</li>
            <li>Access the messaging system for direct communication with members</li>
            <li>Review data import history and validation reports</li>
          </ul>
          <h3 style={{ fontSize: "0.88rem", marginTop: 12, marginBottom: 6 }}>Secure Authentication</h3>
          <p style={{ margin: 0 }}>
            TotalChiller uses Supabase Auth for secure session management. All credentials
            are encrypted in transit and at rest, following industry best practices for
            web application security. The platform supports email-based login as well as
            username lookup, so members can sign in with whichever identifier they prefer.
            Sessions are maintained securely with HTTP-only cookies, and row-level security
            policies ensure that each member only accesses information relevant to their
            assigned division. If access has been lost, use the{" "}
            <a href="/auth/forgot" style={{ color: "var(--color-gold)" }}>password recovery page</a> to
            regain entry.
          </p>
          <p style={{ marginTop: 10 }}>
            New to The Chillers? <a href="/auth/register" style={{ color: "var(--color-gold)" }}>Create an account</a> to
            apply for membership. Visit the <a href="/about" style={{ color: "var(--color-gold)" }}>About page</a> to
            learn more about the community, or head to the <a href="/home" style={{ color: "var(--color-gold)" }}>home page</a> for
            an overview of what we offer. For any questions about access or membership,
            reach out through the <a href="/contact" style={{ color: "var(--color-gold)" }}>contact page</a>.
          </p>
        </div>
      </section>
    </div>
  );
}

export default LoginPage;
