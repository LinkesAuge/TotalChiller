"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSupabase } from "../../hooks/use-supabase";
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

interface Submission {
  readonly id: string;
  readonly submission_type: string;
  readonly status: string;
  readonly item_count: number | null;
  readonly matched_count: number | null;
  readonly approved_count: number | null;
  readonly rejected_count: number | null;
  readonly created_at: string;
  readonly profiles: SubmissionProfile | null;
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
  readonly submission: Submission;
  readonly items: readonly StagedEntry[];
  readonly total: number;
  readonly page: number;
  readonly perPage: number;
  readonly statusCounts: Record<string, number>;
}

type ItemStatusFilter = "" | "pending" | "auto_matched" | "approved" | "rejected";

const PER_PAGE = 50;

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
    case "auto_matched":
      return "badge warning";
    case "partial":
      return "badge warning";
    default:
      return "badge info";
  }
}

/* ── Component ── */

function SubmissionDetailClient(): JSX.Element {
  const t = useTranslations("submissions");
  const router = useRouter();
  const params = useParams();
  const supabase = useSupabase();
  const { isAdmin, isContentManager, loading: roleLoading } = useUserRole(supabase);

  const id = params.id as string;

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [items, setItems] = useState<readonly StagedEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [slowAction, setSlowAction] = useState(false);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [itemStatusFilter, setItemStatusFilter] = useState<ItemStatusFilter>("");

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

  const pagination = usePagination(total, PER_PAGE);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        per_page: String(PER_PAGE),
      });
      if (itemStatusFilter) params.set("item_status", itemStatusFilter);

      const res = await fetch(`/api/import/submissions/${id}?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error((body as { error?: string } | null)?.error ?? t("loadError"));
      }
      const json = (await res.json()) as { data: DetailResponse };
      setSubmission(json.data.submission);
      setItems(json.data.items);
      setTotal(json.data.total);
      setStatusCounts(json.data.statusCounts);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : t("loadError"));
      setSubmission(null);
      setItems([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [id, pagination.page, itemStatusFilter, t]);

  useEffect(() => {
    void fetchDetail();
  }, [fetchDetail, retryCount]);

  const handleRetry = useCallback(() => {
    setLoadError(null);
    setRetryCount((c) => c + 1);
  }, []);

  const handleReview = useCallback(
    async (action: string) => {
      if (!id || actionLoading) return;
      setActionLoading(true);
      try {
        const res = await fetch(`/api/import/submissions/${id}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error((body as { error?: string } | null)?.error ?? t("reviewError"));
        }
        setRetryCount((c) => c + 1);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : t("reviewError"));
      } finally {
        setActionLoading(false);
      }
    },
    [id, actionLoading, t],
  );

  const handleDelete = useCallback(async () => {
    if (!id || actionLoading) return;
    const msg =
      submission && submission.status !== "pending" && submission.status !== "partial"
        ? t("deleteConfirmApproved")
        : t("deleteConfirm");
    if (!window.confirm(msg)) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/import/submissions/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error((body as { error?: string } | null)?.error ?? t("deleteError"));
      }
      router.push("/admin?tab=data");
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : t("deleteError"));
      setActionLoading(false);
    }
  }, [id, actionLoading, submission, router, t]);

  const handleTabChange = useCallback(
    (filter: ItemStatusFilter) => {
      setItemStatusFilter(filter);
      pagination.setPage(1);
    },
    [pagination],
  );

  const totalAllItems = Object.values(statusCounts).reduce((sum, n) => sum + n, 0);

  function getTabCount(filter: ItemStatusFilter): number {
    if (filter === "") return totalAllItems;
    return statusCounts[filter] ?? 0;
  }

  function renderChestColumns(entry: StagedEntry): JSX.Element {
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

  function renderMemberColumns(entry: StagedEntry): JSX.Element {
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

  function renderEventColumns(entry: StagedEntry): JSX.Element {
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

  function renderTableHeader(): JSX.Element {
    const type = submission?.submission_type;
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

  function renderRow(entry: StagedEntry): JSX.Element {
    const type = submission?.submission_type;
    if (type === "chests") return renderChestColumns(entry);
    if (type === "members") return renderMemberColumns(entry);
    return renderEventColumns(entry);
  }

  return (
    <div className="content-inner">
      <button
        type="button"
        className="button"
        onClick={() => router.push("/admin?tab=data")}
        style={{ marginBottom: 16 }}
      >
        ← {t("backToList")}
      </button>

      <DataState
        isLoading={isLoading && !submission}
        error={loadError}
        isEmpty={!submission}
        loadingMessage={t("loading")}
        onRetry={handleRetry}
        emptyMessage={t("notFound")}
      >
        {submission && (
          <>
            {/* Submission header */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <div>
                  <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ textTransform: "capitalize" }}>{submission.submission_type}</span>
                    <span className={statusBadgeClass(submission.status)}>{t(`status_${submission.status}`)}</span>
                  </div>
                  <div className="card-subtitle">
                    {t("submittedBy", { name: submission.profiles?.display_name ?? "—" })}
                    {" · "}
                    {new Date(submission.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="card-body" style={{ display: "flex", gap: 24, flexWrap: "wrap", fontSize: "0.85rem" }}>
                <span>
                  {t("totalItems")}: <strong>{submission.item_count ?? 0}</strong>
                </span>
                <span>
                  {t("matchedItems")}: <strong>{submission.matched_count ?? 0}</strong>
                </span>
                <span>
                  {t("approvedItems")}: <strong>{submission.approved_count ?? 0}</strong>
                </span>
                <span>
                  {t("rejectedItems")}: <strong>{submission.rejected_count ?? 0}</strong>
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
                  {isContentManager && (submission.status === "pending" || submission.status === "partial") && (
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
                  onClick={() => handleTabChange(tab.value)}
                >
                  {t(tab.labelKey)}
                  <span className="tab-count">{getTabCount(tab.value)}</span>
                </button>
              ))}
            </div>

            {/* Staged entries table */}
            <DataState
              isLoading={isLoading && !!submission}
              error={null}
              isEmpty={items.length === 0}
              loadingMessage={t("loadingEntries")}
              emptyMessage={t("noEntries")}
            >
              <section className="table submissions-detail">
                {renderTableHeader()}
                {items.map((entry) => (
                  <div key={entry.id} className="row">
                    {renderRow(entry)}
                  </div>
                ))}
              </section>
              <PaginationBar pagination={pagination} pageSizeOptions={[50]} idPrefix="detail" compact />
            </DataState>
          </>
        )}
      </DataState>
    </div>
  );
}

export default SubmissionDetailClient;
