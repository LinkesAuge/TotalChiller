"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

function AdminSectionBadge(): JSX.Element {
  const t = useTranslations("admin.tabs");
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "clans";
  const badgeLabel =
    tab === "users"
      ? t("users")
      : tab === "logs"
        ? t("logs")
        : tab === "forum"
          ? t("forum")
          : tab === "approvals"
            ? t("approvals")
            : t("clans");
  return <span className="badge">{badgeLabel}</span>;
}

export default AdminSectionBadge;
