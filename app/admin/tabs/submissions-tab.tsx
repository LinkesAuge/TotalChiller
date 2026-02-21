"use client";

import type { ReactElement } from "react";
import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useSupabase } from "../../hooks/use-supabase";
import useClanContext from "../../hooks/use-clan-context";
import { useUserRole } from "@/lib/hooks/use-user-role";
import DataState from "../../components/data-state";
import PaginationBar from "../../components/pagination-bar";
import { usePagination } from "@/lib/hooks/use-pagination";

/* ── Types ── */

interface SubmissionProfile {
  readonly id: string;
  readonly display_name: string | null;
}

interface MatchedAccount {
  readonly id: string;
  readonly game_username: string;
}

interface SubmissionRow {
  readonly id: string;
  readonly submission_type: string;
  readonly status: string;
  readonly total_items: number | null;
  readonly matched_count: number | null;
  readonly approved_count: number | null;
  readonly rejected_count: number | null;
  readonly created_at: string;
  readonly profiles: SubmissionProfile | null;
}

interface SubmissionsResponse {
  readonly submissions: readonly SubmissionRow[];
  readonly total: number;
  readonly page: number;
  readonly perPage: number;
}

interface StagedEntry {
  readonly id: string;
  readonly player_name: string;
  readonly item_status: string;
  readonly created_at: string;
  readonly game_accounts: MatchedAccount | null;
  readonly chest_name?: string;
  readonly source?: string;
  readonly level?: number | null;
  readonly opened_at?: string;
  readonly coordinates?: string | null;
  readonly score?: number | string | null;
  readonly captured_at?: string;
  readonly event_name?: string | null;
  readonly event_points?: number | string | null;
}

interface DetailResponse {
  readonly submission: SubmissionRow;
  readonly items: readonly StagedEntry[];
  readonly total: number;
  readonly page: number;
  readonly perPage: number;
  readonly statusCounts: Record<string, number>;
}

type StatusFilter = "" | "pending" | "approved" | "rejected" | "partial";
type TypeFilter = "" | "chests" | "members" | "events";
type ItemStatusFilter = "" | "pending" | "auto_matched" | "approved" | "rejected";

/* ── Constants ── */

const LIST_PER_PAGE = 20;
const DETAIL_PER_PAGE = 50;

const STATUS_OPTIONS: readonly { value: StatusFilter; labelKey: string }[] = [
  { value: "", labelKey: "filterAll" },
  { value: "pending", labelKey: "statusPending" },
  { value: "approved", labelKey: "statusApproved" },
  { value: "rejected", labelKey: "statusRejected" },
  { value: "partial", labelKey: "statusPartial" },
];

const TYPE_OPTIONS: readonly { value: TypeFilter; labelKey: string }[] = [
  { value: "", labelKey: "filterAll" },
  { value: "chests", labelKey: "typeChests" },
  { value: "members", labelKey: "typeMembers" },
  { value: "events", labelKey: "typeEvents" },
];

const STATUS_TABS: readonly { value: ItemStatusFilter; labelKey: string }[] = [
  { value: "", labelKey: "filterAll" },
  { value: "pending", labelKey: "statusPending" },
  { value: "auto_matched", labelKey: "statusAutoMatched" },
  { value: "approved", labelKey: "statusApproved" },
  { value: "rejected", labelKey: "statusRejected" },
];

function statusBadgeClass(status: string): string {
  switch (status) {
    case "approved":
      return "badge success";
    case "rejected":
      return "badge danger";
    case "partial":
    case "auto_matched":
      return "badge warning";
    default:
      return "badge info";
  }
}

/* ── Component ── */

