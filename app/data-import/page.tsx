import { redirect } from "next/navigation";

/**
 * Redirects to the admin data import page.
 */
function DataImportPage(): JSX.Element {
  redirect("/admin/data-import");
}

export default DataImportPage;
