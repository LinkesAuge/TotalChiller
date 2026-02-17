"use client";

import type { ReactElement } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import AdminProvider, { useAdminContext } from "./admin-context";
import type { AdminSection } from "./admin-types";
import { ADMIN_SECTIONS } from "./admin-sections";

/* ── Lazy-loaded tab components (code-split per tab) ── */

const ClansTab = dynamic(() => import("./tabs/clans-tab"), {
  loading: () => <TabSkeleton />,
});
const UsersTab = dynamic(() => import("./tabs/users-tab"), {
  loading: () => <TabSkeleton />,
});
const LogsTab = dynamic(() => import("./tabs/logs-tab"), {
  loading: () => <TabSkeleton />,
});
const ApprovalsTab = dynamic(() => import("./tabs/approvals-tab"), {
  loading: () => <TabSkeleton />,
});
const ForumTab = dynamic(() => import("./tabs/forum-tab"), {
  loading: () => <TabSkeleton />,
});

/* ── Skeleton shown while a tab JS chunk loads ── */

function TabSkeleton(): ReactElement {
  return (
    <section className="card">
      <div className="card-header">
        <div className="skeleton" style={{ width: "40%", height: 20 }} />
      </div>
      <div className="flex flex-col gap-3 p-4">
        <div className="skeleton w-full" style={{ height: 16 }} />
        <div className="skeleton" style={{ width: "80%", height: 16 }} />
        <div className="skeleton" style={{ width: "60%", height: 16 }} />
      </div>
    </section>
  );
}

/* ── Tab registry ── */

const TAB_MAP: Record<AdminSection, React.ComponentType> = {
  clans: ClansTab,
  users: UsersTab,
  logs: LogsTab,
  approvals: ApprovalsTab,
  forum: ForumTab,
};

/* ── Inner component (needs context) ── */

function AdminInner(): ReactElement {
  const { activeSection, updateActiveSection, navigateAdmin, pendingApprovals, pendingRegistrationCount } =
    useAdminContext();
  const tAdmin = useTranslations("admin");

  const ActiveTab = TAB_MAP[activeSection] ?? ClansTab;

  return (
    <div className="admin-grid">
      {/* ── Tab bar ── */}
      <section className="card">
        <div className="card-header">
          <div>
            <div className="card-title">{tAdmin("sections.title")}</div>
            <div className="card-subtitle">{tAdmin("sections.subtitle")}</div>
          </div>
        </div>
        <div className="tabs">
          {ADMIN_SECTIONS.map((section) => {
            const isActive = section.tab ? activeSection === section.tab : false;
            const totalPending = pendingApprovals.length + pendingRegistrationCount;
            const badge = section.tab === "approvals" && totalPending > 0 ? ` (${totalPending})` : "";
            return (
              <button
                key={section.labelKey}
                className={`tab ${isActive ? "active" : ""}`}
                type="button"
                onClick={() => (section.tab ? updateActiveSection(section.tab) : navigateAdmin(section.href))}
              >
                {tAdmin(`tabs.${section.labelKey}`)}
                {badge}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Active tab content ── */}
      <ActiveTab />
    </div>
  );
}

/* ── Outer wrapper that provides context ── */

function AdminClient(): ReactElement {
  return (
    <AdminProvider>
      <AdminInner />
    </AdminProvider>
  );
}

export default AdminClient;
