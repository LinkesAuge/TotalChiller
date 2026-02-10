"use client";

import type { ReactElement } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import AdminProvider, { useAdminContext } from "./admin-context";
import type { AdminSection } from "./admin-types";

/* ── Lazy-loaded tab components (code-split per tab) ── */

const ClansTab = dynamic(() => import("./tabs/clans-tab"), {
  loading: () => <TabSkeleton />,
});
const UsersTab = dynamic(() => import("./tabs/users-tab"), {
  loading: () => <TabSkeleton />,
});
const ValidationTab = dynamic(() => import("./tabs/validation-tab"), {
  loading: () => <TabSkeleton />,
});
const CorrectionsTab = dynamic(() => import("./tabs/corrections-tab"), {
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
    <section className="card" style={{ gridColumn: "1 / -1" }}>
      <div className="card-header">
        <div className="skeleton" style={{ width: "40%", height: 20 }} />
      </div>
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="skeleton" style={{ width: "100%", height: 16 }} />
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
  validation: ValidationTab,
  corrections: CorrectionsTab,
  logs: LogsTab,
  approvals: ApprovalsTab,
  forum: ForumTab,
};

/* ── Inner component (needs context) ── */

function AdminInner(): ReactElement {
  const { activeSection, updateActiveSection, navigateAdmin, pendingApprovals } = useAdminContext();
  const tAdmin = useTranslations("admin");

  const ActiveTab = TAB_MAP[activeSection] ?? ClansTab;

  return (
    <div className="grid">
      {/* ── Tab bar ── */}
      <section className="card" style={{ gridColumn: "1 / -1" }}>
        <div className="card-header">
          <div>
            <div className="card-title">{tAdmin("sections.title")}</div>
            <div className="card-subtitle">{tAdmin("sections.subtitle")}</div>
          </div>
        </div>
        <div className="tabs">
          <button
            className={`tab ${activeSection === "clans" ? "active" : ""}`}
            type="button"
            onClick={() => updateActiveSection("clans")}
          >
            {tAdmin("tabs.clans")}
          </button>
          <button
            className={`tab ${activeSection === "approvals" ? "active" : ""}`}
            type="button"
            onClick={() => updateActiveSection("approvals")}
          >
            {tAdmin("tabs.approvals")}
            {pendingApprovals.length > 0 ? ` (${pendingApprovals.length})` : ""}
          </button>
          <button
            className={`tab ${activeSection === "users" ? "active" : ""}`}
            type="button"
            onClick={() => updateActiveSection("users")}
          >
            {tAdmin("tabs.users")}
          </button>
          <button
            className={`tab ${activeSection === "validation" ? "active" : ""}`}
            type="button"
            onClick={() => updateActiveSection("validation")}
          >
            {tAdmin("tabs.validation")}
          </button>
          <button
            className={`tab ${activeSection === "corrections" ? "active" : ""}`}
            type="button"
            onClick={() => updateActiveSection("corrections")}
          >
            {tAdmin("tabs.corrections")}
          </button>
          <button
            className={`tab ${activeSection === "logs" ? "active" : ""}`}
            type="button"
            onClick={() => updateActiveSection("logs")}
          >
            {tAdmin("tabs.logs")}
          </button>
          <button
            className={`tab ${activeSection === "forum" ? "active" : ""}`}
            type="button"
            onClick={() => updateActiveSection("forum")}
          >
            {tAdmin("tabs.forum")}
          </button>
          <button className="tab" type="button" onClick={() => navigateAdmin("/admin/data-import")}>
            {tAdmin("tabs.dataImport")}
          </button>
          <button className="tab" type="button" onClick={() => navigateAdmin("/admin/data-table")}>
            {tAdmin("tabs.chestDb")}
          </button>
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
