import type { Metadata } from "next";
import Link from "next/link";
import AuthActions from "../components/auth-actions";

export const metadata: Metadata = {
  title: "Not Authorized",
  description: "You do not have permission to view this page.",
};

/**
 * Renders the unauthorized access page.
 */
function NotAuthorizedPage(): JSX.Element {
  return (
    <>
      <div className="top-bar">
        <img src="/assets/vip/header_3.png" alt="" className="top-bar-bg" />
        <div className="top-bar-inner">
          <div>
            <h1 className="top-bar-title">Not Authorized</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <AuthActions />
          </div>
        </div>
      </div>
      <div className="content-inner">
      <div className="grid">
        <div className="alert warn" style={{ gridColumn: "1 / -1" }}>
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
            <Link className="button primary" href="/home">
              Go to Home
            </Link>
            <Link className="button" href="/">
              Open Dashboard
            </Link>
            <Link className="button" href="/settings">
              Account Settings
            </Link>
          </div>
        </section>
      </div>
      </div>
    </>
  );
}

export default NotAuthorizedPage;
