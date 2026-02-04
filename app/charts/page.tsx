import AuthActions from "../components/auth-actions";

/**
 * Renders the charts and stats page shell.
 */
function ChartsPage(): JSX.Element {
  return (
    <>
      <section className="header header-inline">
        <div className="title">Charts & Stats</div>
        <div className="actions">
          <button className="button">Date Range</button>
          <button className="button">Filter</button>
          <button className="button primary">Export</button>
          <AuthActions />
        </div>
      </section>
      <div className="grid">
        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Clan Score Over Time</div>
              <div className="card-subtitle">Last 30 days</div>
            </div>
            <span className="badge">Line</span>
          </div>
          <div className="list">
            <div className="list-item">
              <span>Chart placeholder</span>
              <span className="badge">Line</span>
            </div>
          </div>
        </section>
        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Top Players</div>
              <div className="card-subtitle">Total score</div>
            </div>
            <span className="badge">Bar</span>
          </div>
          <div className="list">
            <div className="list-item">
              <span>Chart placeholder</span>
              <span className="badge">Bar</span>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

export default ChartsPage;
