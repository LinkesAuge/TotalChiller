import DataTableClient from "../../data-table/data-table-client";
import AuthActions from "../../components/auth-actions";
import AdminSectionTabs from "../admin-section-tabs";

/**
 * Renders the admin data table page shell.
 */
function AdminDataTablePage(): JSX.Element {
  return (
    <>
      <div className="top-bar">
        <img src="/assets/vip/header_3.png" alt="" className="top-bar-bg" />
        <div className="top-bar-inner">
          <div>
            <div className="top-bar-breadcrumb">The Chillers &bull; Command &bull; Chest Database</div>
            <h1 className="top-bar-title">Chest Database</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <AuthActions />
          </div>
        </div>
      </div>
      <div className="content-inner">
        <div className="admin-tabs-container">
          <AdminSectionTabs />
        </div>
        <DataTableClient />
      </div>
    </>
  );
}

export default AdminDataTablePage;
