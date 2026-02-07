import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact The Chillers",
  description:
    "Get in touch with The Chillers clan. Reach out via Discord, email, or use our contact information for recruitment and general inquiries.",
};

/**
 * Renders the Contact page for E-E-A-T compliance and trust building.
 */
function ContactPage(): JSX.Element {
  return (
    <>
      <div className="top-bar">
        <img src="/assets/vip/header_3.png" alt="" className="top-bar-bg" width={1200} height={56} loading="eager" />
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
            <div className="list">
              <div className="list-item">
                <div>
                  <div style={{ fontWeight: 600 }}>Discord</div>
                  <div className="text-muted">Our primary communication channel for real-time chat and coordination.</div>
                </div>
                <span className="badge">Preferred</span>
              </div>
              <div className="list-item">
                <div>
                  <div style={{ fontWeight: 600 }}>Email</div>
                  <div className="text-muted">hello@chillers.gg — For formal inquiries and data requests.</div>
                </div>
                <span className="badge">Email</span>
              </div>
              <div className="list-item">
                <div>
                  <div style={{ fontWeight: 600 }}>In-Game</div>
                  <div className="text-muted">Search for &quot;The Chillers&quot; in Total Battle and send a join request.</div>
                </div>
                <span className="badge">In-Game</span>
              </div>
            </div>
          </section>
          {/* Recruitment */}
          <section className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Join The Clan</div>
                <div className="card-subtitle">Recruitment information</div>
              </div>
              <span className="badge">Recruiting</span>
            </div>
            <div className="card-body" style={{ lineHeight: 1.7, fontSize: "0.9rem" }}>
              <p>
                We&apos;re looking for active Total Battle players who value teamwork and consistent participation.
                Requirements include regular event attendance and willingness to coordinate with the clan.
              </p>
              <div style={{ marginTop: 16 }}>
                <Link className="button primary" href="/auth/register">Apply Now</Link>
              </div>
            </div>
          </section>
          {/* Response Times */}
          <section className="card" style={{ gridColumn: "1 / -1" }}>
            <div className="card-header">
              <div>
                <div className="card-title">Response Times</div>
                <div className="card-subtitle">What to expect</div>
              </div>
            </div>
            <div className="list">
              <div className="list-item">
                <span>Discord messages</span>
                <span className="badge">Within hours</span>
              </div>
              <div className="list-item">
                <span>Email inquiries</span>
                <span className="badge">1-2 business days</span>
              </div>
              <div className="list-item">
                <span>Recruitment applications</span>
                <span className="badge">24-48 hours</span>
              </div>
              <div className="list-item">
                <span>Privacy / data requests</span>
                <span className="badge">Within 30 days</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

export default ContactPage;
