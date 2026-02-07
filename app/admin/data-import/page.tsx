import type { Metadata } from "next";
import DataImportClient from "../../data-import/data-import-client";
import AuthActions from "../../components/auth-actions";
import AdminSectionTabs from "../admin-section-tabs";
import QuickActions from "../../components/quick-actions";
import SectionHero from "../../components/section-hero";

export const metadata: Metadata = {
  title: "Data Import",
  description: "Import chest reports with validation and correction guardrails.",
};

/**
 * Renders the admin data import page shell.
 */
function AdminDataImportPage(): JSX.Element {
  return (
    <>
      <div className="top-bar">
        <img src="/assets/vip/header_3.png" alt="" className="top-bar-bg" />
        <div className="top-bar-inner">
          <div>
            <div className="top-bar-breadcrumb">The Chillers &bull; Command &bull; Data Import</div>
            <h1 className="top-bar-title">Data Import</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <AuthActions />
          </div>
        </div>
      </div>
      <QuickActions />
      <SectionHero
        title="Data Import"
        subtitle="Ingest chest reports with validation and correction guardrails."
        bannerSrc="/assets/banners/banner_chest.png"
      />
      <div className="content-inner">
        <div className="admin-tabs-container">
          <AdminSectionTabs />
        </div>
        <DataImportClient />
      </div>
    </>
  );
}

export default AdminDataImportPage;
