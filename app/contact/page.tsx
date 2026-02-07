import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact The Chillers",
  description:
    "Get in touch with The Chillers clan. Reach out via Discord, email, or use our contact information for recruitment and general inquiries.",
  alternates: { canonical: "/contact" },
};

/**
 * Renders the Contact page for E-E-A-T compliance and trust building.
 */
function ContactPage(): JSX.Element {
  return (
    <>
      <div className="top-bar">
        <img src="/assets/vip/header_3.png" alt="Ornate page header" className="top-bar-bg" width={1200} height={56} loading="eager" />
        <div className="top-bar-inner">
          <div>
            <div className="top-bar-breadcrumb">TotalChiller &bull; Community</div>
            <h1 className="top-bar-title">Contact Us</h1>
          </div>
        </div>
      </div>
      <div className="content-inner">
        <div className="grid">
          {/* Contact Methods */}
          <section className="card" style={{ gridColumn: "span 2" }}>
            <div className="card-header">
              <div>
                <div className="card-title">Get In Touch</div>
                <div className="card-subtitle">Multiple ways to reach The Chillers</div>
              </div>
            </div>
            <div className="card-body" style={{ lineHeight: 1.7, fontSize: "0.9rem", paddingBottom: 0 }}>
              <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginBottom: 8 }}>
                Maintained by <strong>The Chillers Leadership Team</strong>
              </p>
              <p style={{ margin: 0 }}>
                We welcome messages from current members, prospective recruits, and anyone interested
                in learning more about our Total Battle community. Whether you have a question about
                joining, need technical support with the TotalChiller platform, or want to discuss
                partnership opportunities, we are happy to hear from you. Choose the contact method
                that works best for your situation below.
              </p>
            </div>
            <div className="list">
              <div className="list-item">
                <div>
                  <div style={{ fontWeight: 600 }}>Discord Server</div>
                  <div className="text-muted">
                    Our primary communication channel for real-time chat, strategy discussions, and
                    event coordination. This is the fastest way to reach active members and leadership.
                  </div>
                </div>
                <span className="badge">Preferred</span>
              </div>
              <div className="list-item">
                <div>
                  <div style={{ fontWeight: 600 }}>Email</div>
                  <div className="text-muted">
                    hello@chillers.gg — For formal inquiries, privacy requests, partnership proposals,
                    and any communication that requires a written record.
                  </div>
                </div>
                <span className="badge">Email</span>
              </div>
              <div className="list-item">
                <div>
                  <div style={{ fontWeight: 600 }}>In-Game Message</div>
                  <div className="text-muted">
                    Search for &quot;The Chillers&quot; in Total Battle and send a join request or
                    direct message to any officer. This is ideal if you want to see our alliance
                    profile before committing to registration.
                  </div>
                </div>
                <span className="badge">In-Game</span>
              </div>
            </div>
          </section>
          {/* Recruitment */}
          <section className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Join The Alliance</div>
                <div className="card-subtitle">Recruitment information</div>
              </div>
              <span className="badge">Recruiting</span>
            </div>
            <div className="card-body" style={{ lineHeight: 1.7, fontSize: "0.9rem" }}>
              <p>
                We are looking for active Total Battle players who value teamwork and consistent
                participation. Requirements include regular event attendance and willingness to
                coordinate with fellow members on strategy and resource management.
              </p>
              <p style={{ marginTop: 10 }}>
                Learn more about what we offer on our <Link href="/about" style={{ color: "var(--color-gold)" }}>About page</Link>,
                or visit the <Link href="/home" style={{ color: "var(--color-gold)" }}>home page</Link> for
                an overview of the community platform and its features.
              </p>
              <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
                <Link className="button primary" href="/auth/register">Apply for Membership</Link>
                <Link className="button" href="/auth/login">Existing Member Sign In</Link>
              </div>
            </div>
          </section>
          {/* Response Times */}
          <section className="card" style={{ gridColumn: "1 / -1" }}>
            <div className="card-header">
              <div>
                <div className="card-title">Response Times</div>
                <div className="card-subtitle">What to expect when reaching out</div>
              </div>
            </div>
            <div className="card-body" style={{ lineHeight: 1.7, fontSize: "0.9rem", paddingBottom: 0 }}>
              <p style={{ margin: 0 }}>
                We strive to respond to all inquiries promptly. Response times vary depending on the
                communication channel and the nature of the request. Below are our typical turnaround
                expectations for each method.
              </p>
            </div>
            <div className="list">
              <div className="list-item">
                <span>Discord messages — fastest for real-time questions</span>
                <span className="badge">Within hours</span>
              </div>
              <div className="list-item">
                <span>Email inquiries — formal questions and partnership proposals</span>
                <span className="badge">1-2 business days</span>
              </div>
              <div className="list-item">
                <span>Recruitment applications — reviewed by leadership</span>
                <span className="badge">24-48 hours</span>
              </div>
              <div className="list-item">
                <span>Privacy and information requests — as required by policy</span>
                <span className="badge">Within 30 days</span>
              </div>
            </div>
          </section>
          {/* FAQ */}
          <section className="card" style={{ gridColumn: "1 / -1" }}>
            <div className="card-header">
              <div>
                <div className="card-title">Frequently Asked Questions</div>
                <div className="card-subtitle">Common inquiries from visitors</div>
              </div>
            </div>
            <div className="card-body" style={{ lineHeight: 1.7, fontSize: "0.9rem" }}>
              <p style={{ margin: 0 }}>
                <strong>How do I join The Chillers?</strong> Start by{" "}
                <Link href="/auth/register" style={{ color: "var(--color-gold)" }}>creating an account</Link>.
                After email verification, an administrator will review the application and assign a division.
              </p>
              <p style={{ marginTop: 10 }}>
                <strong>I forgot my password. What should I do?</strong> Visit the{" "}
                <Link href="/auth/forgot" style={{ color: "var(--color-gold)" }}>password recovery page</Link> to
                request a secure reset link sent to the registered email address.
              </p>
              <p style={{ marginTop: 10 }}>
                <strong>Where can I learn more about the platform?</strong> The{" "}
                <Link href="/about" style={{ color: "var(--color-gold)" }}>About page</Link> explains our
                mission, values, and technology stack. For a general overview, visit the{" "}
                <Link href="/home" style={{ color: "var(--color-gold)" }}>home page</Link>.
              </p>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

export default ContactPage;
