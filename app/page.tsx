import AuthActions from "./components/auth-actions";
import ClanScopeBanner from "./components/clan-scope-banner";

/**
 * Renders the dashboard landing page layout.
 */
function HomePage(): JSX.Element {
  return (
    <>
      <section className="header header-inline">
        <div className="title">Community Dashboard</div>
        <div className="actions">
          <span className="badge">Rank: Officer</span>
          <button className="button">Notifications</button>
          <button className="button primary">New Post</button>
          <AuthActions />
        </div>
      </section>
      <div className="grid">
        <ClanScopeBanner />
        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Announcements</div>
              <div className="card-subtitle">Pinned updates for your clan</div>
            </div>
            <div className="badge">Pinned</div>
          </div>
          <div className="list">
            <div className="list-item">
              <span>War prep tonight at 21:00</span>
              <span className="badge">Priority</span>
            </div>
            <div className="list-item">
              <span>Chest upload deadline Friday</span>
              <span className="badge">Info</span>
            </div>
          </div>
        </section>
        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">News Feed</div>
              <div className="card-subtitle">Latest updates from your clan</div>
            </div>
            <div className="tabs">
              <div className="tab active">All</div>
              <div className="tab">Clan</div>
              <div className="tab">Global</div>
            </div>
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
            <div className="list-item">
              <span>War report and highlights</span>
              <span className="badge">Pinned</span>
            </div>
          </div>
        </section>
        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Quick Stats</div>
              <div className="card-subtitle">Personal and clan highlights</div>
            </div>
            <button className="button">View Charts</button>
          </div>
          <div className="list">
            <div className="list-item">
              <span>Personal Score (7d)</span>
              <strong>12,450</strong>
            </div>
            <div className="list-item">
              <span>Clan Score (7d)</span>
              <strong>210,980</strong>
            </div>
            <div className="list-item">
              <span>Top Chest Type</span>
              <strong>Warrior</strong>
            </div>
          </div>
        </section>
        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Clan Progress</div>
              <div className="card-subtitle">Weekly targets and status</div>
            </div>
            <button className="button">View Details</button>
          </div>
          <div className="list">
            <div className="list-item">
              <span>Chest submissions</span>
              <strong>78 / 90</strong>
            </div>
            <div className="list-item">
              <span>Event readiness</span>
              <strong>86%</strong>
            </div>
            <div className="list-item">
              <span>Top contributors</span>
              <strong>12 members</strong>
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="card-title">Quick Links</div>
          <div className="list">
            <button className="button primary" type="button">
              Upload CSV
            </button>
            <button className="button" type="button">
              Review Rules
            </button>
            <button className="button" type="button">
              Event Calendar
            </button>
          </div>
        </section>
        <section className="panel">
          <div className="card-title">Upcoming Events</div>
          <div className="list">
            <div className="list-item">
              <span>War Prep</span>
              <span className="badge">Today 20:30</span>
            </div>
            <div className="list-item">
              <span>Guild Meeting</span>
              <span className="badge">Feb 5</span>
            </div>
            <div className="list-item">
              <span>Training Night</span>
              <span className="badge">Feb 18</span>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

export default HomePage;
