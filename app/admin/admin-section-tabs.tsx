"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ADMIN_SECTIONS, type AdminSectionDef } from "./admin-sections";

function isAdminTabActive(pathname: string, activeTab: string | null, item: AdminSectionDef): boolean {
  if (item.tab) {
    const normalizedTab = activeTab === "rules" ? "validation" : activeTab;
    return pathname === "/admin" && normalizedTab === item.tab;
  }
  return pathname.startsWith(item.href);
}

function AdminSectionTabs(): JSX.Element {
  const t = useTranslations("admin.tabs");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return (
    <div className="tabs">
      {ADMIN_SECTIONS.map((item) => {
        const isActive = isAdminTabActive(pathname, searchParams.get("tab"), item);
        return (
          <Link key={item.href} className={`tab ${isActive ? "active" : ""}`} href={item.href}>
            {t(item.labelKey)}
          </Link>
        );
      })}
    </div>
  );
}

export default AdminSectionTabs;
