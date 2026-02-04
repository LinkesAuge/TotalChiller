import AuthActions from "../components/auth-actions";

/**
 * Renders the messaging page shell.
 */
function MessagesPage(): JSX.Element {
  return (
    <>
      <section className="header header-inline">
        <div className="title">Messages</div>
        <div className="actions">
          <button className="button">New Message</button>
          <button className="button primary">Broadcast</button>
          <AuthActions />
        </div>
      </section>
      <div className="grid">
        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Inbox</div>
              <div className="card-subtitle">Recent conversations</div>
            </div>
            <span className="badge">3 New</span>
          </div>
          <div className="list">
            <div className="list-item">
              <span>Klaus</span>
              <span className="badge">War prep</span>
            </div>
            <div className="list-item">
              <span>Sabine</span>
              <span className="badge">CSV uploaded</span>
            </div>
            <div className="list-item">
              <span>Max</span>
              <span className="badge">Rules help</span>
            </div>
          </div>
        </section>
        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Thread</div>
              <div className="card-subtitle">Klaus</div>
            </div>
            <span className="badge">Active</span>
          </div>
          <div className="list">
            <div className="list-item">
              <span>Can you confirm the war prep times?</span>
              <span className="badge">10:12</span>
            </div>
            <div className="list-item">
              <span>Yes, 20:30 planning and 21:00 launch.</span>
              <span className="badge">10:14</span>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

export default MessagesPage;
