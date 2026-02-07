import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "TotalChiller privacy policy — learn how we collect, use, and protect your personal data within The Chillers Total Battle community platform.",
  alternates: { canonical: "/privacy-policy" },
};

/**
 * Renders the privacy policy page for legal compliance and E-E-A-T.
 */
function PrivacyPolicyPage(): JSX.Element {
  const lastUpdated = "February 7, 2026";

  return (
    <>
      <div className="top-bar">
        <img src="/assets/vip/header_3.png" alt="" className="top-bar-bg" width={1200} height={56} loading="eager" />
        <div className="top-bar-inner">
          <div>
            <div className="top-bar-breadcrumb">TotalChiller &bull; Legal</div>
            <h1 className="top-bar-title">Privacy Policy</h1>
          </div>
        </div>
      </div>
      <div className="content-inner">
        <div className="grid">
          <section className="card" style={{ gridColumn: "1 / -1" }}>
            <div className="card-header">
              <div>
                <div className="card-title">Privacy Policy</div>
                <div className="card-subtitle">Last updated: {lastUpdated}</div>
              </div>
            </div>
            <div className="card-body" style={{ lineHeight: 1.7, fontSize: "0.9rem" }}>
              <h2 style={{ fontSize: "1rem", marginTop: 16 }}>1. Introduction</h2>
              <p>
                TotalChiller (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates a community hub for
                The Chillers Total Battle clan. This Privacy Policy explains how we collect, use, disclose,
                and safeguard your information when you use our platform at totalchiller.vercel.app.
              </p>
              <h2 style={{ fontSize: "1rem", marginTop: 16 }}>2. Information We Collect</h2>
              <p>We collect the following categories of personal data:</p>
              <ul style={{ paddingLeft: 20 }}>
                <li><strong>Account data</strong> — email address, username, and display name provided during registration.</li>
                <li><strong>Game data</strong> — in-game usernames and chest scores you submit or that are imported on your behalf.</li>
                <li><strong>Usage data</strong> — pages viewed, features used, and timestamps, collected automatically via server logs.</li>
                <li><strong>Authentication tokens</strong> — session cookies managed by Supabase Auth for secure sign-in.</li>
              </ul>
              <h2 style={{ fontSize: "1rem", marginTop: 16 }}>3. How We Use Your Information</h2>
              <p>Your data is used to:</p>
              <ul style={{ paddingLeft: 20 }}>
                <li>Provide and maintain the community platform and its features.</li>
                <li>Authenticate your identity and manage clan memberships.</li>
                <li>Display clan statistics, leaderboards, and event information.</li>
                <li>Send notifications about events, news, and system updates (based on your preferences).</li>
                <li>Improve the platform through aggregated, anonymized analytics.</li>
              </ul>
              <h2 style={{ fontSize: "1rem", marginTop: 16 }}>4. Data Storage and Security</h2>
              <p>
                All data is stored in Supabase-managed PostgreSQL databases with row-level security policies.
                Data in transit is encrypted via TLS. We implement security headers including Content-Security-Policy,
                Strict-Transport-Security, and X-Frame-Options to protect against common web attacks.
              </p>
              <h2 style={{ fontSize: "1rem", marginTop: 16 }}>5. Third-Party Services</h2>
              <p>We use the following third-party services:</p>
              <ul style={{ paddingLeft: 20 }}>
                <li><strong>Supabase</strong> — authentication, database, and real-time features.</li>
                <li><strong>Vercel</strong> — hosting and deployment.</li>
              </ul>
              <p>These providers have their own privacy policies governing the data they process.</p>
              <h2 style={{ fontSize: "1rem", marginTop: 16 }}>6. Your Rights</h2>
              <p>You have the right to:</p>
              <ul style={{ paddingLeft: 20 }}>
                <li>Access, correct, or delete your personal data via the Settings page.</li>
                <li>Export your data upon request.</li>
                <li>Withdraw consent for optional data processing at any time.</li>
                <li>Lodge a complaint with a supervisory authority if you believe your data rights have been violated.</li>
              </ul>
              <h2 style={{ fontSize: "1rem", marginTop: 16 }}>7. Data Retention</h2>
              <p>
                We retain your account data for as long as your account is active. Game data and scores are retained
                for clan analytics purposes. You may request full data deletion by contacting us.
              </p>
              <h2 style={{ fontSize: "1rem", marginTop: 16 }}>8. Cookies</h2>
              <p>
                We use essential cookies for authentication session management. We do not use tracking or advertising cookies.
              </p>
              <h2 style={{ fontSize: "1rem", marginTop: 16 }}>9. Contact</h2>
              <p>
                For privacy-related questions or data requests, please visit our{" "}
                <Link href="/contact" style={{ color: "var(--color-gold)" }}>Contact page</Link> or
                reach out via Discord.
              </p>
              <h2 style={{ fontSize: "1rem", marginTop: 16 }}>10. Changes to This Policy</h2>
              <p>
                We may update this policy from time to time. The &quot;Last updated&quot; date at the top of this page
                reflects the most recent revision. Continued use of the platform constitutes acceptance of any changes.
              </p>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

export default PrivacyPolicyPage;
