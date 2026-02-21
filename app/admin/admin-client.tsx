"use client";

import type { ReactElement } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import AdminProvider, { useAdminContext } from "./admin-context";
import type { AdminSection } from "./admin-types";
import { ADMIN_SECTIONS } from "./admin-sections";

const TAB_ICONS: Record<string, string> = {
  users: "/assets/game/icons/gold_72.png",
  clans: "/assets/game/icons/circle_mercenaries_01.png",
  approvals: "/assets/game/icons/icons_check_1.png",
  forum: "/assets/game/icons/icons_main_menu_storage_1.png",
  designSystem: "/assets/game/icons/clan_emblem_11.png",
  logs: "/assets/game/icons/icons_scroll_1.png",
  data: "/assets/game/icons/icons_chest_1.png",
};

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
const DataTab = dynamic(() => import("./tabs/data-tab"), {
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
  data: DataTab,
};

/* ── Inner component (needs context) ── */

function AdminInner(): ReactElement {
  const { activeSection, updateActiveSection, navigateAdmin, pendingApprovals, pendingRegistrationCount } =
    useAdminContext();
  const tAdmin = useTranslations("admin");

  const ActiveTab = TAB_MAP[activeSection] ?? ClansTab;
  const totalPending = pendingApprovals.length + pendingRegistrationCount;
  const activeTabLabel = tAdmin(`tabs.${activeSection}`);
  const activeTabSubtitle =
    activeSection === "users"
      ? tAdmin("users.subtitle")
      : activeSection === "approvals"
        ? tAdmin("approvals.subtitle")
        : activeSection === "logs"
          ? tAdmin("logs.subtitle")
          : activeSection === "forum"
            ? tAdmin("forum.subtitle")
            : activeSection === "data"
              ? tAdmin("data.subtitle")
              : tAdmin("common.selectAClan");

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
        <div className="tabs admin-tabs">
          {ADMIN_SECTIONS.map((section) => {
            const isActive = section.tab ? activeSection === section.tab : false;
            const tabIcon = TAB_ICONS[section.labelKey];
            return (
              <button
                key={section.labelKey}
                className={`tab ${isActive ? "active" : ""}`}
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={() => (section.tab ? updateActiveSection(section.tab) : navigateAdmin(section.href))}
              >
                {tabIcon && <Image src={tabIcon} alt="" width={28} height={28} className="admin-tab-icon" />}
                <span>{tAdmin(`tabs.${section.labelKey}`)}</span>
                {section.tab === "approvals" && totalPending > 0 ? (
                  <span className="tab-count" aria-label={`${totalPending} ${tAdmin("approvals.pending")}`}>
                    {totalPending}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        <div className="admin-active-context" role="status" aria-live="polite">
          <span className="admin-active-label">{tAdmin("common.active")}</span>
          <div className="admin-active-copy">
            <span className="admin-active-title">{activeTabLabel}</span>
            <span className="admin-active-subtitle">{activeTabSubtitle}</span>
          </div>
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
