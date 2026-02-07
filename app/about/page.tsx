import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About The Chillers",
  description:
    "Learn about The Chillers — a competitive Total Battle clan focused on teamwork, data-driven strategy, and community building.",
  alternates: { canonical: "/about" },
};

/**
 * Renders the About page for E-E-A-T compliance and trust building.
 */
function AboutPage(): JSX.Element {
  return (
    <>
      <div className="top-bar">
        <img src="/assets/vip/header_3.png" alt="" className="top-bar-bg" width={1200} height={56} loading="eager" />
        <div className="top-bar-inner">
          <div>
            <div className="top-bar-breadcrumb">TotalChiller &bull; Community</div>
            <h1 className="top-bar-title">About The Chillers</h1>
          </div>
        </div>
      </div>
      <div className="content-inner">
        <div className="grid">
          {/* Mission */}
          <section className="card" style={{ gridColumn: "1 / -1" }}>
            <div className="card-header">
              <div>
                <div className="card-title">Our Mission</div>
                <div className="card-subtitle">Why we built TotalChiller</div>
              </div>
            </div>
            <div className="card-body" style={{ lineHeight: 1.7, fontSize: "0.9rem" }}>
              <p>
                The Chillers are a dedicated Total Battle clan that believes in coordinated play,
                data-driven decision making, and a welcoming community. TotalChiller is our custom-built
                platform that helps us stay organized, track performance, and communicate effectively.
              </p>
              <p style={{ marginTop: 12 }}>
                We created this platform because off-the-shelf tools didn't meet the specific needs of
                a competitive Total Battle clan. From real-time chest score tracking to automated event
                coordination, every feature was designed by clan members, for clan members.
              </p>
            </div>
          </section>
          {/* What We Do */}
          <section className="card">
            <div className="card-header">
              <div>
                <div className="card-title">What We Do</div>
                <div className="card-subtitle">Platform features</div>
              </div>
            </div>
            <div className="list">
              <div className="list-item">
                <span>Chest Score Tracking</span>
                <span className="badge">Analytics</span>
              </div>
              <div className="list-item">
                <span>Event Coordination</span>
                <span className="badge">Calendar</span>
              </div>
              <div className="list-item">
                <span>Clan News &amp; Announcements</span>
                <span className="badge">Communication</span>
              </div>
              <div className="list-item">
                <span>Data Import &amp; Validation</span>
                <span className="badge">Admin</span>
              </div>
              <div className="list-item">
                <span>Charts &amp; Performance Insights</span>
                <span className="badge">Intelligence</span>
              </div>
            </div>
          </section>
          {/* Values */}
          <section className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Our Values</div>
                <div className="card-subtitle">What drives us</div>
              </div>
            </div>
            <div className="list">
              <div className="list-item">
                <span>Teamwork over individual glory</span>
              </div>
              <div className="list-item">
                <span>Transparency in all decisions</span>
              </div>
              <div className="list-item">
                <span>Data-informed strategy</span>
              </div>
              <div className="list-item">
                <span>Respect and inclusivity</span>
              </div>
              <div className="list-item">
                <span>Continuous improvement</span>
              </div>
            </div>
          </section>
          {/* Technology */}
          <section className="card" style={{ gridColumn: "1 / -1" }}>
            <div className="card-header">
              <div>
                <div className="card-title">Built With</div>
                <div className="card-subtitle">Our technology stack</div>
              </div>
            </div>
            <div className="card-body" style={{ lineHeight: 1.7, fontSize: "0.9rem" }}>
              <p>
                TotalChiller is built with <strong>Next.js</strong> and <strong>TypeScript</strong> on the frontend,
                powered by <strong>Supabase</strong> for authentication, real-time data, and PostgreSQL storage.
                The platform is deployed on <strong>Vercel</strong> for optimal performance and global availability.
              </p>
              <p style={{ marginTop: 12 }}>
                We follow modern web best practices including responsive design, accessibility standards (WCAG),
                progressive enhancement, and security-first architecture with row-level security policies.
              </p>
            </div>
          </section>
          {/* CTA */}
          <section className="card" style={{ gridColumn: "1 / -1", textAlign: "center" }}>
            <div className="card-body">
              <p style={{ fontSize: "0.9rem", marginBottom: 16 }}>
                Interested in joining The Chillers? We're always looking for dedicated players.
              </p>
              <div className="list inline" style={{ justifyContent: "center" }}>
                <Link className="button primary" href="/auth/register">Apply Now</Link>
                <Link className="button" href="/contact">Contact Us</Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

export default AboutPage;
