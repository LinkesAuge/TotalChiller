"use client";

import type { ReactElement } from "react";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useSupabase } from "@/app/hooks/use-supabase";
import useClanContext from "@/app/hooks/use-clan-context";
import { useUserRole } from "@/lib/hooks/use-user-role";
import PageShell from "@/app/components/page-shell";
import DataState from "@/app/components/data-state";
import PaginationBar from "@/app/components/pagination-bar";
import GameAlert from "@/app/components/ui/game-alert";
import RadixSelect, { type SelectOption } from "@/app/components/ui/radix-select";
import { usePagination } from "@/lib/hooks/use-pagination";
import { formatBerlinDate } from "@/lib/timezone";
import { ImportPayloadSchema, type ImportPayload } from "@/lib/api/import-schemas";
import { formatLocalDateTime } from "@/lib/date-format";
import AnalyticsSubnav from "../analytics-subnav";

const ValidationListsPanel = dynamic(() => import("./validation-lists-panel"), { ssr: false });

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
  readonly item_count: number | null;
  readonly matched_count: number | null;
  readonly approved_count: number | null;
  readonly rejected_count: number | null;
  readonly created_at: string;
  readonly reference_date: string | null;
  readonly linked_event_id: string | null;
  readonly event_starts_at: string | null;
  readonly event_ends_at: string | null;
  readonly profiles: SubmissionProfile | null;
}

