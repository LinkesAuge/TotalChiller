import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import DataImportClient from "../../data-import/data-import-client";
import AuthActions from "../../components/auth-actions";
import AdminSectionTabs from "../admin-section-tabs";
import PageTopBar from "../../components/page-top-bar";
import SectionHero from "../../components/section-hero";

export const metadata: Metadata = {
  title: "Data Import",
  description: "Import chest reports with validation and correction guardrails.",
};

/**
 * Renders the admin data import page shell.
 */
async function AdminDataImportPage(): Promise<JSX.Element> {
  const t = await getTranslations("admin");
  return (
    <>
      <PageTopBar breadcrumb={t("dataImport.breadcrumb")} title={t("dataImport.title")} actions={<AuthActions />} />
      <SectionHero
        title={t("dataImport.heroTitle")}
        subtitle={t("dataImport.heroSubtitle")}
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
