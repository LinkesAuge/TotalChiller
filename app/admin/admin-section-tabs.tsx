"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

interface AdminTabItem {
  readonly label: string;
  readonly href: string;
  readonly tab?: "clans" | "users" | "validation" | "corrections" | "logs" | "approvals";
}

function isAdminTabActive(pathname: string, activeTab: string | null, item: AdminTabItem): boolean {
  if (item.tab) {
    const normalizedTab = activeTab === "rules" ? "validation" : activeTab;
    return pathname === "/admin" && normalizedTab === item.tab;
  }
  return pathname.startsWith(item.href);
}

function AdminSectionTabs(): JSX.Element {
  const t = useTranslations("admin.tabs");
  const adminTabs: readonly AdminTabItem[] = [
    { label: t("clans"), href: "/admin?tab=clans", tab: "clans" },
    { label: t("approvals"), href: "/admin?tab=approvals", tab: "approvals" },
    { label: t("users"), href: "/admin?tab=users", tab: "users" },
    { label: t("validation"), href: "/admin?tab=validation", tab: "validation" },
    { label: t("corrections"), href: "/admin?tab=corrections", tab: "corrections" },
    { label: t("logs"), href: "/admin?tab=logs", tab: "logs" },
    { label: t("dataImport"), href: "/admin/data-import" },
    { label: t("chestDb"), href: "/admin/data-table" },
  ];
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return (
    <div className="tabs">
      {adminTabs.map((item) => {
        const isActive = isAdminTabActive(pathname, searchParams.get("tab"), item);
        return (
          <Link key={item.href} className={`tab ${isActive ? "active" : ""}`} href={item.href}>
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export default AdminSectionTabs;
