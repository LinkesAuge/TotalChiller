"use client";

import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import { useLocale, useTranslations } from "next-intl";
import SearchInput from "../../components/ui/search-input";
import LabeledSelect from "../../components/ui/labeled-select";
import PaginationBar from "@/app/components/pagination-bar";
import { usePagination } from "@/lib/hooks/use-pagination";
import { useAdminContext } from "../admin-context";
import type { AuditLogRow, ProfileRow } from "../admin-types";
import { formatLocalDateTime } from "../../../lib/date-format";

/**
 * Admin Logs tab — paginated audit log viewer with filters.
 */
export default function LogsTab(): ReactElement {
  const { supabase, clans, selectedClanId, setStatus } = useAdminContext();
  const tAdmin = useTranslations("admin");
  const locale = useLocale();

  /* ── Local state ── */
  const [auditLogs, setAuditLogs] = useState<readonly AuditLogRow[]>([]);
  const [auditActorsById, setAuditActorsById] = useState<Record<string, ProfileRow>>({});
  const [auditTotalCount, setAuditTotalCount] = useState(0);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState("all");
  const [auditEntityFilter, setAuditEntityFilter] = useState("all");
  const [auditActorFilter, setAuditActorFilter] = useState("all");
  const [auditClanFilter, setAuditClanFilter] = useState("all");

  const pagination = usePagination(auditTotalCount);

  /* ── Derived filter options ── */
  const auditActionOptions = useMemo(() => Array.from(new Set(auditLogs.map((e) => e.action))), [auditLogs]);
  const auditEntityOptions = useMemo(() => Array.from(new Set(auditLogs.map((e) => e.entity))), [auditLogs]);
  const auditActorOptions = useMemo(() => Array.from(new Set(auditLogs.map((e) => e.actor_id))), [auditLogs]);

  /* ── Helpers ── */
  const getActorLabel = useCallback(
    (actorId: string): string => {
      const profile = auditActorsById[actorId];
      if (!profile) return actorId.slice(0, 8);
      return profile.display_name ?? profile.username ?? profile.email;
    },
    [auditActorsById],
  );

  const getDiffSummary = useCallback((diff: Record<string, unknown> | null): string => {
    if (!diff) return "—";
    const keys = Object.keys(diff);
    return keys.length === 0 ? "—" : keys.join(", ");
  }, []);

  const formatTimestamp = useCallback((iso: string): string => formatLocalDateTime(iso, locale), [locale]);

  /* ── Reset page on filter change ── */
  const resetPage = pagination.setPage;
  useEffect(() => {
    resetPage(1);
  }, [resetPage, auditActionFilter, auditActorFilter, auditClanFilter, auditEntityFilter, auditSearch, selectedClanId]);

  /* ── Load audit logs ── */
  useEffect(() => {
    async function load(): Promise<void> {
      if (!selectedClanId) {
        setAuditLogs([]);
        setAuditActorsById({});
        setAuditTotalCount(0);
        return;
      }
      const from = pagination.startIndex;
      const to = from + pagination.pageSize - 1;

      let query = supabase
        .from("audit_logs")
        .select("id,clan_id,actor_id,action,entity,entity_id,diff,created_at", { count: "exact" });

      const clanId = auditClanFilter !== "all" ? auditClanFilter : selectedClanId;
      if (clanId) query = query.eq("clan_id", clanId);
      if (auditActionFilter !== "all") query = query.eq("action", auditActionFilter);
      if (auditEntityFilter !== "all") query = query.eq("entity", auditEntityFilter);
      if (auditActorFilter !== "all") query = query.eq("actor_id", auditActorFilter);
      if (auditSearch.trim()) {
        const p = `%${auditSearch.trim()}%`;
        query = query.or(`action.ilike.${p},entity.ilike.${p},entity_id.ilike.${p}`);
      }

      const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, to);
      if (error) {
        setStatus(`Failed to load audit logs: ${error.message}`);
        return;
      }
      const rows = data ?? [];
      setAuditTotalCount(count ?? 0);
      setAuditLogs(rows);

      const actorIds = Array.from(new Set(rows.map((r) => r.actor_id)));
      if (actorIds.length === 0) {
        setAuditActorsById({});
        return;
      }
      const { data: actorData, error: actorErr } = await supabase
        .from("profiles")
        .select("id,email,display_name,username")
        .in("id", actorIds);
      if (actorErr) {
        setStatus(`Failed to load audit actors: ${actorErr.message}`);
        return;
      }
      const map = (actorData ?? []).reduce<Record<string, ProfileRow>>((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {});
      setAuditActorsById(map);
    }
    void load();
  }, [
    supabase,
    selectedClanId,
    auditClanFilter,
    auditActionFilter,
    auditEntityFilter,
    auditActorFilter,
    auditSearch,
    pagination.page,
    pagination.pageSize,
    pagination.startIndex,
    setStatus,
  ]);

  /* ── Reset filters ── */
  const handleReset = useCallback(() => {
    setAuditSearch("");
    setAuditClanFilter("all");
    setAuditActionFilter("all");
    setAuditEntityFilter("all");
    setAuditActorFilter("all");
    pagination.setPage(1);
  }, [pagination]);

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <div className="card-title">{tAdmin("logs.title")}</div>
          <div className="card-subtitle">{tAdmin("logs.subtitle")}</div>
        </div>
        <span className="badge">
          {auditTotalCount} {tAdmin("logs.total")}
        </span>
      </div>

      {/* ── Filters ── */}
      <div className="list inline admin-members-filters filter-bar admin-filter-row">
        <SearchInput
          id="auditSearch"
          label={tAdmin("common.search")}
          value={auditSearch}
          onChange={setAuditSearch}
          placeholder={tAdmin("logs.searchPlaceholder")}
        />
        <LabeledSelect
          id="auditClanFilter"
          label={tAdmin("common.clan")}
          value={auditClanFilter}
          onValueChange={setAuditClanFilter}
          options={[
            { value: "all", label: tAdmin("common.all") },
            ...clans.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
        <LabeledSelect
          id="auditActionFilter"
          label={tAdmin("logs.action")}
          value={auditActionFilter}
          onValueChange={setAuditActionFilter}
          options={[
            { value: "all", label: tAdmin("common.all") },
            ...auditActionOptions.map((o) => ({ value: o, label: o })),
          ]}
        />
        <LabeledSelect
          id="auditEntityFilter"
          label={tAdmin("logs.entity")}
          value={auditEntityFilter}
          onValueChange={setAuditEntityFilter}
          options={[
            { value: "all", label: tAdmin("common.all") },
            ...auditEntityOptions.map((o) => ({ value: o, label: o })),
          ]}
        />
        <LabeledSelect
          id="auditActorFilter"
          label={tAdmin("logs.actor")}
          value={auditActorFilter}
          onValueChange={setAuditActorFilter}
          options={[
            { value: "all", label: tAdmin("common.all") },
            ...auditActorOptions.map((id) => ({ value: id, label: getActorLabel(id) })),
          ]}
        />
        <button className="button" type="button" onClick={handleReset}>
          {tAdmin("common.reset")}
        </button>
        <span className="text-muted admin-filter-summary">
          {auditLogs.length} {tAdmin("common.shown")}
        </span>
      </div>

      {/* ── Pagination ── */}
      {auditTotalCount > 0 ? <PaginationBar pagination={pagination} idPrefix="audit" /> : null}

      {/* ── Log entries ── */}
      <div className="list">
        {auditLogs.length === 0 ? (
          <div className="list-item">
            <span>{tAdmin("logs.noEntries")}</span>
            <span className="badge">{tAdmin("logs.makeAChange")}</span>
          </div>
        ) : (
          auditLogs.map((entry) => (
            <div className="list-item" key={entry.id}>
              <div>
                <div>
                  {entry.action} &bull; {entry.entity}
                </div>
                <div className="text-muted">
                  {getActorLabel(entry.actor_id)} &bull; {formatTimestamp(entry.created_at)}
                </div>
              </div>
              <div className="list">
                <span className="badge">{getDiffSummary(entry.diff)}</span>
                <span className="text-muted">{entry.entity_id.slice(0, 8)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
