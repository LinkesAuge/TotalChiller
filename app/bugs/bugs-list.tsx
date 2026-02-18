"use client";

import type { ReactElement } from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { formatLocalDateTime } from "@/lib/date-format";
import { stripMarkdown } from "@/lib/markdown/strip-markdown";
import { usePagination } from "@/lib/hooks/use-pagination";
import RadixSelect from "@/app/components/ui/radix-select";
import SearchInput from "@/app/components/ui/search-input";
import PaginationBar from "@/app/components/pagination-bar";
import type { BugReportListItem, BugListFilter, BugReportCategory, BugSortOption } from "./bugs-types";

interface BugsListProps {
  readonly reports: readonly BugReportListItem[];
  readonly categories: readonly BugReportCategory[];
  readonly filter: BugListFilter;
  readonly onFilterChange: (partial: Partial<BugListFilter>) => void;
  readonly onSelectReport: (id: string) => void;
  readonly onEditReport?: (id: string) => void;
  readonly onDeleteReport?: (id: string) => void;
  readonly currentUserId?: string;
  readonly isContentManager?: boolean;
  readonly emptyMessage?: string;
}

function getDisplayName(reporter: { username: string | null; display_name: string | null } | null): string {
  if (!reporter) return "Unknown";
  return reporter.display_name ?? reporter.username ?? "Unknown";
}

function truncate(text: string, max: number): string {
  const plain = stripMarkdown(text);
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max).trimEnd()}…`;
}

/** Translate a category via its slug, falling back to the raw name. */
function translateCategory(t: (key: string) => string, slug: string | null, name: string): string {
  if (!slug) return name;
  const translated = t(`categories.${slug}`);
  return translated.startsWith("categories.") ? name : translated;
}

function BugsList({
  reports,
  categories,
  filter,
  onFilterChange,
  onSelectReport,
  onEditReport,
  onDeleteReport,
  currentUserId,
  isContentManager,
  emptyMessage,
}: BugsListProps): ReactElement {
  const t = useTranslations("bugs");
  const locale = useLocale();
  const pagination = usePagination(reports.length, 15);
  const paged = reports.slice(pagination.startIndex, pagination.endIndex);

  const statusOptions = [
    { value: "all", label: t("status.all") },
    { value: "open", label: t("status.open") },
    { value: "resolved", label: t("status.resolved") },
    { value: "closed", label: t("status.closed") },
  ];

  const priorityOptions = [
    { value: "all", label: t("priority.all") },
    { value: "low", label: t("priority.low") },
    { value: "medium", label: t("priority.medium") },
    { value: "high", label: t("priority.high") },
    { value: "critical", label: t("priority.critical") },
  ];

  const categoryOptions = [
    { value: "", label: t("list.allCategories") },
    ...categories.map((c) => ({ value: c.id, label: translateCategory(t, c.slug, c.name) })),
  ];

  const sortOptions = [
    { value: "newest", label: t("sort.newest") },
    { value: "oldest", label: t("sort.oldest") },
    { value: "title", label: t("sort.title") },
    { value: "priority", label: t("sort.priority") },
    { value: "status", label: t("sort.status") },
  ];

  return (
    <div className="bugs-list-wrapper">
      {/* ── Filter bar ── */}
      <div className="card bugs-toolbar-card">
        <div className="bugs-filters">
          <RadixSelect
            value={filter.status}
            options={statusOptions}
            onValueChange={(val) => onFilterChange({ status: val as BugListFilter["status"] })}
            placeholder={t("status.label")}
          />
          <RadixSelect
            value={filter.priority}
            options={priorityOptions}
            onValueChange={(val) => onFilterChange({ priority: val as BugListFilter["priority"] })}
            placeholder={t("priority.label")}
          />
          <RadixSelect
            value={filter.categoryId}
            options={categoryOptions}
            onValueChange={(val) => onFilterChange({ categoryId: val })}
            placeholder={t("list.filterByCategory")}
          />
        </div>
        <div className="bugs-search-row">
          <div className="bugs-search-field">
            <SearchInput
              id="bugs-search"
              label=""
              value={filter.search}
              onChange={(val) => onFilterChange({ search: val })}
              placeholder={t("list.searchPlaceholder")}
              inputClassName="bugs-search-input"
            />
          </div>
          <RadixSelect
            value={filter.sort}
            options={sortOptions}
            onValueChange={(val) => onFilterChange({ sort: val as BugSortOption })}
            placeholder={t("sort.label")}
          />
        </div>
      </div>

      {/* ── Report cards ── */}
      {reports.length === 0 && emptyMessage && (
        <div className="card bugs-empty-state">
          <p className="text-muted">{emptyMessage}</p>
        </div>
      )}
      <div className="bugs-report-grid">
        {paged.map((report) => (
          <div
            key={report.id}
            className="card bugs-report-card"
            role="button"
            tabIndex={0}
            onClick={() => onSelectReport(report.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onSelectReport(report.id);
            }}
          >
            {/* Header: badges + actions */}
            <div className="bugs-card-header">
              <div className="bugs-card-header-left">
                <span className={`bugs-status-badge ${report.status}`}>{t(`status.${report.status}`)}</span>
                {report.priority && (
                  <span className={`bugs-priority-badge ${report.priority}`}>{t(`priority.${report.priority}`)}</span>
                )}
              </div>
              {(isContentManager || currentUserId === report.reporter_id) && (
                <div className="bugs-card-actions">
                  {onEditReport && (
                    <button
                      className="bugs-action-btn"
                      type="button"
                      aria-label={t("detail.editReport")}
                      title={t("detail.editReport")}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditReport(report.id);
                      }}
                    >
                      <Image src="/assets/game/icons/icons_pen_2.png" alt="" width={14} height={14} />
                    </button>
                  )}
                  {onDeleteReport && (
                    <button
                      className="bugs-action-btn danger"
                      type="button"
                      aria-label={t("detail.deleteReport")}
                      title={t("detail.deleteReport")}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteReport(report.id);
                      }}
                    >
                      <Image src="/assets/game/icons/icons_paper_cross_1.png" alt="" width={14} height={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="bugs-card-title">{report.title}</div>
            <div className="bugs-card-desc">{truncate(report.description, 120)}</div>

            {/* Footer: meta + badges */}
            <div className="bugs-card-footer">
              <div className="bugs-card-meta">
                <span>{getDisplayName(report.reporter)}</span>
                <span className="bugs-card-dot">&middot;</span>
                <span>{formatLocalDateTime(report.created_at, locale)}</span>
              </div>
              <div className="bugs-card-tags">
                {report.category_name && (
                  <span className="bugs-category-badge">
                    {translateCategory(t, report.category_slug, report.category_name)}
                  </span>
                )}
                {report.comment_count > 0 && (
                  <span className="bugs-card-count">
                    <Image src="/assets/game/icons/icons_message_1.png" alt="" width={13} height={13} />
                    {report.comment_count}
                  </span>
                )}
                {report.screenshot_count > 0 && (
                  <span className="bugs-card-count">
                    <Image src="/assets/game/icons/icons_spyglass_1.png" alt="" width={13} height={13} />
                    {report.screenshot_count}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Pagination ── */}
      {reports.length > 0 && (
        <PaginationBar pagination={pagination} pageSizeOptions={[15, 30, 50]} idPrefix="bugs" compact />
      )}
    </div>
  );
}

export default BugsList;
