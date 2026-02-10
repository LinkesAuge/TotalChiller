import type { AdminSection } from "./admin-types";

/**
 * Single source of truth for admin navigation sections.
 *
 * Consumed by:
 * - admin-client.tsx  (tab buttons on the main admin page)
 * - admin-section-tabs.tsx  (link tabs on data-import / data-table sub-pages)
 * - sidebar-nav.tsx  (admin group in the sidebar)
 */

export interface AdminSectionDef {
  /** Translation key under the `admin.tabs` namespace. */
  readonly labelKey: string;
  /** Full href for navigating to this section. */
  readonly href: string;
  /** Present when this section is a tab on `/admin` (vs a separate sub-page). */
  readonly tab?: AdminSection;
}

export const ADMIN_SECTIONS: readonly AdminSectionDef[] = [
  { labelKey: "clans", href: "/admin?tab=clans", tab: "clans" },
  { labelKey: "approvals", href: "/admin?tab=approvals", tab: "approvals" },
  { labelKey: "users", href: "/admin?tab=users", tab: "users" },
  { labelKey: "validation", href: "/admin?tab=validation", tab: "validation" },
  { labelKey: "corrections", href: "/admin?tab=corrections", tab: "corrections" },
  { labelKey: "logs", href: "/admin?tab=logs", tab: "logs" },
  { labelKey: "forum", href: "/admin?tab=forum", tab: "forum" },
  { labelKey: "dataImport", href: "/admin/data-import" },
  { labelKey: "chestDb", href: "/admin/data-table" },
];
