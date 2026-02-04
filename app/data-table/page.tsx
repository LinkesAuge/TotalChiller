import { redirect } from "next/navigation";

/**
 * Redirects to the admin data table page.
 */
function DataTablePage(): JSX.Element {
  redirect("/admin/data-table");
}

export default DataTablePage;
