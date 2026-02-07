import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy & Data Protection",
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
        <img src="/assets/vip/header_3.png" alt="Ornate page header" className="top-bar-bg" width={1200} height={56} loading="eager" />
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
              <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginBottom: 8 }}>
                Published by <strong>The Chillers Leadership Team</strong>
              </p>
              <h2 style={{ fontSize: "1rem", marginTop: 16 }}>1. Introduction</h2>
              <p>
                TotalChiller (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates a community hub for
                The Chillers Total Battle clan. This Privacy Policy explains how we collect, use, disclose,
                and safeguard your information when you use our platform at totalchiller.vercel.app.
              </p>
              <h2 style={{ fontSize: "1rem", marginTop: 16 }}>2. Information We Collect</h2>
              <p>We collect the following categories of personal information:</p>
              <ul style={{ paddingLeft: 20 }}>
                <li><strong>Account details</strong> — email address, username, and display name provided during registration.</li>
                <li><strong>Game records</strong> — in-game usernames and chest scores submitted or imported on a member&apos;s behalf.</li>
                <li><strong>Usage activity</strong> — pages viewed, features used, and timestamps, collected automatically via server logs.</li>
                <li><strong>Authentication tokens</strong> — session cookies managed by Supabase Auth for secure sign-in.</li>
              </ul>
              <h2 style={{ fontSize: "1rem", marginTop: 16 }}>3. How We Use Collected Information</h2>
              <p>The information we gather is used to:</p>
              <ul style={{ paddingLeft: 20 }}>
                <li>Provide and maintain the community platform and its features.</li>
                <li>Verify member identity and manage alliance memberships.</li>
                <li>Display statistics, leaderboards, and event schedules.</li>
                <li>Send notifications about events, news, and system updates (based on member preferences).</li>
                <li>Improve the platform through aggregated, anonymized analytics.</li>
              </ul>
              <h2 style={{ fontSize: "1rem", marginTop: 16 }}>4. Storage and Security Measures</h2>
              <p>
                All records are stored in Supabase-managed PostgreSQL databases with row-level security policies.
                Information in transit is encrypted via TLS. We implement security headers including Content-Security-Policy,
                Strict-Transport-Security, and X-Frame-Options to protect against common web attacks.
              </p>
              <h2 style={{ fontSize: "1rem", marginTop: 16 }}>5. Third-Party Services</h2>
              <p>We use the following third-party services:</p>
              <ul style={{ paddingLeft: 20 }}>
                <li><strong>Supabase</strong> — authentication, database, and real-time features.</li>
                <li><strong>Vercel</strong> — hosting and deployment.</li>
              </ul>
              <p>These providers have their own privacy policies governing the data they process.</p>
              <h2 style={{ fontSize: "1rem", marginTop: 16 }}>6. Member Rights</h2>
              <p>Every member has the right to:</p>
              <ul style={{ paddingLeft: 20 }}>
                <li>Access, correct, or delete personal information via the Settings page.</li>
                <li>Export account records upon request.</li>
                <li>Withdraw consent for optional processing at any time.</li>
                <li>Lodge a complaint with a supervisory authority if rights have been violated.</li>
              </ul>
              <h2 style={{ fontSize: "1rem", marginTop: 16 }}>7. Retention Period</h2>
              <p>
                We retain account information for as long as the account remains active. Game records and
                scores are kept for alliance analytics purposes. Members may request full deletion of
                their information by contacting us through the methods described below.
              </p>
              <h2 style={{ fontSize: "1rem", marginTop: 16 }}>8. Cookies</h2>
              <p>
                We use essential cookies for authentication session management. We do not use tracking or advertising cookies.
              </p>
              <h2 style={{ fontSize: "1rem", marginTop: 16 }}>9. Contact</h2>
              <p>
                For privacy-related questions or information requests, please visit our{" "}
                <Link href="/contact" style={{ color: "var(--color-gold)" }}>Contact page</Link> or
                reach out via Discord. You can also return to the{" "}
                <Link href="/home" style={{ color: "var(--color-gold)" }}>home page</Link> for
                general information about the platform.
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
