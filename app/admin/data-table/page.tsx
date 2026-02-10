import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import DataTableClient from "../../data-table/data-table-client";
import AuthActions from "../../components/auth-actions";
import AdminSectionTabs from "../admin-section-tabs";
import PageTopBar from "../../components/page-top-bar";
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
      <PageTopBar breadcrumb={t("dataTable.breadcrumb")} title={t("dataTable.title")} actions={<AuthActions />} />
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
