import DataTableClient from "../../data-table/data-table-client";
import AuthActions from "../../components/auth-actions";
import AdminSectionTabs from "../admin-section-tabs";

/**
 * Renders the admin data table page shell.
 */
function AdminDataTablePage(): JSX.Element {
  return (
    <>
      <section className="header header-inline">
        <div className="title">Admin • Chest Database</div>
        <div className="actions">
          <span className="badge">Chest Database</span>
          <AuthActions />
        </div>
      </section>
      <div className="admin-tabs-container">
        <AdminSectionTabs />
      </div>
      <DataTableClient />
    </>
  );
}

export default AdminDataTablePage;
