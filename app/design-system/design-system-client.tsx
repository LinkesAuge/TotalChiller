"use client";

import { useMemo, useState, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import type { DesignSystemTab } from "./design-system-types";

/* ── Lazy-loaded tab components ── */

const AssetLibraryTab = dynamic(() => import("./asset-library-tab"), {
  loading: () => <TabSkeleton />,
});
const UiInventoryTab = dynamic(() => import("./ui-inventory-tab"), {
  loading: () => <TabSkeleton />,
});
const AssignmentTab = dynamic(() => import("./assignment-tab"), {
  loading: () => <TabSkeleton />,
});

/* ── Skeleton ── */

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

/* ── Tab definitions ── */

interface TabDef {
  readonly key: DesignSystemTab;
  readonly label: string;
  readonly description: string;
}

const TAB_MAP: Record<DesignSystemTab, React.ComponentType> = {
  assets: AssetLibraryTab,
  inventory: UiInventoryTab,
  assignments: AssignmentTab,
};

/* ── Main component ── */

function DesignSystemClient(): ReactElement {
  const t = useTranslations("designSystem");
  const [activeTab, setActiveTab] = useState<DesignSystemTab>("assets");
  const ActiveComponent = TAB_MAP[activeTab] ?? TabSkeleton;
  const tabs = useMemo<TabDef[]>(
    () => [
      { key: "assets", label: t("tabs.assetLibrary"), description: t("tabs.assetLibraryDesc") },
      { key: "inventory", label: t("tabs.uiInventory"), description: t("tabs.uiInventoryDesc") },
      { key: "assignments", label: t("tabs.assignments"), description: t("tabs.assignmentsDesc") },
    ],
    [t],
  );

  return (
    <div className="admin-grid">
      {/* Tab bar */}
      <section className="card">
        <div className="card-header">
          <div>
            <div className="card-title">{t("title")}</div>
            <div className="card-subtitle">{t("subtitle")}</div>
          </div>
        </div>
        <div className="tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`tab ${activeTab === tab.key ? "active" : ""}`}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              title={tab.description}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* Active tab content */}
      <ActiveComponent />
    </div>
  );
}

export default DesignSystemClient;
