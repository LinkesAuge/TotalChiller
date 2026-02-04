import AuthActions from "../components/auth-actions";

/**
 * Renders the events calendar page shell.
 */
function EventsPage(): JSX.Element {
  return (
    <>
      <section className="header header-inline">
        <div className="title">Clan Events</div>
        <div className="actions">
          <button className="button">Month</button>
          <button className="button">Week</button>
          <button className="button primary">Create Event</button>
          <AuthActions />
        </div>
      </section>
      <div className="grid">
        <section className="card" style={{ gridColumn: "span 12" }}>
          <div className="card-header">
            <div>
              <div className="card-title">February 2026</div>
              <div className="card-subtitle">Chillers Clan Calendar</div>
            </div>
            <span className="badge">All Events</span>
          </div>
          <div className="list">
            <div className="list-item">
              <span>War Prep</span>
              <span className="badge">Feb 1 • 20:30</span>
            </div>
            <div className="list-item">
              <span>Guild Meeting</span>
              <span className="badge">Feb 5 • 19:00</span>
            </div>
            <div className="list-item">
              <span>Training</span>
              <span className="badge">Feb 18 • 20:00</span>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

export default EventsPage;
