"use client";

import { useSearchParams } from "next/navigation";

function AdminSectionBadge(): JSX.Element {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "clans";
  const badgeLabel =
    tab === "users"
      ? "Users"
      : tab === "rules"
        ? "Rules"
        : tab === "logs"
          ? "Audit Logs"
          : "Clan Management";
  return <span className="badge">{badgeLabel}</span>;
}

export default AdminSectionBadge;
