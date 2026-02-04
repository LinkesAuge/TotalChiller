import AuthActions from "../components/auth-actions";

/**
 * Renders the public landing page layout.
 */
function HomePage(): JSX.Element {
  return (
    <>
      <section className="header header-inline">
        <div className="title">The Chillers Community</div>
        <div className="actions">
          <a className="button" href="/auth/login">
            Login
          </a>
          <a className="button primary" href="/auth/register">
            Register
          </a>
          <AuthActions />
        </div>
      </section>
      <div className="grid">
        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Clan Mission</div>
              <div className="card-subtitle">Coordinated, competitive, welcoming</div>
            </div>
            <span className="badge">Recruiting</span>
          </div>
          <p>
            The Chillers are a focused Total Battle clan built around teamwork,
            planning, and data-driven play. Join us for active events, shared
            strategy, and a modern hub to stay connected.
          </p>
        </section>
        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Why Join</div>
              <div className="card-subtitle">Highlights for new members</div>
            </div>
            <a className="button" href="/auth/register">
              Apply
            </a>
          </div>
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
        </section>
        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Public News</div>
              <div className="card-subtitle">Latest announcements</div>
            </div>
            <span className="badge">Public</span>
          </div>
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
        </section>
        <section className="panel">
          <div className="card-title">Contact</div>
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
        </section>
      </div>
    </>
  );
}

export default HomePage;
