import type { Metadata } from "next";
import DataTableClient from "../../data-table/data-table-client";
import AdminSubPageLayout from "../admin-sub-page-layout";

export const metadata: Metadata = {
  title: "Chest Database",
  description: "Review, filter, and correct chest records with full audit traceability.",
};

/**
 * Renders the admin data table page shell.
 */
async function AdminDataTablePage(): Promise<JSX.Element> {
  return (
    <AdminSubPageLayout section="dataTable" bannerSrc="/assets/banners/banner_doomsday_708.png">
      <DataTableClient />
    </AdminSubPageLayout>
  );
}

export default AdminDataTablePage;
