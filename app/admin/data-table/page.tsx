import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import DataTableClient from "../../data-table/data-table-client";
import AuthActions from "../../components/auth-actions";
import AdminSectionTabs from "../admin-section-tabs";
import SectionHero from "../../components/section-hero";

export const metadata: Metadata = {
  title: "Chest Database",
  description: "Review, filter, and correct chest records with full audit traceability.",
};

/**
 * Renders the admin data table page shell.
 */
async function AdminDataTablePage(): Promise<JSX.Element> {
  const t = await getTranslations("admin");
  return (
    <>
      <div className="top-bar">
        <Image
          src="/assets/vip/header_3.png"
          alt=""
          role="presentation"
          className="top-bar-bg"
          width={1200}
          height={56}
          priority
        />
        <div className="top-bar-inner">
          <div>
            <div className="top-bar-breadcrumb">{t("dataTable.breadcrumb")}</div>
            <h1 className="top-bar-title">{t("dataTable.title")}</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <AuthActions />
          </div>
        </div>
      </div>
      <SectionHero
        title={t("dataTable.heroTitle")}
        subtitle={t("dataTable.heroSubtitle")}
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