interface CalendarEvent {
  readonly id: string;
  readonly title: string;
  readonly starts_at: string;
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

interface ClanGameAccount {
  readonly id: string;
  readonly game_username: string;
}

interface DetailResponse {
  readonly submission: SubmissionRow;
  readonly items: readonly StagedEntry[];
  readonly total: number;
  readonly page: number;
  readonly perPage: number;
  readonly statusCounts: Record<string, number>;
  readonly clanGameAccounts: readonly ClanGameAccount[];
}

interface SubmissionResultItem {
  readonly id: string;
  readonly type: string;
  readonly itemCount: number;
  readonly autoMatchedCount: number;
  readonly unmatchedCount: number;
  readonly duplicateCount: number;
}

interface SubmitResponse {
  readonly submissions: readonly SubmissionResultItem[];
  readonly validationListsUpdated: boolean;
}

type ImportState = "idle" | "previewing" | "submitting" | "success" | "error";
type StatusFilter = "" | "pending" | "approved" | "rejected" | "partial";
type TypeFilter = "" | "chests" | "members" | "events";
type ItemStatusFilter = "" | "pending" | "auto_matched" | "approved" | "rejected";

/* ── Constants ── */

const LIST_PER_PAGE = 20;
const DETAIL_PER_PAGE = 250;

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

function formatEventDateRange(startsAt: string | null, endsAt: string | null): string {
  if (!startsAt) return "—";
  const startStr = formatBerlinDate(startsAt);
  if (!endsAt) return startStr;
  const endStr = formatBerlinDate(endsAt);
  if (startStr === endStr) return startStr;
  return `${startStr} – ${endStr}`;
}

/* ── Component ── */

export default function DatenClient(): ReactElement {
  const tAnalytics = useTranslations("analytics");

  return (
    <PageShell
      breadcrumb={tAnalytics("breadcrumb")}
      title={tAnalytics("dataTitle")}
      heroTitle={tAnalytics("heroTitle")}
      heroSubtitle={tAnalytics("heroSubtitle")}
      bannerSrc="/assets/game/bg/bg_14.jpg"
    >
      <AnalyticsSubnav />
      <DataContent />
    </PageShell>
  );
}

function DataContent(): ReactElement {
  const t = useTranslations("submissions");
  const tImport = useTranslations("import");
  const supabase = useSupabase();
  const clanContext = useClanContext();
  const { isAdmin, loading: roleLoading } = useUserRole(supabase);
  const [dataView, setDataView] = useState<"submissions" | "validationLists">("submissions");

  /* ── Import state ── */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [payload, setPayload] = useState<ImportPayload | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [importState, setImportState] = useState<ImportState>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitResponse | null>(null);
  const [conflictInfo, setConflictInfo] = useState<{
    conflicts: Array<{
      type: string;
      conflict: { existingDate: string; existingItemCount: number; existingStatus: string };
    }>;
  } | null>(null);

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
  const [metadataSaving, setMetadataSaving] = useState(false);
  const [metadataWarning, setMetadataWarning] = useState<string | null>(null);
  const [clanEvents, setClanEvents] = useState<readonly CalendarEvent[]>([]);

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

  /* ── Import handlers ── */

  const processFile = useCallback(
    (file: File) => {
      setValidationError(null);
      setSubmitError(null);
      setSubmitResult(null);
      setImportState("idle");

      if (!file.name.endsWith(".json")) {
        setValidationError(tImport("errorNotJson"));
        setFileName(file.name);
        setPayload(null);
        return;
      }

      setFileName(file.name);

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const raw = JSON.parse(e.target?.result as string);
          const result = ImportPayloadSchema.safeParse(raw);
          if (!result.success) {
            const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
            setValidationError(tImport("errorValidation", { details: issues }));
            setPayload(null);
            return;
          }
          setPayload(result.data);
          setValidationError(null);
          setImportState("previewing");
        } catch {
          setValidationError(tImport("errorParseFailed"));
          setPayload(null);
        }
      };
      reader.onerror = () => {
        setValidationError(tImport("errorReadFailed"));
        setPayload(null);
      };
      reader.readAsText(file);
    },
    [tImport],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleDropzoneClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const resetImport = useCallback(() => {
    setFileName(null);
    setPayload(null);
    setValidationError(null);
    setSubmitError(null);
    setSubmitResult(null);
    setImportState("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const submitImport = useCallback(
    async (overwrite = false) => {
      if (!payload) return;

      const needsClanId = !payload.clan.websiteClanId;
      const clanId = payload.clan.websiteClanId ?? clanContext?.clanId;

      if (needsClanId && !clanId) {
        setSubmitError(tImport("errorNoClan"));
        return;
      }

      setImportState("submitting");
      setSubmitError(null);
      setConflictInfo(null);

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) {
          setSubmitError(tImport("errorUnauthorized"));
          setImportState("error");
          return;
        }

        const url = new URL("/api/import/submit", window.location.origin);
        if (needsClanId && clanId) {
          url.searchParams.set("clan_id", clanId);
        }
        if (overwrite) {
          url.searchParams.set("overwrite", "true");
        }

        const res = await fetch(url.toString(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (res.status === 409) {
          const body = await res.json().catch(() => null);
          if (body?.conflicts) {
            setConflictInfo({ conflicts: body.conflicts });
            setImportState("idle");
            return;
          }
        }

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          setSubmitError(body?.error ?? tImport("errorSubmitFailed"));
          setImportState("error");
          return;
        }

        const body = await res.json();
        setSubmitResult(body.data as SubmitResponse);
        setImportState("success");
        setRetryCount((c) => c + 1);
      } catch {
        setSubmitError(tImport("errorSubmitFailed"));
        setImportState("error");
      }
    },
    [payload, clanContext, supabase, tImport],
  );

  const handleImportSubmit = useCallback(() => submitImport(false), [submitImport]);
  const handleOverwriteSubmit = useCallback(() => {
    setConflictInfo(null);
    void submitImport(true);
  }, [submitImport]);

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
        per_page: String(detailPagination.pageSize),
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
  }, [selectedId, detailPagination.page, detailPagination.pageSize, itemStatusFilter, t]);

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

  const [assigningEntryId, setAssigningEntryId] = useState<string | null>(null);

  const handleAssignPlayer = useCallback(
    async (entryId: string, gameAccountId: string | null) => {
      if (!selectedId) return;
      setAssigningEntryId(entryId);
      try {
        const targetEntry = detail?.items.find((i) => i.id === entryId);
        const wasApproved = targetEntry?.item_status === "approved";

        const res = await fetch(`/api/import/submissions/${selectedId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entryId,
            matchGameAccountId: gameAccountId || null,
            saveCorrection: !!gameAccountId,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error((body as { error?: string } | null)?.error ?? t("reviewError"));
        }
        const json = (await res.json()) as {
          data: {
            id: string;
            player_name: string;
            item_status: string;
            matched_game_account_id: string | null;
            game_accounts: MatchedAccount | null;
            matchedCount: number;
          };
        };
        const entry = json.data;

        if (wasApproved) {
          void fetchDetail();
        } else {
          setDetail((prev) => {
            if (!prev) return prev;
            const updatedItems = prev.items.map((item) =>
              item.id === entry.id
                ? { ...item, item_status: entry.item_status, game_accounts: entry.game_accounts }
                : item,
            );
            const oldStatus = prev.items.find((i) => i.id === entry.id)?.item_status;
            const newCounts = { ...prev.statusCounts };
            if (oldStatus && oldStatus !== entry.item_status) {
              newCounts[oldStatus] = Math.max(0, (newCounts[oldStatus] ?? 0) - 1);
              newCounts[entry.item_status] = (newCounts[entry.item_status] ?? 0) + 1;
            }
            return { ...prev, items: updatedItems, statusCounts: newCounts };
          });
        }

        setSubmissions((prev) =>
          prev.map((sub) => (sub.id === selectedId ? { ...sub, matched_count: entry.matchedCount } : sub)),
        );
      } catch (err) {
        setDetailError(err instanceof Error ? err.message : t("reviewError"));
      } finally {
        setAssigningEntryId(null);
      }
    },
    [selectedId, detail?.items, fetchDetail, t],
  );

  /* ── Metadata editing handlers ── */

  const handleUpdateReferenceDate = useCallback(
    async (newDate: string) => {
      if (!selectedId) return;
      setMetadataSaving(true);
      setMetadataWarning(null);
      try {
        const res = await fetch(`/api/import/submissions/${selectedId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ referenceDate: newDate || null }),
        });
        const body = (await res.json()) as { data?: { warnings?: string[] }; error?: string };
        if (!res.ok) throw new Error(body.error ?? t("reviewError"));
        if (body.data?.warnings?.length) {
          setMetadataWarning(body.data.warnings.join(" "));
        }
        void fetchDetail();
        setRetryCount((c) => c + 1);
      } catch (err) {
        setDetailError(err instanceof Error ? err.message : t("reviewError"));
      } finally {
        setMetadataSaving(false);
      }
    },
    [selectedId, fetchDetail, t],
  );

  const handleUpdateLinkedEvent = useCallback(
    async (eventId: string) => {
      if (!selectedId) return;
      setMetadataSaving(true);
      setMetadataWarning(null);
      try {
        const res = await fetch(`/api/import/submissions/${selectedId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ linkedEventId: eventId || null }),
        });
        const body = (await res.json()) as { data?: { warnings?: string[] }; error?: string };
        if (!res.ok) throw new Error(body.error ?? t("reviewError"));
        if (body.data?.warnings?.length) {
          setMetadataWarning(body.data.warnings.join(" "));
        }
        void fetchDetail();
        setRetryCount((c) => c + 1);
      } catch (err) {
        setDetailError(err instanceof Error ? err.message : t("reviewError"));
      } finally {
        setMetadataSaving(false);
      }
    },
    [selectedId, fetchDetail, t],
  );

  useEffect(() => {
    if (!detail || detail.submission.submission_type !== "events" || !clanContext?.clanId) {
      setClanEvents([]);
      return;
    }
    async function loadEvents(): Promise<void> {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, starts_at")
        .eq("clan_id", clanContext!.clanId)
        .order("starts_at", { ascending: false })
        .limit(200);
      if (!error && data) {
        setClanEvents(data as unknown as CalendarEvent[]);
      }
    }
    void loadEvents();
  }, [detail, clanContext, supabase]);

  const eventOptions: SelectOption[] = useMemo(() => {
    const opts: SelectOption[] = [{ value: "", label: t("noLinkedEvent") }];
    for (const evt of clanEvents) {
      const dateStr = formatBerlinDate(evt.starts_at);
      opts.push({ value: evt.id, label: `${evt.title} (${dateStr})` });
    }
    return opts;
  }, [clanEvents, t]);

  const handleBack = useCallback(() => {
    setSelectedId(null);
    setDetail(null);
    setItemStatusFilter("");
    setMetadataWarning(null);
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

  const canAssign = !roleLoading && isAdmin;
  const accountOptions: SelectOption[] = useMemo(() => {
    const ga = detail?.clanGameAccounts ?? [];
    return [{ value: "", label: "—" }, ...ga.map((a) => ({ value: a.id, label: a.game_username }))];
  }, [detail?.clanGameAccounts]);

  function renderMatchCell(entry: StagedEntry): ReactElement {
    if (!canAssign) {
      return <span>{entry.game_accounts?.game_username ?? "—"}</span>;
    }

    const busy = assigningEntryId === entry.id;
    return (
      <span>
        <RadixSelect
          value={entry.game_accounts?.id ?? ""}
          onValueChange={(val) => handleAssignPlayer(entry.id, val || null)}
          options={accountOptions}
          disabled={busy}
          placeholder={busy ? "…" : "—"}
          triggerClassName="select-trigger compact"
          enableSearch
          searchPlaceholder={t("searchPlayer")}
        />
      </span>
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
          <span>{entry.opened_at ? formatBerlinDate(entry.opened_at) : "—"}</span>
          <span>
            <span className={statusBadgeClass(entry.item_status)}>{t(`itemStatus_${entry.item_status}`)}</span>
          </span>
          {renderMatchCell(entry)}
        </>
      );
    }
    if (type === "members") {
      return (
        <>
          <span>{entry.player_name}</span>
          <span>{entry.coordinates ?? "—"}</span>
          <span>{entry.score != null ? Number(entry.score).toLocaleString() : "—"}</span>
          <span>{entry.captured_at ? formatBerlinDate(entry.captured_at) : "—"}</span>
          <span>
            <span className={statusBadgeClass(entry.item_status)}>{t(`itemStatus_${entry.item_status}`)}</span>
          </span>
          {renderMatchCell(entry)}
        </>
      );
    }
    return (
      <>
        <span>{entry.player_name}</span>
        <span>{entry.event_name ?? "—"}</span>
        <span>{entry.event_points != null ? Number(entry.event_points).toLocaleString() : "—"}</span>
        <span>{entry.captured_at ? formatBerlinDate(entry.captured_at) : "—"}</span>
        <span>
          <span className={statusBadgeClass(entry.item_status)}>{t(`itemStatus_${entry.item_status}`)}</span>
        </span>
        {renderMatchCell(entry)}
      </>
    );
  }

  /* ── Import preview helpers ── */
  const chestCount = payload?.data.chests?.length ?? 0;
  const memberCount = payload?.data.members?.length ?? 0;
  const eventCount = payload?.data.events?.length ?? 0;
  const needsClanSelector = payload && !payload.clan.websiteClanId;

  const dropzoneStyle: React.CSSProperties = {
    borderWidth: "1px",
    borderStyle: isDragOver ? "dashed" : fileName && !validationError ? "solid" : "dashed",
    borderColor: isDragOver
      ? "var(--color-gold)"
      : fileName && !validationError
        ? "var(--color-gold-a50)"
        : "var(--color-border)",
    borderRadius: "6px",
    background: isDragOver ? "var(--color-gold-a08)" : "var(--color-surface-elevated)",
    padding: "6px 12px",
    cursor: "pointer",
    transition: "border-color 0.15s ease, background-color 0.15s ease",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "0.82rem",
    whiteSpace: "nowrap",
  };

  function renderImportFeedback(): ReactElement | null {
    if (validationError) {
      return (
        <GameAlert variant="error" title={tImport("validationFailed")} className="mt-3">
          <pre
            style={{ fontSize: "0.78rem", whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0, lineHeight: 1.5 }}
          >
            {validationError}
          </pre>
        </GameAlert>
      );
    }

    if (importState === "error" && submitError) {
      return (
        <GameAlert variant="error" title={submitError} className="mt-3">
          <button type="button" className="button compact" onClick={resetImport} style={{ marginTop: 6 }}>
            {tImport("tryAgain")}
          </button>
        </GameAlert>
      );
    }

    if (importState === "previewing" && payload) {
      return (
        <div className="card" style={{ marginTop: 12, padding: "10px 14px" }}>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", fontSize: "0.82rem" }}>
            <span>
              <strong>{tImport("previewClan")}:</strong> {payload.clan.name}
            </span>
            <span>
              <strong>{tImport("previewSource")}:</strong> {payload.source}
            </span>
            {chestCount > 0 && (
              <span>
                {chestCount} {tImport("previewChests")}
              </span>
            )}
            {memberCount > 0 && (
              <span>
                {memberCount} {tImport("previewMembers")}
              </span>
            )}
            {eventCount > 0 && (
              <span>
                {eventCount} {tImport("previewEvents")}
              </span>
            )}
            {needsClanSelector && !clanContext?.clanId && (
              <span style={{ color: "var(--color-gold-2)" }}>{tImport("clanSelectPrompt")}</span>
            )}
            <span style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              <button
                type="button"
                className="button primary compact"
                disabled={importState !== "previewing" || (!!needsClanSelector && !clanContext?.clanId)}
                onClick={handleImportSubmit}
              >
                {tImport("submitButton")}
              </button>
              <button type="button" className="button compact" onClick={resetImport}>
                {tImport("resetButton")}
              </button>
            </span>
          </div>
        </div>
      );
    }

    if (conflictInfo) {
      return (
        <div className="card" style={{ marginTop: 12, padding: "12px 14px", borderColor: "var(--color-warning)" }}>
          <div style={{ fontSize: "0.85rem" }}>
            <p style={{ color: "var(--color-warning)", fontWeight: 600, margin: "0 0 8px" }}>⚠ {t("conflictTitle")}</p>
            {conflictInfo.conflicts.map((c) => (
              <p key={c.type} style={{ margin: "0 0 4px" }}>
                <span style={{ textTransform: "capitalize" }}>{c.type}</span>:{" "}
                {t("conflictDescription", {
                  date: c.conflict.existingDate,
                  count: String(c.conflict.existingItemCount),
                  status: c.conflict.existingStatus,
                })}
              </p>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button type="button" className="button danger compact" onClick={handleOverwriteSubmit}>
                {t("overwrite")}
              </button>
              <button type="button" className="button compact" onClick={() => setConflictInfo(null)}>
                {t("cancelOverwrite")}
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (importState === "success" && submitResult) {
      return (
        <div className="card" style={{ marginTop: 12, padding: "10px 14px" }}>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", fontSize: "0.82rem" }}>
            <span style={{ color: "#5ec07e", fontWeight: 600 }}>{tImport("successTitle")}</span>
            {submitResult.submissions.map((sub) => (
              <span key={sub.id}>
                <span style={{ textTransform: "capitalize" }}>{sub.type}</span>: {sub.itemCount} ({sub.autoMatchedCount}{" "}
                ✓)
              </span>
            ))}
            {submitResult.validationListsUpdated && (
              <span style={{ color: "var(--color-text-3)" }}>{tImport("validationListsUpdated")}</span>
            )}
            <button type="button" className="button compact" onClick={resetImport} style={{ marginLeft: "auto" }}>
              {tImport("importAnother")}
            </button>
          </div>
        </div>
      );
    }

    return null;
  }

  /* ── View toggle (admin only) ── */
  const viewToggle = isAdmin ? (
    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
      <button
        type="button"
        className={`button compact ${dataView === "submissions" ? "primary" : ""}`}
        onClick={() => setDataView("submissions")}
      >
        {t("tabSubmissions")}
      </button>
      <button
        type="button"
        className={`button compact ${dataView === "validationLists" ? "primary" : ""}`}
        onClick={() => setDataView("validationLists")}
      >
        {t("tabValidationLists")}
      </button>
    </div>
  ) : null;

  if (isAdmin && dataView === "validationLists") {
    return (
      <div>
        {viewToggle}
        <ValidationListsPanel />
      </div>
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
                {formatLocalDateTime(sub.created_at)}
              </div>
            </div>
          </div>
          <div className="card-body" style={{ display: "flex", gap: 24, flexWrap: "wrap", fontSize: "0.85rem" }}>
            <span>
              {t("totalItems")}: <strong>{sub.item_count ?? 0}</strong>
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

          {/* Metadata editing: reference date and event linking (admin only) */}
          {isAdmin && (
            <div
              className="card-body"
              style={{
                display: "flex",
                gap: 16,
                flexWrap: "wrap",
                alignItems: "center",
                borderTop: "1px solid var(--color-gold-a10)",
                paddingTop: 12,
                fontSize: "0.85rem",
              }}
            >
              {sub.submission_type === "members" && (
                <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span className="text-muted">{t("dataFromDate")}:</span>
                  <input
                    type="date"
                    value={sub.reference_date ?? ""}
                    disabled={metadataSaving}
                    onChange={(e) => handleUpdateReferenceDate(e.target.value)}
                    style={{ padding: "4px 8px", fontSize: "0.85rem" }}
                  />
                </label>
              )}
              {sub.submission_type === "events" && (
                <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span className="text-muted">{t("linkedEvent")}:</span>
                  <RadixSelect
                    value={sub.linked_event_id ?? ""}
                    onValueChange={handleUpdateLinkedEvent}
                    options={eventOptions}
                    disabled={metadataSaving}
                    placeholder={t("noLinkedEvent")}
                    triggerClassName="select-trigger compact"
                    enableSearch
                    searchPlaceholder={t("searchEvent")}
                  />
                </label>
              )}
              {sub.submission_type === "chests" && sub.reference_date && (
                <span className="text-muted">
                  {t("dataFromDate")}: {formatBerlinDate(sub.reference_date)}
                </span>
              )}
              {metadataSaving && (
                <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", fontStyle: "italic" }}>
                  {t("saving")}
                </span>
              )}
              {metadataWarning && (
                <span style={{ fontSize: "0.8rem", color: "var(--color-warning)" }}>⚠ {metadataWarning}</span>
              )}
            </div>
          )}

          {!roleLoading && isAdmin && (
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
              {isAdmin && reviewable && (
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

        <PaginationBar pagination={detailPagination} pageSizeOptions={[50, 100, 250, 500]} idPrefix="detail" />

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
          <PaginationBar
            pagination={detailPagination}
            pageSizeOptions={[50, 100, 250, 500]}
            idPrefix="detail-bottom"
            compact
          />
        </DataState>
      </div>
    );
  }

  /* ── Render: List view ── */

  if (!clanContext?.clanId && !isLoading) {
    return (
      <div>
        {viewToggle}
        <div className="card">
          <div className="card-body text-text-muted">{t("noClanSelected")}</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {viewToggle}
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

        {/* Compact file drop (admin only) */}
        {isAdmin && (
          <div
            role="button"
            tabIndex={0}
            style={dropzoneStyle}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              dragCounterRef.current += 1;
              setIsDragOver(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              dragCounterRef.current -= 1;
              if (dragCounterRef.current <= 0) {
                dragCounterRef.current = 0;
                setIsDragOver(false);
              }
            }}
            onDrop={handleDrop}
            onClick={handleDropzoneClick}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleDropzoneClick();
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileInput}
              style={{ display: "none" }}
            />
            {fileName ? (
              <span style={{ color: "var(--color-text-1)", fontWeight: 500 }}>{fileName}</span>
            ) : (
              <span style={{ color: "var(--color-text-3)" }}>{tImport("dropzoneCta")}</span>
            )}
            {importState === "submitting" && (
              <span style={{ color: "var(--color-text-3)", fontStyle: "italic" }}>{tImport("submitting")}</span>
            )}
          </div>
        )}
      </div>

      {isAdmin && renderImportFeedback()}

      <DataState
        isLoading={isLoading}
        error={loadError}
        isEmpty={submissions.length === 0}
        loadingMessage={t("loading")}
        onRetry={() => setRetryCount((c) => c + 1)}
        emptyMessage={t("noSubmissions")}
        emptySubtitle={t("noSubmissionsHint")}
      >
        <div className="table-scroll">
          <section className="table submissions-list">
            <header>
              <span>{t("colType")}</span>
              <span>{t("colStatus")}</span>
              <span>{t("colItems")}</span>
              <span>{t("colMatched")}</span>
              <span>{t("colSubmittedBy")}</span>
              <span>{t("colReferenceDate")}</span>
              <span>{t("colEventDate")}</span>
              <span>{t("colSubmittedAt")}</span>
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
                  <span>{sub.item_count ?? 0}</span>
                  <span>{sub.matched_count ?? 0}</span>
                  <span>{sub.profiles?.display_name ?? "—"}</span>
                  <span>{sub.reference_date ? formatBerlinDate(sub.reference_date + "T00:00:00") : "—"}</span>
                  <span>{formatEventDateRange(sub.event_starts_at, sub.event_ends_at)}</span>
                  <span>{formatLocalDateTime(sub.created_at)}</span>
                  <span
                    role="group"
                    style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    {!roleLoading && isAdmin && rowReviewable && (
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
        </div>
        <PaginationBar pagination={listPagination} pageSizeOptions={[20]} idPrefix="submissions" compact />
      </DataState>
    </div>
  );
}
