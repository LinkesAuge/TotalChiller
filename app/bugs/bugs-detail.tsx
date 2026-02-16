"use client";

import { useCallback, useState, type ReactElement } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useTranslations, useLocale } from "next-intl";
import { formatLocalDateTime } from "@/lib/date-format";
import { useSupabase } from "@/app/hooks/use-supabase";
import { useAuth } from "@/app/hooks/use-auth";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { BUG_SCREENSHOTS_BUCKET } from "@/lib/constants";
import ConfirmModal from "@/app/components/confirm-modal";
import BugsComments from "./bugs-comments";
import BugsAdminControls from "./bugs-admin-controls";
import type { BugReportDetail as BugReportDetailType, BugReportCategory } from "./bugs-types";

const AppMarkdown = dynamic(() => import("@/lib/markdown/app-markdown"), {
  loading: () => <div className="skeleton h-16 rounded" />,
});

function translateCat(t: (key: string) => string, slug: string | null, name: string | null): string {
  if (slug) {
    const v = t(`categories.${slug}`);
    if (!v.startsWith("categories.")) return v;
  }
  return name ?? t("detail.uncategorized");
}

interface BugsDetailProps {
  readonly report: BugReportDetailType;
  readonly categories: readonly BugReportCategory[];
  readonly onUpdate: (fields: Record<string, unknown>) => Promise<void>;
  readonly onEdit: () => void;
  readonly onDelete: () => Promise<void>;
}

function getDisplayName(reporter: { username: string | null; display_name: string | null } | null): string {
  if (!reporter) return "Unknown";
  return reporter.display_name ?? reporter.username ?? "Unknown";
}

function BugsDetail({ report, categories, onUpdate, onEdit, onDelete }: BugsDetailProps): ReactElement {
  const t = useTranslations("bugs");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const supabase = useSupabase();
  const { userId } = useAuth();
  const { isContentManager } = useUserRole(supabase);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isReporter = userId === report.reporter_id;
  const canModify = isReporter || isContentManager;

  const handleConfirmDelete = useCallback(async () => {
    setIsDeleting(true);
    await onDelete();
    setShowDeleteConfirm(false);
    setIsDeleting(false);
  }, [onDelete]);

  const getScreenshotUrl = useCallback(
    (storagePath: string): string => {
      const { data } = supabase.storage.from(BUG_SCREENSHOTS_BUCKET).getPublicUrl(storagePath);
      return data.publicUrl;
    },
    [supabase],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Main report card */}
      <section className="card">
        <div className="card-header">
          <div className="bugs-detail-header">
            <div>
              <div className="bugs-detail-title">{report.title}</div>
              <div className="bugs-detail-meta">
                <span>
                  {t("detail.reportedBy")} <strong>{getDisplayName(report.reporter)}</strong>
                </span>
                <span>
                  {t("detail.reportedOn")} {formatLocalDateTime(report.created_at, locale)}
                </span>
              </div>
            </div>
            <div className="bugs-detail-badges">
              <span className={`bugs-status-badge ${report.status}`}>{t(`status.${report.status}`)}</span>
              {report.priority && (
                <span className={`bugs-priority-badge ${report.priority}`}>{t(`priority.${report.priority}`)}</span>
              )}
              <span className="bugs-category-badge">{translateCat(t, report.category_slug, report.category_name)}</span>
              {canModify && (
                <div className="bugs-detail-actions">
                  <button
                    className="bugs-action-btn"
                    type="button"
                    onClick={onEdit}
                    aria-label={t("detail.editReport")}
                    title={t("detail.editReport")}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    className="bugs-action-btn danger"
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    aria-label={t("detail.deleteReport")}
                    title={t("detail.deleteReport")}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 pb-4">
          {/* Page URL */}
          {report.page_url && (
            <div style={{ marginBottom: 12 }}>
              <span className="bugs-admin-label">{t("detail.pageUrl")}: </span>
              <a className="bugs-detail-page-url" href={report.page_url} target="_blank" rel="noopener noreferrer">
                {report.page_url}
              </a>
            </div>
          )}

          {/* Description */}
          <div className="bugs-detail-body">
            <AppMarkdown content={report.description} />
          </div>

          {/* Screenshots */}
          <div style={{ marginTop: 20 }}>
            <div className="bugs-admin-label" style={{ marginBottom: 8 }}>
              {t("detail.screenshots")}
            </div>
            {report.screenshots.length === 0 ? (
              <p className="text-muted" style={{ fontSize: "0.82rem" }}>
                {t("detail.noScreenshots")}
              </p>
            ) : (
              <div className="bugs-screenshot-grid">
                {report.screenshots.map((ss) => {
                  const url = getScreenshotUrl(ss.storage_path);
                  return (
                    <div
                      key={ss.id}
                      className="bugs-screenshot-thumb"
                      role="button"
                      tabIndex={0}
                      onClick={() => setLightboxUrl(url)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") setLightboxUrl(url);
                      }}
                    >
                      <Image src={url} alt={ss.file_name} fill sizes="140px" unoptimized />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Admin controls */}
      <BugsAdminControls report={report} categories={categories} onUpdate={onUpdate} />

      {/* Comments */}
      <BugsComments reportId={report.id} currentUserId={userId ?? ""} canManage={isContentManager} />

      {/* Delete confirmation */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title={t("detail.confirmDeleteTitle")}
        message={t("detail.confirmDeleteMessage")}
        variant="danger"
        zoneLabel={t("detail.dangerZone")}
        confirmLabel={t("detail.deleteReport")}
        cancelLabel={tCommon("cancel")}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        isConfirmDisabled={isDeleting}
      />

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="bugs-lightbox"
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          ref={(el) => el?.focus()}
          onClick={() => setLightboxUrl(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setLightboxUrl(null);
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- lightbox needs native sizing */}
          <img src={lightboxUrl} alt="Screenshot" />
        </div>
      )}
    </div>
  );
}

export default BugsDetail;
