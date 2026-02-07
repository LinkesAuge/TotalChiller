import type { Metadata } from "next";
import AdminClient from "./admin-client";
import AuthActions from "../components/auth-actions";
import AdminSectionBadge from "./admin-section-badge";
import QuickActions from "../components/quick-actions";
import SectionHero from "../components/section-hero";

export const metadata: Metadata = {
  title: "Admin Panel",
  description: "Clan administration — user management, approvals, validation rules, and audit logs.",
};

/**
 * Renders the admin panel page shell.
 */
function AdminPage(): JSX.Element {
  return (
    <>
      <div className="top-bar">
        <img src="/assets/vip/header_3.png" alt="" className="top-bar-bg" width={1200} height={56} loading="eager" />
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
      <QuickActions />
      <SectionHero
        title="Command Center"
        subtitle="Governance, approvals, and validation controls."
        bannerSrc="/assets/banners/banner_tournir_kvk.png"
      />
      <div className="content-inner">
        <AdminClient />
      </div>
    </>
  );
}

export default AdminPage;
