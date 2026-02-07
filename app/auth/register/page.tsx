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
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 40, gap: 24, maxWidth: 720, margin: "0 auto" }}>
      <section className="card" style={{ maxWidth: 480, width: "100%" }}>
        <div className="tooltip-head">
          <img src="/assets/vip/back_tooltip_2.png" alt="Card header decorative background" className="tooltip-head-bg" width={400} height={44} loading="lazy" />
          <div className="tooltip-head-inner">
            <img src="/assets/vip/batler_icons_star_4.png" alt="Registration icon" width={18} height={18} loading="lazy" />
            <h1 className="card-title">Create Account</h1>
          </div>
        </div>
        <div className="card-body">
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
            <button className="button leather" type="submit" style={{ width: "100%", marginTop: 8 }}>
              <img src="/assets/vip/backs_1.png" alt="Leather button texture" className="leather-bg" width={200} height={40} loading="lazy" />
              <span>Create Account</span>
            </button>
            {formState.status ? <p className="text-muted" style={{ marginTop: 8 }}>{formState.status}</p> : null}
            <div style={{ textAlign: "center", marginTop: 12, fontSize: "0.82rem" }}>
              Already have an account? <a href="/auth/login" style={{ color: "var(--color-gold)", textDecoration: "none" }}>Sign in to your existing account</a>
            </div>
          </form>
        </div>
      </section>
      <section className="card" style={{ maxWidth: 480, width: "100%" }}>
        <div className="card-body" style={{ lineHeight: 1.7, fontSize: "0.85rem" }}>
          <h2 style={{ fontSize: "0.95rem", marginBottom: 8 }}>Join The Chillers Community</h2>
          <p style={{ margin: 0 }}>
            Create an account to apply for membership in The Chillers, a competitive
            Total Battle alliance that values teamwork, strategic planning, and active
            participation. Registration is the first step toward accessing our full
            suite of community tools and resources. The TotalChiller platform provides
            everything needed to coordinate with fellow members and track progress
            toward shared goals.
          </p>
          <h3 style={{ fontSize: "0.88rem", marginTop: 12, marginBottom: 6 }}>What Happens After Registration</h3>
          <p style={{ margin: 0 }}>
            After creating an account, a verification email will be sent to the provided
            address. Once the email is verified, an administrator reviews the application
            and assigns the new member to the appropriate division within the alliance.
            This review process typically takes 24 to 48 hours, and a confirmation email
            is sent once the application has been approved. Upon approval, the full
            TotalChiller platform becomes accessible immediately.
          </p>
          <h3 style={{ fontSize: "0.88rem", marginTop: 12, marginBottom: 6 }}>Member Benefits</h3>
          <ul style={{ paddingLeft: 18, margin: 0, fontSize: "0.82rem" }}>
            <li>Access performance analytics and personal chest score history</li>
            <li>Participate in coordinated war strategies and training sessions</li>
            <li>Receive real-time news, event notifications, and leadership updates</li>
            <li>Use the interactive event calendar with countdown timers</li>
            <li>Connect with fellow players through the messaging system</li>
            <li>Review charts and leaderboards showing individual and group trends</li>
            <li>Manage profile settings, display names, and notification preferences</li>
          </ul>
          <h3 style={{ fontSize: "0.88rem", marginTop: 12, marginBottom: 6 }}>Registration Requirements</h3>
          <p style={{ margin: 0 }}>
            All new accounts require a valid email address for verification, a unique username
            between 2 and 32 characters, and a secure password. After email verification,
            an administrator reviews the application and assigns the appropriate division.
            Existing members can reset forgotten passwords via the{" "}
            <a href="/auth/forgot" style={{ color: "var(--color-gold)" }}>password recovery page</a>.
          </p>
          <p style={{ marginTop: 10 }}>
            Want to learn more before signing up? Visit the <a href="/home" style={{ color: "var(--color-gold)" }}>home page</a> for
            an overview, read the <a href="/about" style={{ color: "var(--color-gold)" }}>About page</a> to understand our
            mission and values, or <a href="/contact" style={{ color: "var(--color-gold)" }}>contact us</a> with any questions.
            We also encourage reviewing the <a href="/privacy-policy" style={{ color: "var(--color-gold)" }}>privacy policy</a> to
            understand how member information is collected, stored, and protected.
          </p>
        </div>
      </section>
    </div>
  );
}

export default RegisterPage;
