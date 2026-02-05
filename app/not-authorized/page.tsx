import AuthActions from "../components/auth-actions";

/**
 * Renders the unauthorized access page.
 */
function NotAuthorizedPage(): JSX.Element {
  return (
    <>
      <section className="header header-inline">
        <div className="title">Not Authorized</div>
        <div className="actions">
          <span className="badge">Admin Access</span>
          <AuthActions />
        </div>
      </section>
      <div className="grid">
        <div className="alert warn" style={{ gridColumn: "span 12" }}>
          You do not have permission to view this page. Contact a clan owner or admin if you need access.
        </div>
        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">What you can do</div>
              <div className="card-subtitle">Return to member areas or request access</div>
            </div>
          </div>
          <div className="list">
            <a className="button primary" href="/home">
              Go to Home
            </a>
            <a className="button" href="/">
              Open Dashboard
            </a>
            <a className="button" href="/settings">
              Account Settings
            </a>
          </div>
        </section>
      </div>
    </>
  );
}

export default NotAuthorizedPage;
