"use client";

import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useToast } from "../../components/toast-provider";
import TableScroll from "../../components/table-scroll";
import { formatLocalDateTime } from "../../../lib/date-format";
import { useAdminContext } from "../admin-context";
import ConfirmModal from "@/app/components/confirm-modal";
import GameButton from "../../components/ui/game-button";
import type { UserRow } from "../admin-types";

/**
 * Admin Approvals tab — split layout:
 *   Left:  Unconfirmed user registrations (email not verified)
 *   Right: Pending game-account approval requests
 */
export default function ApprovalsTab(): ReactElement {
  const {
    supabase,
    pendingApprovals,
    setPendingApprovals,
    setPendingRegistrationCount,
    emailConfirmationsByUserId,
    setEmailConfirmationsByUserId,
    refreshEmailConfirmations,
  } = useAdminContext();
  const { pushToast } = useToast();
  const tAdmin = useTranslations("admin");
  const locale = useLocale();

  /* ── Game account approval state ── */
  const [isLoadingApprovals, setIsLoadingApprovals] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState("");
  const [pendingApproveAll, setPendingApproveAll] = useState(false);

  /* ── User registration confirmation state ── */
  const [allUsers, setAllUsers] = useState<readonly UserRow[]>([]);
  const [isLoadingRegistrations, setIsLoadingRegistrations] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState("");
  const [pendingConfirmAll, setPendingConfirmAll] = useState(false);
  const [userToRemove, setUserToRemove] = useState<UserRow | null>(null);

  const unconfirmedUsers = useMemo(
    () => allUsers.filter((u) => !emailConfirmationsByUserId[u.id]),
    [allUsers, emailConfirmationsByUserId],
  );

  /* ── Load game account approvals ── */
  useEffect(() => {
    async function loadApprovals(): Promise<void> {
      setIsLoadingApprovals(true);
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
      setIsLoadingApprovals(false);
    }
    void loadApprovals();
  }, [setPendingApprovals]);

  /* ── Load email confirmations + profiles ── */
  useEffect(() => {
    async function loadRegistrations(): Promise<void> {
      setIsLoadingRegistrations(true);
      try {
        const [, profileRes] = await Promise.all([
          refreshEmailConfirmations(),
          supabase.from("profiles").select("id,email,display_name,username,user_db").order("email"),
        ]);
        if (!profileRes.error && profileRes.data) {
          setAllUsers(profileRes.data as UserRow[]);
        }
      } catch {
        /* silent — section degrades gracefully */
      }
      setIsLoadingRegistrations(false);
    }
    void loadRegistrations();
  }, [supabase, refreshEmailConfirmations]);

  /* ── Game account: approve / reject ── */
  const handleAction = useCallback(
    async (gameAccountId: string, action: "approve" | "reject") => {
      setApprovalStatus(action === "approve" ? "Approving..." : "Rejecting...");
      try {
        const res = await fetch("/api/admin/game-account-approvals", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ game_account_id: gameAccountId, action }),
        });
        let result: { error?: string };
        try {
          result = await res.json();
        } catch {
          setApprovalStatus(`Failed to ${action} account (invalid response).`);
          return;
        }
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

  /* ── Game account: approve all ── */
  const handleApproveAll = useCallback(() => {
    if (pendingApprovals.length === 0) return;
    setPendingApproveAll(true);
  }, [pendingApprovals.length]);

  const handleConfirmApproveAll = useCallback(async () => {
    if (pendingApprovals.length === 0) return;
    setPendingApproveAll(false);
    setApprovalStatus(tAdmin("approvals.approvingAll"));
    let failed = 0;
    for (const approval of pendingApprovals) {
      try {
        const res = await fetch("/api/admin/game-account-approvals", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ game_account_id: approval.id, action: "approve" }),
        });
        if (!res.ok) failed++;
      } catch {
        failed++;
      }
    }
    if (failed > 0) {
      setApprovalStatus(`${failed} approval(s) failed.`);
    } else {
      setApprovalStatus(tAdmin("approvals.allApproved"));
      pushToast(tAdmin("approvals.allApproved"));
    }
    setPendingApprovals((cur) => (failed > 0 ? cur : []));
    if (failed > 0) {
      const res = await fetch("/api/admin/game-account-approvals");
      if (res.ok) {
        const result = await res.json();
        setPendingApprovals(result.data ?? []);
      }
    }
  }, [pendingApprovals, setPendingApprovals, pushToast, tAdmin]);

  /* ── User registration: confirm single ── */
  const handleConfirmUser = useCallback(
    async (userId: string) => {
      setRegistrationStatus(tAdmin("users.confirmUser") + "...");
      try {
        const res = await fetch("/api/admin/email-confirmations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        const payload = (await res.json()) as { data?: { email_confirmed_at?: string }; error?: string };
        if (!res.ok) {
          setRegistrationStatus(payload.error ?? tAdmin("users.confirmUserFailed"));
          return;
        }
        setEmailConfirmationsByUserId((c) => ({
          ...c,
          [userId]: payload.data?.email_confirmed_at ?? new Date().toISOString(),
        }));
        setPendingRegistrationCount((c) => Math.max(0, c - 1));
        setRegistrationStatus(tAdmin("users.confirmUserSuccess"));
        pushToast(tAdmin("users.confirmUserSuccess"));
      } catch {
        setRegistrationStatus(tAdmin("users.confirmUserFailed"));
      }
    },
    [tAdmin, pushToast, setPendingRegistrationCount, setEmailConfirmationsByUserId],
  );

  /* ── User registration: confirm all ── */
  const handleConfirmAllUsers = useCallback(() => {
    if (unconfirmedUsers.length === 0) return;
    setPendingConfirmAll(true);
  }, [unconfirmedUsers.length]);

  const handleConfirmConfirmAll = useCallback(async () => {
    if (unconfirmedUsers.length === 0) return;
    setPendingConfirmAll(false);
    setRegistrationStatus(tAdmin("approvals.confirmingAll"));
    let failed = 0;
    const confirmed: Record<string, string> = {};
    for (const user of unconfirmedUsers) {
      try {
        const res = await fetch("/api/admin/email-confirmations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id }),
        });
        if (res.ok) {
          const payload = (await res.json()) as { data?: { email_confirmed_at?: string } };
          confirmed[user.id] = payload.data?.email_confirmed_at ?? new Date().toISOString();
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }
    if (failed > 0) {
      setRegistrationStatus(`${failed} confirmation(s) failed.`);
    } else {
      setRegistrationStatus(tAdmin("approvals.allConfirmed"));
      pushToast(tAdmin("approvals.allConfirmed"));
    }
    setEmailConfirmationsByUserId((c) => ({ ...c, ...confirmed }));
    const newCount = unconfirmedUsers.length - Object.keys(confirmed).length;
    setPendingRegistrationCount(Math.max(0, newCount));
  }, [unconfirmedUsers, tAdmin, pushToast, setPendingRegistrationCount, setEmailConfirmationsByUserId]);

  const handleRemoveUser = useCallback((user: UserRow) => {
    setUserToRemove(user);
  }, []);

  const handleConfirmRemoveUser = useCallback(async () => {
    if (!userToRemove) return;
    const userId = userToRemove.id;
    setUserToRemove(null);

    setRegistrationStatus(tAdmin("approvals.removingUser"));
    try {
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        setRegistrationStatus(payload.error ?? tAdmin("approvals.removeUserFailed"));
        return;
      }

      setAllUsers((cur) => cur.filter((user) => user.id !== userId));
      setEmailConfirmationsByUserId((cur) => {
        const next = { ...cur };
        delete next[userId];
        return next;
      });
      setPendingRegistrationCount((count) => Math.max(0, count - 1));
      setRegistrationStatus(tAdmin("approvals.userRemoved"));
      pushToast(tAdmin("approvals.userRemoved"));
      setUserToRemove(null);
    } catch {
      setRegistrationStatus(tAdmin("approvals.removeUserFailed"));
    }
  }, [userToRemove, tAdmin, pushToast, setEmailConfirmationsByUserId, setPendingRegistrationCount]);

  return (
    <div className="approvals-split-grid">
      {/* ── Left: User Account Approvals ── */}
      <section className="card">
        <div className="card-header">
          <div>
            <div className="card-title">{tAdmin("approvals.userApprovals")}</div>
            <div className="card-subtitle">{tAdmin("approvals.userApprovalsSubtitle")}</div>
          </div>
          <div className="list inline admin-toolbar-inline">
            <span className="badge">
              {unconfirmedUsers.length} {tAdmin("approvals.pending")}
            </span>
            {unconfirmedUsers.length > 0 ? (
              <GameButton variant="turquoise" fontSize="0.58rem" onClick={handleConfirmAllUsers}>
                {tAdmin("approvals.confirmAll")}
              </GameButton>
            ) : null}
          </div>
        </div>
        {registrationStatus ? <div className="alert info">{registrationStatus}</div> : null}
        {isLoadingRegistrations ? (
          <div className="list">
            <div className="list-item">
              <span className="text-muted">{tAdmin("approvals.loading")}</span>
            </div>
          </div>
        ) : unconfirmedUsers.length === 0 ? (
          <div className="list">
            <div className="list-item">
              <span>{tAdmin("approvals.noUnconfirmedUsers")}</span>
              <span className="badge">{tAdmin("approvals.allClear")}</span>
            </div>
          </div>
        ) : (
          <TableScroll>
            <div className="table user-approvals-list">
              <header>
                <span>#</span>
                <span>{tAdmin("approvals.user")}</span>
                <span>{tAdmin("approvals.email")}</span>
                <span>{tAdmin("approvals.actions")}</span>
              </header>
              {unconfirmedUsers.map((user, index) => (
                <div className="row" key={user.id}>
                  <span className="text-muted">{index + 1}</span>
                  <div>
                    <div>{user.display_name ?? user.username ?? "-"}</div>
                    {user.display_name && user.username ? <div className="text-muted">{user.username}</div> : null}
                  </div>
                  <div>
                    <span className="text-muted">{user.email}</span>
                  </div>
                  <div className="list inline admin-table-actions">
                    <GameButton variant="turquoise" fontSize="0.58rem" onClick={() => handleConfirmUser(user.id)}>
                      {tAdmin("users.confirmUser")}
                    </GameButton>
                    <GameButton variant="orange" fontSize="0.58rem" onClick={() => handleRemoveUser(user)}>
                      {tAdmin("approvals.removeUser")}
                    </GameButton>
                  </div>
                </div>
              ))}
            </div>
          </TableScroll>
        )}
      </section>

      {/* ── Right: Game Account Approvals ── */}
      <section className="card">
        <div className="card-header">
          <div>
            <div className="card-title">{tAdmin("approvals.gameApprovals")}</div>
            <div className="card-subtitle">{tAdmin("approvals.gameApprovalsSubtitle")}</div>
          </div>
          <div className="list inline admin-toolbar-inline">
            <span className="badge">
              {pendingApprovals.length} {tAdmin("approvals.pending")}
            </span>
            {pendingApprovals.length > 0 ? (
              <GameButton variant="turquoise" fontSize="0.58rem" onClick={handleApproveAll}>
                {tAdmin("approvals.approveAll")}
              </GameButton>
            ) : null}
          </div>
        </div>
        {approvalStatus ? <div className="alert info">{approvalStatus}</div> : null}
        {isLoadingApprovals ? (
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
                  <div className="list inline admin-table-actions">
                    <GameButton
                      variant="turquoise"
                      fontSize="0.58rem"
                      onClick={() => handleAction(approval.id, "approve")}
                    >
                      {tAdmin("common.approve")}
                    </GameButton>
                    <GameButton variant="orange" fontSize="0.58rem" onClick={() => handleAction(approval.id, "reject")}>
                      {tAdmin("common.reject")}
                    </GameButton>
                  </div>
                </div>
              ))}
            </div>
          </TableScroll>
        )}
      </section>

      {/* ── Modals ── */}
      <ConfirmModal
        isOpen={pendingApproveAll}
        title={tAdmin("approvals.approveAll")}
        message={tAdmin("approvals.approveAllConfirm")}
        variant="info"
        confirmButtonVariant="turquoise"
        confirmLabel={tAdmin("common.approve")}
        cancelLabel={tAdmin("common.cancel")}
        onConfirm={() => void handleConfirmApproveAll()}
        onCancel={() => setPendingApproveAll(false)}
      />

      <ConfirmModal
        isOpen={pendingConfirmAll}
        title={tAdmin("approvals.confirmAll")}
        message={tAdmin("approvals.confirmAllConfirm")}
        variant="info"
        confirmButtonVariant="turquoise"
        confirmLabel={tAdmin("users.confirmUser")}
        cancelLabel={tAdmin("common.cancel")}
        onConfirm={() => void handleConfirmConfirmAll()}
        onCancel={() => setPendingConfirmAll(false)}
      />

      <ConfirmModal
        isOpen={userToRemove !== null}
        title={tAdmin("approvals.removeUser")}
        message={tAdmin("approvals.removeUserConfirm")}
        variant="warning"
        confirmButtonVariant="orange"
        confirmLabel={tAdmin("common.delete")}
        cancelLabel={tAdmin("common.cancel")}
        onConfirm={() => void handleConfirmRemoveUser()}
        onCancel={() => setUserToRemove(null)}
      />
    </div>
  );
}
