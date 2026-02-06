import AdminClient from "./admin-client";
import AuthActions from "../components/auth-actions";
import AdminSectionBadge from "./admin-section-badge";

/**
 * Renders the admin panel page shell.
 */
function AdminPage(): JSX.Element {
  return (
    <>
      <div className="top-bar">
        <img src="/assets/vip/header_3.png" alt="" className="top-bar-bg" />
        <div className="top-bar-inner">
          <div>
            <div className="top-bar-breadcrumb">The Chillers &bull; Command</div>
            <h1 className="top-bar-title">Admin Panel</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <AdminSectionBadge />
            <AuthActions />
          </div>
        </div>
      </div>
      <div className="content-inner">
        <AdminClient />
      </div>
    </>
  );
}

export default AdminPage;
