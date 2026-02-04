import AdminClient from "./admin-client";
import AuthActions from "../components/auth-actions";

/**
 * Renders the admin panel page shell.
 */
function AdminPage(): JSX.Element {
  return (
    <>
      <section className="header header-inline">
        <div className="title">Admin Panel</div>
        <div className="actions">
          <span className="badge">Clan Management</span>
          <AuthActions />
        </div>
      </section>
      <AdminClient />
    </>
  );
}

export default AdminPage;
