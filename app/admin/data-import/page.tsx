import DataImportClient from "../../data-import/data-import-client";
import AuthActions from "../../components/auth-actions";
import AdminSectionTabs from "../admin-section-tabs";

/**
 * Renders the admin data import page shell.
 */
function AdminDataImportPage(): JSX.Element {
  return (
    <>
      <section className="header header-inline">
        <div className="title">Admin • Data Import</div>
        <div className="actions">
          <span className="badge">Clan Data</span>
          <AuthActions />
        </div>
      </section>
      <div className="admin-tabs-container">
        <AdminSectionTabs />
      </div>
      <DataImportClient />
    </>
  );
}

export default AdminDataImportPage;
