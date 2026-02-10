import type { Metadata } from "next";
import DataImportClient from "../../data-import/data-import-client";
import AdminSubPageLayout from "../admin-sub-page-layout";

export const metadata: Metadata = {
  title: "Data Import",
  description: "Import chest reports with validation and correction guardrails.",
};

/**
 * Renders the admin data import page shell.
 */
async function AdminDataImportPage(): Promise<JSX.Element> {
  return (
    <AdminSubPageLayout section="dataImport" bannerSrc="/assets/banners/banner_chest.png">
      <DataImportClient />
    </AdminSubPageLayout>
  );
}

export default AdminDataImportPage;
