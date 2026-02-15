"use client";

import { useCallback, useState, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { useSupabase } from "@/app/hooks/use-supabase";
import { useUserRole } from "@/lib/hooks/use-user-role";
import RadixSelect from "@/app/components/ui/radix-select";
import type { BugReportDetail, BugReportCategory } from "./bugs-types";

interface BugsAdminControlsProps {
  readonly report: BugReportDetail;
  readonly categories: readonly BugReportCategory[];
  readonly onUpdate: (fields: Record<string, unknown>) => Promise<void>;
}

function BugsAdminControls({ report, categories, onUpdate }: BugsAdminControlsProps): ReactElement | null {
  const t = useTranslations("bugs.admin");
  const tBugs = useTranslations("bugs");
  const supabase = useSupabase();
  const { isAdmin, isContentManager } = useUserRole(supabase);

  const [isSaving, setIsSaving] = useState(false);

  const handleChange = useCallback(
    async (field: string, value: string | null) => {
      setIsSaving(true);
      try {
        await onUpdate({ [field]: value });
      } finally {
        setIsSaving(false);
      }
    },
    [onUpdate],
  );

  if (!isAdmin && !isContentManager) return null;

  const statusOptions = [
    { value: "open", label: tBugs("status.open") },
    { value: "resolved", label: tBugs("status.resolved") },
    { value: "closed", label: tBugs("status.closed") },
  ];

  const priorityOptions = [
    { value: "__none__", label: `— ${tBugs("priority.none")} —` },
    { value: "low", label: tBugs("priority.low") },
    { value: "medium", label: tBugs("priority.medium") },
    { value: "high", label: tBugs("priority.high") },
    { value: "critical", label: tBugs("priority.critical") },
  ];

  const categoryOptions = [
    { value: "__none__", label: `— ${tBugs("detail.uncategorized")} —` },
    ...categories.map((c) => {
      const label = c.slug ? tBugs(`categories.${c.slug}`) : c.name;
      return { value: c.id, label: label.startsWith("categories.") ? c.name : label };
    }),
  ];

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <div className="card-title">{t("title")}</div>
        </div>
      </div>
      <div className="bugs-admin-controls">
        <div className="bugs-admin-field">
          <span className="bugs-admin-label">{t("changeStatus")}</span>
          <RadixSelect
            value={report.status}
            options={statusOptions}
            onValueChange={(val) => handleChange("status", val)}
            placeholder={t("changeStatus")}
            disabled={isSaving}
          />
        </div>

        <div className="bugs-admin-field">
          <span className="bugs-admin-label">{t("setPriority")}</span>
          <RadixSelect
            value={report.priority ?? "__none__"}
            options={priorityOptions}
            onValueChange={(val) => handleChange("priority", val === "__none__" ? null : val)}
            placeholder={t("setPriority")}
            disabled={isSaving}
          />
        </div>

        <div className="bugs-admin-field">
          <span className="bugs-admin-label">{t("changeCategory")}</span>
          <RadixSelect
            value={report.category_id ?? "__none__"}
            options={categoryOptions}
            onValueChange={(val) => handleChange("category_id", val === "__none__" ? null : val)}
            placeholder={t("changeCategory")}
            disabled={isSaving}
          />
        </div>
      </div>
    </section>
  );
}

export default BugsAdminControls;
