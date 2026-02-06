"use client";

import { useSearchParams } from "next/navigation";

function AdminSectionBadge(): JSX.Element {
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab") ?? "clans";
  const tab = rawTab === "rules" ? "validation" : rawTab;
  const badgeLabel =
    tab === "users"
      ? "Users"
      : tab === "validation"
        ? "Validation"
        : tab === "corrections"
          ? "Corrections"
        : tab === "logs"
          ? "Audit Logs"
          : "Clan Management";
  return <span className="badge">{badgeLabel}</span>;
}

export default AdminSectionBadge;
