"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

interface AdminTabItem {
  readonly label: string;
  readonly href: string;
  readonly tab?: "clans" | "users" | "rules" | "logs";
}

const adminTabs: readonly AdminTabItem[] = [
  { label: "Clan Management", href: "/admin?tab=clans", tab: "clans" },
  { label: "Users", href: "/admin?tab=users", tab: "users" },
  { label: "Rules", href: "/admin?tab=rules", tab: "rules" },
  { label: "Audit Logs", href: "/admin?tab=logs", tab: "logs" },
  { label: "Data Import", href: "/admin/data-import" },
  { label: "Chest Database", href: "/admin/data-table" },
];

function isAdminTabActive(pathname: string, activeTab: string | null, item: AdminTabItem): boolean {
  if (item.tab) {
    return pathname === "/admin" && activeTab === item.tab;
  }
  return pathname.startsWith(item.href);
}

function AdminSectionTabs(): JSX.Element {
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
