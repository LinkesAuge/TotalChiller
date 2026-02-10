"use client";

import { useCallback, useEffect, useState, type ReactElement } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useToast } from "../../components/toast-provider";
import TableScroll from "../../components/table-scroll";
import { formatLocalDateTime } from "../../../lib/date-format";
import { useAdminContext } from "../admin-context";

/**
 * Admin Approvals tab — lists pending game-account approvals with approve/reject actions.
 */
export default function ApprovalsTab(): ReactElement {
  const { pendingApprovals, setPendingApprovals } = useAdminContext();
  const { pushToast } = useToast();
  const tAdmin = useTranslations("admin");
  const locale = useLocale();

  const [isLoading, setIsLoading] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState("");

  /* ── Load approvals when tab mounts ── */
  useEffect(() => {
    async function load(): Promise<void> {
      setIsLoading(true);
      try {
        const res = await fetch("/api/admin/game-account-approvals");
        if (res.ok) {
          const result = await res.json();
          setPendingApprovals(result.data ?? []);
        } else {
          setApprovalStatus("Failed to load pending approvals.");
        }
      } catch {
        setApprovalStatus("Network error loading approvals.");
      }
      setIsLoading(false);
    }
    void load();
  }, [setPendingApprovals]);

  /* ── Approve / reject ── */
  const handleAction = useCallback(
    async (gameAccountId: string, action: "approve" | "reject") => {
      setApprovalStatus(action === "approve" ? "Approving..." : "Rejecting...");
      try {
        const res = await fetch("/api/admin/game-account-approvals", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ game_account_id: gameAccountId, action }),
        });
        const result = await res.json();
        if (!res.ok) {
          setApprovalStatus(result.error ?? `Failed to ${action} account.`);
          return;
        }
        setPendingApprovals((cur) => cur.filter((item) => item.id !== gameAccountId));
        const msg = action === "approve" ? "Game account approved." : "Game account rejected.";
        setApprovalStatus(msg);
        pushToast(msg);
      } catch {
        setApprovalStatus(`Network error during ${action}.`);
      }
    },
    [setPendingApprovals, pushToast],
  );

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <div className="card-title">{tAdmin("approvals.title")}</div>
          <div className="card-subtitle">{tAdmin("approvals.subtitle")}</div>
        </div>
        <span className="badge">
          {pendingApprovals.length} {tAdmin("approvals.pending")}
        </span>
      </div>
      {approvalStatus ? <div className="alert info">{approvalStatus}</div> : null}
      {isLoading ? (
        <div className="list">
          <div className="list-item">
            <span className="text-muted">{tAdmin("approvals.loading")}</span>
          </div>
        </div>
      ) : pendingApprovals.length === 0 ? (
        <div className="list">
          <div className="list-item">
            <span>{tAdmin("approvals.noPending")}</span>
            <span className="badge">{tAdmin("approvals.allClear")}</span>
          </div>
        </div>
      ) : (
        <TableScroll>
          <div className="table approvals-list">
            <header>
              <span>#</span>
              <span>{tAdmin("approvals.gameUsername")}</span>
              <span>{tAdmin("approvals.user")}</span>
              <span>{tAdmin("approvals.email")}</span>
              <span>{tAdmin("approvals.requested")}</span>
              <span>{tAdmin("approvals.actions")}</span>
            </header>
            {pendingApprovals.map((approval, index) => (
              <div className="row" key={approval.id}>
                <span className="text-muted">{index + 1}</span>
                <div>
                  <strong>{approval.game_username}</strong>
                </div>
                <div>
                  <div>
                    {approval.profiles?.display_name ?? approval.profiles?.username ?? tAdmin("common.unknown")}
                  </div>
                  {approval.profiles?.username && approval.profiles?.display_name ? (
                    <div className="text-muted">{approval.profiles.username}</div>
                  ) : null}
                </div>
                <div>
                  <span className="text-muted">{approval.profiles?.email ?? tAdmin("common.unknown")}</span>
                </div>
                <div>
                  <span className="text-muted">{formatLocalDateTime(approval.created_at, locale)}</span>
                </div>
                <div className="list inline" style={{ gap: "8px", flexWrap: "nowrap" }}>
                  <button className="button primary" type="button" onClick={() => handleAction(approval.id, "approve")}>
                    {tAdmin("common.approve")}
                  </button>
                  <button className="button danger" type="button" onClick={() => handleAction(approval.id, "reject")}>
                    {tAdmin("common.reject")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </TableScroll>
      )}
    </section>
  );
}
