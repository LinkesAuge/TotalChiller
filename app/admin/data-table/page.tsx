import type { Metadata } from "next";
import DataTableClient from "../../data-table/data-table-client";
import AuthActions from "../../components/auth-actions";
import AdminSectionTabs from "../admin-section-tabs";
import QuickActions from "../../components/quick-actions";
import SectionHero from "../../components/section-hero";

export const metadata: Metadata = {
  title: "Chest Database",
  description: "Review, filter, and correct chest records with full audit traceability.",
};

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
      <QuickActions />
      <SectionHero
        title="Chest Database"
        subtitle="Review, filter, and correct records with full audit traceability."
        bannerSrc="/assets/banners/banner_doomsday_708.png"
      />
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
