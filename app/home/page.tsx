import type { Metadata } from "next";
import PublicAuthActions from "../components/public-auth-actions";

export const metadata: Metadata = {
  title: "The Chillers Community Hub",
  description:
    "Welcome to The Chillers — a focused Total Battle clan built around teamwork, planning, and data-driven play. Join our community hub.",
  alternates: { canonical: "/home" },
};

/**
 * Renders the public landing page with Sanctum medieval hero design.
 */
function HomePage(): JSX.Element {
  return (
    <>
      {/* Ornate top bar */}
      <div className="top-bar">
        <img src="/assets/vip/header_3.png" alt="Ornate page header" className="top-bar-bg" width={1200} height={56} loading="eager" />
        <div className="top-bar-inner">
          <div>
            <h1 className="top-bar-title">The Chillers Community</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <PublicAuthActions />
          </div>
        </div>
      </div>

      {/* Hero banner */}
      <div className="hero-banner">
        <div className="hero-overlay" />
        <img
          src="/assets/banners/banner_gold_dragon.webp"
          alt="The Chillers clan hero banner featuring a golden dragon"
          className="hero-bg"
          width={1200}
          height={300}
          loading="eager"
          fetchPriority="high"
        />
        <img
          src="/assets/vip/decor_light_1.png"
          alt="Ambient hero light effect"
          className="hero-light"
          width={400}
          height={400}
          loading="eager"
        />
        <div className="hero-content">
          <img
            src="/assets/vip/components_decor_6.png"
            alt="Ornamental horizontal rule"
            className="hero-decor"
            width={300}
            height={20}
            loading="lazy"
          />
          <h2 className="hero-title">The Chillers</h2>
          <p className="hero-subtitle">
            Coordinated. Competitive. Welcoming.
          </p>
          <img
            src="/assets/vip/components_decor_6.png"
            alt="Ornamental horizontal rule"
            className="hero-decor flipped"
            width={300}
            height={20}
            loading="lazy"
          />
        </div>
      </div>

      <div className="content-inner">
        <div className="grid">
          {/* Clan Mission */}
          <section className="card" style={{ gridColumn: "span 2" }}>
            <div className="tooltip-head">
              <img
                src="/assets/vip/back_tooltip_2.png"
                alt="Card header decorative background"
                className="tooltip-head-bg"
                width={400}
                height={44}
                loading="lazy"
              />
              <div className="tooltip-head-inner">
                <img
                  src="/assets/vip/batler_icons_stat_damage.png"
                  alt="Clan mission icon"
                  width={18}
                  height={18}
                  loading="lazy"
                />
                <h3 className="card-title">Clan Mission</h3>
                <span className="pin-badge">Recruiting</span>
              </div>
            </div>
            <div className="card-body">
              <p style={{ margin: 0 }}>
                The Chillers are a focused Total Battle alliance built around
                teamwork, planning, and informed play. Our mission is to create a
                community where every member contributes to collective success through
                coordination, strategy, and active participation in group events.
              </p>
              <p style={{ margin: "12px 0 0" }}>
                Founded on the principle that organized teams outperform disorganized ones,
                we built TotalChiller as a custom platform to track chest scores, coordinate
                war preparations, manage event calendars, and keep every member informed
                with real-time news and announcements. Whether you are a seasoned veteran
                or a new recruit, our tools help you contribute meaningfully to the group.
              </p>
            </div>
          </section>

          {/* Why Join */}
          <section className="card">
            <div className="card-header">
              <h3 className="card-title">Why Join The Chillers</h3>
              <a className="button primary" href="/auth/register">
                Apply Now
              </a>
            </div>
            <div className="card-body">
              <p style={{ margin: "0 0 12px", fontSize: "0.88rem" }}>
                We offer a structured, supportive environment for Total Battle players
                who want to compete at a higher level while enjoying the social aspect
                of alliance gameplay.
              </p>
              <div className="list">
                <div className="list-item">
                  <span>Weekly war coordination and strategy sessions</span>
                  <span className="badge">Active</span>
                </div>
                <div className="list-item">
                  <span>Automated chest score tracking with performance insights</span>
                  <span className="badge">Insights</span>
                </div>
                <div className="list-item">
                  <span>Interactive event calendar with countdown timers</span>
                  <span className="badge">Calendar</span>
                </div>
                <div className="list-item">
                  <span>Real-time clan news and pinned announcements</span>
                  <span className="badge">News</span>
                </div>
                <div className="list-item">
                  <span>Charts and analytics for individual and clan performance</span>
                  <span className="badge">Analytics</span>
                </div>
              </div>
            </div>
          </section>

          {/* Public News */}
          <section className="card">
            <div className="card-header">
              <h3 className="card-title">Public News</h3>
              <span className="badge">Public</span>
            </div>
            <div className="card-body">
              <p style={{ margin: "0 0 12px", fontSize: "0.88rem" }}>
                Stay informed about what is happening in The Chillers community.
                Latest updates and recruitment announcements are posted here.
              </p>
              <div className="list">
                <div className="list-item">
                  <span>Recruitment window opens this week for new members</span>
                  <span className="badge">News</span>
                </div>
                <div className="list-item">
                  <span>Alliance tournament update and results posted</span>
                  <span className="badge">Info</span>
                </div>
                <div className="list-item">
                  <span>Platform update with new chart features and improved data imports</span>
                  <span className="badge">Update</span>
                </div>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="card" style={{ gridColumn: "span 2" }}>
            <div className="card-header">
              <h3 className="card-title">How TotalChiller Works</h3>
            </div>
            <div className="card-body">
              <p style={{ margin: "0 0 12px", fontSize: "0.88rem" }}>
                TotalChiller is a purpose-built community hub that brings together everything
                our members need in one place. Players can upload chest report information, which is
                automatically validated and stored for analysis. The platform generates
                performance charts showing individual scores, alliance trends, and top player
                leaderboards. Our event calendar keeps everyone aligned on war schedules,
                training sessions, and guild meetings. Leaders use the admin panel for
                user management, validation rules, and approval workflows.
              </p>
              <p style={{ margin: "12px 0 0", fontSize: "0.88rem" }}>
                All records are secured with row-level security policies, ensuring members
                only access information relevant to their division. The platform is built with
                modern web technologies including Next.js, TypeScript, and Supabase,
                delivering a fast, reliable experience on any device.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="card" style={{ gridColumn: "span 2" }}>
            <div className="card-header">
              <h3 className="card-title">Contact The Chillers</h3>
            </div>
            <div className="card-body">
              <p style={{ margin: "0 0 12px", fontSize: "0.88rem" }}>
                Want to reach out? Connect with us through Discord for real-time
                communication, or send an email for formal inquiries and recruitment questions.
              </p>
              <div className="list">
                <div className="list-item">
                  <span>Discord — primary communication channel for real-time coordination</span>
                  <span className="badge">Invite</span>
                </div>
                <div className="list-item">
                  <span>Email — hello@chillers.gg for formal inquiries</span>
                  <span className="badge">Email</span>
                </div>
              </div>
              <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
                <a className="button primary" href="/auth/register">Join The Chillers</a>
                <a className="button" href="/about">Learn More About Us</a>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

export default HomePage;
