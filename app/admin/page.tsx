import AdminClient from "./admin-client";
import AuthActions from "../components/auth-actions";
import AdminSectionBadge from "./admin-section-badge";

/**
 * Renders the admin panel page shell.
 */
function AdminPage(): JSX.Element {
  return (
    <>
      <section className="header header-inline">
        <div className="title">Admin Panel</div>
        <div className="actions">
          <AdminSectionBadge />
          <AuthActions />
        </div>
      </section>
      <AdminClient />
    </>
  );
}

export default AdminPage;
