"use client";

import { useCallback, useState, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { useSupabase } from "@/app/hooks/use-supabase";
import { useAuth } from "@/app/hooks/use-auth";
import { useUserRole } from "@/lib/hooks/use-user-role";
import PageShell from "@/app/components/page-shell";
import DataState from "@/app/components/data-state";
import ConfirmModal from "@/app/components/confirm-modal";
import { useBugs } from "./use-bugs";
import BugsList from "./bugs-list";
import BugsDetail from "./bugs-detail";
import BugsForm from "./bugs-form";

function BugsClient(): ReactElement {
  const t = useTranslations("bugs");
  const tCommon = useTranslations("common");
  const supabase = useSupabase();
  const { userId } = useAuth();
  const { isContentManager } = useUserRole(supabase);
  const bugs = useBugs();
  const [listDeleteId, setListDeleteId] = useState<string | null>(null);
  const [isDeletingFromList, setIsDeletingFromList] = useState(false);
  const [editOrigin, setEditOrigin] = useState<"list" | "detail">("detail");

  const hasActiveFilters =
    bugs.filter.status !== "all" ||
    bugs.filter.priority !== "all" ||
    bugs.filter.search !== "" ||
    bugs.filter.categoryId !== "";

  /* Switch to edit view with the current report's data pre-filled */
  const handleEditReport = useCallback(() => {
    if (bugs.selectedReport) {
      setEditOrigin("detail");
      bugs.setView("edit");
    }
  }, [bugs]);

  /* Delete report and return to list */
  const handleDeleteReport = useCallback(async () => {
    if (!bugs.selectedReport) return;
    const ok = await bugs.deleteReport(bugs.selectedReport.id);
    if (ok) {
      bugs.backToList();
      await bugs.loadReports();
    }
  }, [bugs]);

  /* Edit report from list: load detail first, then switch to edit */
  const handleEditFromList = useCallback(
    async (id: string) => {
      setEditOrigin("list");
      await bugs.loadReport(id);
      bugs.setView("edit");
    },
    [bugs],
  );

  /* Delete report from list: show confirmation, then delete and reload */
  const handleConfirmListDelete = useCallback(async () => {
    if (!listDeleteId) return;
    setIsDeletingFromList(true);
    const ok = await bugs.deleteReport(listDeleteId);
    if (ok) await bugs.loadReports();
    setListDeleteId(null);
    setIsDeletingFromList(false);
  }, [listDeleteId, bugs]);

  /* Save edited report (PATCH title, description, category, page_url) */
  const handleSaveEdit = useCallback(
    async (data: {
      title: string;
      description: string;
      categoryId: string;
      pageUrl: string;
      screenshotPaths: readonly string[];
    }) => {
      if (!bugs.selectedReport) return;
      const fields: Record<string, unknown> = {
        title: data.title,
        description: data.description,
        category_id: data.categoryId || null,
        page_url: data.pageUrl || null,
      };

      const ok = await bugs.updateReport(bugs.selectedReport.id, fields);
      if (ok) {
        if (editOrigin === "list") {
          await bugs.loadReports();
          bugs.backToList();
        } else {
          await bugs.loadReport(bugs.selectedReport.id);
          bugs.setView("detail");
        }
      }
    },
    [bugs, editOrigin],
  );

  return (
    <PageShell
      breadcrumb={t("breadcrumb")}
      title={t("title")}
      heroTitle={t("heroTitle")}
      heroSubtitle={t("heroSubtitle")}
      bannerSrc="/assets/banners/banner_gold_dragon.png"
    >
      {/* Content action bar */}
      <div className="bugs-content-actions">
        {bugs.view === "list" ? (
          <button className="button primary" type="button" onClick={() => bugs.setView("create")}>
            {t("newReport")}
          </button>
        ) : (
          <button
            className="button"
            type="button"
            onClick={
              bugs.view === "edit"
                ? editOrigin === "list"
                  ? bugs.backToList
                  : () => bugs.setView("detail")
                : bugs.backToList
            }
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            {bugs.view === "edit" && editOrigin === "detail" ? t("backToDetail") : t("backToList")}
          </button>
        )}
      </div>

      {bugs.view === "create" && (
        <BugsForm
          categories={bugs.categories}
          isSubmitting={bugs.isSubmitting}
          onSubmit={async (data) => {
            const ok = await bugs.submitReport(data);
            if (ok) {
              bugs.setView("list");
              await bugs.loadReports();
            }
          }}
          onCancel={bugs.backToList}
        />
      )}

      {bugs.view === "edit" && bugs.selectedReport && (
        <BugsForm
          categories={bugs.categories}
          isSubmitting={bugs.isSubmitting}
          onSubmit={handleSaveEdit}
          onCancel={editOrigin === "list" ? bugs.backToList : () => bugs.setView("detail")}
          initialData={{
            title: bugs.selectedReport.title,
            description: bugs.selectedReport.description,
            categoryId: bugs.selectedReport.category_id ?? "",
            pageUrl: bugs.selectedReport.page_url ?? "",
          }}
        />
      )}

      {bugs.view === "list" && (
        <DataState isLoading={bugs.isLoading} loadingMessage={t("loadingReports")}>
          <BugsList
            reports={bugs.sortedReports}
            categories={bugs.categories}
            filter={bugs.filter}
            onFilterChange={bugs.updateFilter}
            onSelectReport={bugs.openDetail}
            onEditReport={handleEditFromList}
            onDeleteReport={setListDeleteId}
            currentUserId={userId ?? undefined}
            isContentManager={isContentManager}
            emptyMessage={hasActiveFilters ? t("noReportsFiltered") : t("noReports")}
          />
        </DataState>
      )}

      {bugs.view === "detail" && (
        <DataState isLoading={bugs.isLoading && !bugs.selectedReport} loadingMessage={t("loadingReports")}>
          {bugs.selectedReport && (
            <BugsDetail
              report={bugs.selectedReport}
              categories={bugs.categories}
              onUpdate={async (fields) => {
                const ok = await bugs.updateReport(bugs.selectedReport!.id, fields);
                if (ok) await bugs.loadReport(bugs.selectedReport!.id);
              }}
              onEdit={handleEditReport}
              onDelete={handleDeleteReport}
            />
          )}
        </DataState>
      )}
      {/* Confirm delete from list */}
      <ConfirmModal
        isOpen={listDeleteId !== null}
        title={t("detail.confirmDeleteTitle")}
        message={t("detail.confirmDeleteMessage")}
        variant="danger"
        zoneLabel={t("detail.dangerZone")}
        confirmLabel={t("detail.deleteReport")}
        cancelLabel={tCommon("cancel")}
        onConfirm={handleConfirmListDelete}
        onCancel={() => setListDeleteId(null)}
        isConfirmDisabled={isDeletingFromList}
      />
    </PageShell>
  );
}

export default BugsClient;
