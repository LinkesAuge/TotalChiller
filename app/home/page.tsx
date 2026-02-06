import PublicAuthActions from "../components/public-auth-actions";

/**
 * Renders the public landing page with Sanctum medieval hero design.
 */
function HomePage(): JSX.Element {
  return (
    <>
      {/* Ornate top bar */}
      <div className="top-bar">
        <img src="/assets/vip/header_3.png" alt="" className="top-bar-bg" />
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
          src="/assets/banners/banner_gold_dragon.png"
          alt=""
          className="hero-bg"
        />
        <img
          src="/assets/vip/decor_light_1.png"
          alt=""
          className="hero-light"
        />
        <div className="hero-content">
          <img
            src="/assets/vip/components_decor_6.png"
            alt=""
            className="hero-decor"
          />
          <h2 className="hero-title">The Chillers</h2>
          <p className="hero-subtitle">
            Coordinated. Competitive. Welcoming.
          </p>
          <img
            src="/assets/vip/components_decor_6.png"
            alt=""
            className="hero-decor flipped"
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
                alt=""
                className="tooltip-head-bg"
              />
              <div className="tooltip-head-inner">
                <img
                  src="/assets/vip/batler_icons_stat_damage.png"
                  alt=""
                  style={{ width: 18, height: 18 }}
                />
                <h3 className="card-title">Clan Mission</h3>
                <span className="pin-badge">Recruiting</span>
              </div>
            </div>
            <div className="card-body">
              <p style={{ margin: 0 }}>
                The Chillers are a focused Total Battle clan built around
                teamwork, planning, and data-driven play. Join us for active
                events, shared strategy, and a modern hub to stay connected.
              </p>
            </div>
          </section>

          {/* Why Join */}
          <section className="card">
            <div className="card-header">
              <h3 className="card-title">Why Join</h3>
              <a className="button primary" href="/auth/register">
                Apply
              </a>
            </div>
            <div className="card-body">
              <div className="list">
                <div className="list-item">
                  <span>Weekly coordination</span>
                  <span className="badge">Active</span>
                </div>
                <div className="list-item">
                  <span>Chest tracking</span>
                  <span className="badge">Insights</span>
                </div>
                <div className="list-item">
                  <span>Event planning</span>
                  <span className="badge">Calendar</span>
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
              <div className="list">
                <div className="list-item">
                  <span>Recruitment window opens this week</span>
                  <span className="badge">News</span>
                </div>
                <div className="list-item">
                  <span>Alliance update posted</span>
                  <span className="badge">Info</span>
                </div>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section className="card" style={{ gridColumn: "span 2" }}>
            <div className="card-header">
              <h3 className="card-title">Contact</h3>
            </div>
            <div className="card-body">
              <div className="list">
                <div className="list-item">
                  <span>Discord</span>
                  <span className="badge">Invite</span>
                </div>
                <div className="list-item">
                  <span>Email</span>
                  <span className="badge">hello@chillers.gg</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

export default HomePage;
