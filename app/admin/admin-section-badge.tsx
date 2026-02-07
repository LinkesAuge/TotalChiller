"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

function AdminSectionBadge(): JSX.Element {
  const t = useTranslations("admin.tabs");
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab") ?? "clans";
  const tab = rawTab === "rules" ? "validation" : rawTab;
  const badgeLabel =
    tab === "users"
      ? t("users")
      : tab === "validation"
        ? t("validation")
        : tab === "corrections"
          ? t("corrections")
        : tab === "logs"
          ? t("logs")
          : t("clans");
  return <span className="badge">{badgeLabel}</span>;
}

export default AdminSectionBadge;
