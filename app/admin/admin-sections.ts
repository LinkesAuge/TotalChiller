import type { AdminSection } from "./admin-types";

/**
 * Single source of truth for admin navigation sections.
 *
 * Consumed by:
 * - admin-client.tsx  (tab buttons on the main admin page)
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
  { labelKey: "users", href: "/admin?tab=users", tab: "users" },
  { labelKey: "clans", href: "/admin?tab=clans", tab: "clans" },
  { labelKey: "approvals", href: "/admin?tab=approvals", tab: "approvals" },
  { labelKey: "forum", href: "/admin?tab=forum", tab: "forum" },
  { labelKey: "rulesDefinitions", href: "/admin?tab=rulesDefinitions", tab: "rulesDefinitions" },
  { labelKey: "designSystem", href: "/design-system" },
  { labelKey: "logs", href: "/admin?tab=logs", tab: "logs" },
];