export default function SubmissionsTab(): ReactElement {
  const t = useTranslations("submissions");
  const supabase = useSupabase();
  const clanContext = useClanContext();
  const { isAdmin, isContentManager, loading: roleLoading } = useUserRole(supabase);

  /* ── List state ── */
  const [submissions, setSubmissions] = useState<readonly SubmissionRow[]>([]);
  const [listTotal, setListTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("");
  const listPagination = usePagination(listTotal, LIST_PER_PAGE);

  /* ── Detail state ── */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [slowAction, setSlowAction] = useState(false);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [itemStatusFilter, setItemStatusFilter] = useState<ItemStatusFilter>("");
  const detailPagination = usePagination(detail?.total ?? 0, DETAIL_PER_PAGE);

  useEffect(() => {
    if (actionLoading) {
      slowTimerRef.current = setTimeout(() => setSlowAction(true), 5000);
    } else {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
      slowTimerRef.current = null;
      setSlowAction(false);
    }
    return () => {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    };
  }, [actionLoading]);

  /* ── Fetch list ── */

  const fetchSubmissions = useCallback(async () => {
    if (!clanContext?.clanId) {
      setSubmissions([]);
      setListTotal(0);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({
        clan_id: clanContext.clanId,
        page: String(listPagination.page),
        per_page: String(LIST_PER_PAGE),
      });
      if (statusFilter) params.set("status", statusFilter);
      if (typeFilter) params.set("type", typeFilter);

      const res = await fetch(`/api/import/submissions?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error((body as { error?: string } | null)?.error ?? t("loadError"));
      }
      const json = (await res.json()) as { data: SubmissionsResponse };
      setSubmissions(json.data.submissions);
      setListTotal(json.data.total);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : t("loadError"));
      setSubmissions([]);
      setListTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [clanContext?.clanId, listPagination.page, statusFilter, typeFilter, t]);

  useEffect(() => {
    void fetchSubmissions();
  }, [fetchSubmissions, retryCount]);

  /* ── Fetch detail ── */

  const fetchDetail = useCallback(async () => {
    if (!selectedId) return;
    setDetailLoading(true);
    setDetailError(null);
    try {
      const params = new URLSearchParams({
        page: String(detailPagination.page),
        per_page: String(DETAIL_PER_PAGE),
      });
      if (itemStatusFilter) params.set("item_status", itemStatusFilter);

      const res = await fetch(`/api/import/submissions/${selectedId}?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error((body as { error?: string } | null)?.error ?? t("loadError"));
      }
      const json = (await res.json()) as { data: DetailResponse };
      setDetail(json.data);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : t("loadError"));
    } finally {
      setDetailLoading(false);
    }
  }, [selectedId, detailPagination.page, itemStatusFilter, t]);

  useEffect(() => {
    if (selectedId) void fetchDetail();
  }, [fetchDetail, selectedId]);

  /* ── Actions (shared) ── */

  const [busyRowId, setBusyRowId] = useState<string | null>(null);

  const handleReviewById = useCallback(
    async (targetId: string, action: string) => {
      if (actionLoading || busyRowId) return;
      setBusyRowId(targetId);
      if (targetId === selectedId) setActionLoading(true);
      try {
        const res = await fetch(`/api/import/submissions/${targetId}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error((body as { error?: string } | null)?.error ?? t("reviewError"));
        }
        if (targetId === selectedId) void fetchDetail();
        setRetryCount((c) => c + 1);
      } catch (err) {
        const msg = err instanceof Error ? err.message : t("reviewError");
        if (targetId === selectedId) setDetailError(msg);
        else setLoadError(msg);
      } finally {
        setBusyRowId(null);
        setActionLoading(false);
      }
    },
    [actionLoading, busyRowId, selectedId, fetchDetail, t],
  );

  const handleReview = useCallback(
    async (action: string) => {
      if (!selectedId) return;
      await handleReviewById(selectedId, action);
    },
    [selectedId, handleReviewById],
  );

  const handleDeleteById = useCallback(
    async (targetId: string, status: string) => {
      if (actionLoading || busyRowId) return;
      const msg = status !== "pending" && status !== "partial" ? t("deleteConfirmApproved") : t("deleteConfirm");
      if (!window.confirm(msg)) return;
      setBusyRowId(targetId);
      if (targetId === selectedId) setActionLoading(true);
      try {
        const res = await fetch(`/api/import/submissions/${targetId}`, { method: "DELETE" });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error((body as { error?: string } | null)?.error ?? t("deleteError"));
        }
        if (targetId === selectedId) {
          setSelectedId(null);
          setDetail(null);
        }
        setRetryCount((c) => c + 1);
      } catch (err) {
        const msg2 = err instanceof Error ? err.message : t("deleteError");
        if (targetId === selectedId) setDetailError(msg2);
        else setLoadError(msg2);
      } finally {
        setBusyRowId(null);
        setActionLoading(false);
      }
    },
    [actionLoading, busyRowId, selectedId, t],
  );

  const handleDelete = useCallback(async () => {
    if (!selectedId) return;
    const sub = detail?.submission;
    await handleDeleteById(selectedId, sub?.status ?? "pending");
  }, [selectedId, detail, handleDeleteById]);

  const handleBack = useCallback(() => {
    setSelectedId(null);
    setDetail(null);
    setItemStatusFilter("");
    detailPagination.setPage(1);
  }, [detailPagination]);

  /* ── Detail helpers ── */

  const totalAllItems = detail ? Object.values(detail.statusCounts).reduce((sum, n) => sum + n, 0) : 0;
  function getTabCount(filter: ItemStatusFilter): number {
    if (!detail) return 0;
    if (filter === "") return totalAllItems;
    return detail.statusCounts[filter] ?? 0;
  }

  function renderTableHeader(type: string): ReactElement {
    if (type === "chests") {
      return (
        <header>
          <span>{t("colPlayer")}</span>
          <span>{t("colChestName")}</span>
          <span>{t("colSource")}</span>
          <span>{t("colLevel")}</span>
          <span>{t("colDate")}</span>
          <span>{t("colStatus")}</span>
          <span>{t("colMatchedAccount")}</span>
        </header>
      );
    }
    if (type === "members") {
      return (
        <header>
          <span>{t("colPlayer")}</span>
          <span>{t("colCoordinates")}</span>
          <span>{t("colScore")}</span>
          <span>{t("colDate")}</span>
          <span>{t("colStatus")}</span>
          <span>{t("colMatchedAccount")}</span>
        </header>
      );
    }
    return (
      <header>
        <span>{t("colPlayer")}</span>
        <span>{t("colEventName")}</span>
        <span>{t("colPoints")}</span>
        <span>{t("colDate")}</span>
        <span>{t("colStatus")}</span>
        <span>{t("colMatchedAccount")}</span>
      </header>
    );
  }

  function renderRow(entry: StagedEntry, type: string): ReactElement {
    if (type === "chests") {
      return (
        <>
          <span>{entry.player_name}</span>
          <span>{entry.chest_name ?? "—"}</span>
          <span>{entry.source ?? "—"}</span>
          <span>{entry.level ?? "—"}</span>
          <span>{entry.opened_at ? new Date(entry.opened_at).toLocaleDateString() : "—"}</span>
          <span>
            <span className={statusBadgeClass(entry.item_status)}>{t(`itemStatus_${entry.item_status}`)}</span>
          </span>
          <span>{entry.game_accounts?.game_username ?? "—"}</span>
        </>
      );
    }
    if (type === "members") {
      return (
        <>
          <span>{entry.player_name}</span>
          <span>{entry.coordinates ?? "—"}</span>
          <span>{entry.score != null ? Number(entry.score).toLocaleString() : "—"}</span>
          <span>{entry.captured_at ? new Date(entry.captured_at).toLocaleDateString() : "—"}</span>
          <span>
            <span className={statusBadgeClass(entry.item_status)}>{t(`itemStatus_${entry.item_status}`)}</span>
          </span>
          <span>{entry.game_accounts?.game_username ?? "—"}</span>
        </>
      );
    }
    return (
      <>
        <span>{entry.player_name}</span>
        <span>{entry.event_name ?? "—"}</span>
        <span>{entry.event_points != null ? Number(entry.event_points).toLocaleString() : "—"}</span>
        <span>{entry.captured_at ? new Date(entry.captured_at).toLocaleDateString() : "—"}</span>
        <span>
          <span className={statusBadgeClass(entry.item_status)}>{t(`itemStatus_${entry.item_status}`)}</span>
        </span>
        <span>{entry.game_accounts?.game_username ?? "—"}</span>
      </>
    );
  }

  /* ── Render: Detail loading ── */

  if (selectedId && !detail) {
    return (
      <div>
        <button type="button" className="button" onClick={handleBack} style={{ marginBottom: 16 }}>
          ← {t("backToList")}
        </button>
        <DataState
          isLoading={detailLoading}
          error={detailError}
          isEmpty={false}
          loadingMessage={t("loading")}
          onRetry={() => void fetchDetail()}
        >
          <span />
        </DataState>
      </div>
    );
  }

  /* ── Render: Detail view ── */

  if (selectedId && detail) {
    const sub = detail.submission;
    const reviewable = sub.status === "pending" || sub.status === "partial";

    return (
      <div>
        <button type="button" className="button" onClick={handleBack} style={{ marginBottom: 16 }}>
          ← {t("backToList")}
        </button>

        {/* Submission header */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div>
              <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ textTransform: "capitalize" }}>{sub.submission_type}</span>
                <span className={statusBadgeClass(sub.status)}>{t(`status_${sub.status}`)}</span>
              </div>
              <div className="card-subtitle">
                {t("submittedBy", { name: sub.profiles?.display_name ?? "—" })}
                {" · "}
                {new Date(sub.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
          <div className="card-body" style={{ display: "flex", gap: 24, flexWrap: "wrap", fontSize: "0.85rem" }}>
            <span>
              {t("totalItems")}: <strong>{sub.total_items ?? 0}</strong>
            </span>
            <span>
              {t("matchedItems")}: <strong>{sub.matched_count ?? 0}</strong>
            </span>
            <span>
              {t("approvedItems")}: <strong>{sub.approved_count ?? 0}</strong>
            </span>
            <span>
              {t("rejectedItems")}: <strong>{sub.rejected_count ?? 0}</strong>
            </span>
          </div>

          {!roleLoading && (isContentManager || isAdmin) && (
            <div
              className="card-body"
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                alignItems: "center",
                borderTop: "1px solid var(--color-gold-a10)",
                paddingTop: 12,
              }}
            >
              {isContentManager && reviewable && (
                <>
                  <button
                    type="button"
                    className="button primary"
                    disabled={actionLoading}
                    onClick={() => handleReview("approve_all")}
                  >
                    {t("approveAll")}
                  </button>
                  <button
                    type="button"
                    className="button"
                    disabled={actionLoading}
                    onClick={() => handleReview("approve_matched")}
                  >
                    {t("approveMatchedOnly")}
                  </button>
                  <button
                    type="button"
                    className="button danger"
                    disabled={actionLoading}
                    onClick={() => handleReview("reject_all")}
                  >
                    {t("rejectAll")}
                  </button>
                </>
              )}
              {slowAction && (
                <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", fontStyle: "italic" }}>
                  {t("serverBusy")}
                </span>
              )}
              {isAdmin && (
                <button
                  type="button"
                  className="button danger"
                  disabled={actionLoading}
                  onClick={handleDelete}
                  style={{ marginLeft: "auto" }}
                >
                  {t("deleteSubmission")}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Status filter tabs */}
        <div className="tabs" style={{ marginBottom: 12 }}>
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={`tab${itemStatusFilter === tab.value ? " active" : ""}`}
              onClick={() => {
                setItemStatusFilter(tab.value);
                detailPagination.setPage(1);
              }}
            >
              {t(tab.labelKey)} <span className="tab-count">{getTabCount(tab.value)}</span>
            </button>
          ))}
        </div>

        {/* Staged entries table */}
        <DataState
          isLoading={detailLoading}
          error={detailError}
          isEmpty={detail.items.length === 0}
          loadingMessage={t("loadingEntries")}
          emptyMessage={t("noEntries")}
        >
          <section className="table submissions-detail">
            {renderTableHeader(sub.submission_type)}
            {detail.items.map((entry) => (
              <div key={entry.id} className="row">
                {renderRow(entry, sub.submission_type)}
              </div>
            ))}
          </section>
          <PaginationBar pagination={detailPagination} pageSizeOptions={[50]} idPrefix="detail" compact />
        </DataState>
      </div>
    );
  }

  /* ── Render: List view ── */

  if (!clanContext?.clanId && !isLoading) {
    return (
      <div className="card">
        <div className="card-body text-text-muted">{t("noClanSelected")}</div>
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div
        className="filter-bar"
        style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 16 }}
      >
        <label>
          <span className="filter-bar-spacer">{t("statusLabel")}</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as StatusFilter);
              listPagination.setPage(1);
            }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="filter-bar-spacer">{t("typeLabel")}</span>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as TypeFilter);
              listPagination.setPage(1);
            }}
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <DataState
        isLoading={isLoading}
        error={loadError}
        isEmpty={submissions.length === 0}
        loadingMessage={t("loading")}
        onRetry={() => setRetryCount((c) => c + 1)}
        emptyMessage={t("noSubmissions")}
        emptySubtitle={t("noSubmissionsHint")}
      >
        <section className="table submissions-list">
          <header>
            <span>{t("colType")}</span>
            <span>{t("colStatus")}</span>
            <span>{t("colItems")}</span>
            <span>{t("colMatched")}</span>
            <span>{t("colSubmittedBy")}</span>
            <span>{t("colDate")}</span>
            <span>{t("colActions")}</span>
          </header>
          {submissions.map((sub) => {
            const rowBusy = busyRowId === sub.id;
            const anyBusy = !!busyRowId;
            const rowReviewable = sub.status === "pending" || sub.status === "partial";

            return (
              <div
                key={sub.id}
                className="row"
                role="button"
                tabIndex={0}
                onClick={() => setSelectedId(sub.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedId(sub.id);
                  }
                }}
                style={{ cursor: "pointer" }}
              >
                <span style={{ textTransform: "capitalize" }}>{sub.submission_type}</span>
                <span>
                  <span className={statusBadgeClass(sub.status)}>{t(`status_${sub.status}`)}</span>
                </span>
                <span>{sub.total_items ?? 0}</span>
                <span>{sub.matched_count ?? 0}</span>
                <span>{sub.profiles?.display_name ?? "—"}</span>
                <span>{new Date(sub.created_at).toLocaleDateString()}</span>
                <span
                  style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  {!roleLoading && isContentManager && rowReviewable && (
                    <>
                      <button
                        type="button"
                        className="button primary compact"
                        disabled={anyBusy}
                        title={t("approveAll")}
                        onClick={() => handleReviewById(sub.id, "approve_all")}
                      >
                        {rowBusy ? "…" : "✓"}
                      </button>
                      <button
                        type="button"
                        className="button danger compact"
                        disabled={anyBusy}
                        title={t("rejectAll")}
                        onClick={() => handleReviewById(sub.id, "reject_all")}
                      >
                        {rowBusy ? "…" : "✗"}
                      </button>
                    </>
                  )}
                  {!roleLoading && isAdmin && (
                    <button
                      type="button"
                      className="button danger compact"
                      disabled={anyBusy}
                      title={t("deleteSubmission")}
                      onClick={() => handleDeleteById(sub.id, sub.status)}
                    >
                      {rowBusy ? "…" : "🗑"}
                    </button>
                  )}
                  <button
                    type="button"
                    className="button compact"
                    disabled={anyBusy}
                    onClick={() => setSelectedId(sub.id)}
                  >
                    {t("viewDetail")}
                  </button>
                </span>
              </div>
            );
          })}
        </section>
        <PaginationBar pagination={listPagination} pageSizeOptions={[20]} idPrefix="submissions" compact />
      </DataState>
    </div>
  );
}
