import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import DataImportClient from "../../data-import/data-import-client";
import AuthActions from "../../components/auth-actions";
import AdminSectionTabs from "../admin-section-tabs";
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
            <div className="top-bar-breadcrumb">{t("dataImport.breadcrumb")}</div>
            <h1 className="top-bar-title">{t("dataImport.title")}</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <AuthActions />
          </div>
        </div>
      </div>
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
