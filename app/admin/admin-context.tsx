"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useSupabase } from "../hooks/use-supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "../components/toast-provider";
import type { ClanRow, AdminSection, PendingApprovalRow } from "./admin-types";
import { resolveSection } from "./admin-types";
import { toRole, type Role } from "@/lib/permissions";

/* ── Context value ── */

export interface AdminContextValue {
  readonly supabase: SupabaseClient;

  /* Clans */
  readonly clans: readonly ClanRow[];
  readonly selectedClanId: string;
  readonly setSelectedClanId: (id: string) => void;
  readonly unassignedClanId: string;
  readonly defaultClanId: string;
  readonly setDefaultClanId: (id: string) => void;
  readonly clanNameById: ReadonlyMap<string, string>;
  readonly loadClans: () => Promise<void>;

  /* User */
  readonly currentUserId: string;
  /** The logged-in user's role (defaults to "guest" until loaded). */
  readonly currentUserRole: Role;

  /* Section routing */
  readonly activeSection: AdminSection;
  readonly updateActiveSection: (section: AdminSection) => void;
  readonly navigateAdmin: (path: string) => void;

  /* Global status */
  readonly status: string;
  readonly setStatus: (msg: string) => void;

  /* Approval badge count (shared for tab bar) */
  readonly pendingApprovals: readonly PendingApprovalRow[];
  readonly setPendingApprovals: React.Dispatch<React.SetStateAction<readonly PendingApprovalRow[]>>;
}

const AdminContext = createContext<AdminContextValue | null>(null);

/**
 * Reads the shared admin context. Throws if used outside `<AdminProvider>`.
 */
export function useAdminContext(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdminContext must be used within <AdminProvider>");
  return ctx;
}

/* ── Provider ── */

interface AdminProviderProps {
  readonly children: ReactNode;
}

export default function AdminProvider({ children }: AdminProviderProps): ReactElement {
  const supabase = useSupabase();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pushToast } = useToast();

  /* ── Shared state ── */
  const [clans, setClans] = useState<readonly ClanRow[]>([]);
  const [selectedClanId, setSelectedClanId] = useState("");
  const [unassignedClanId, setUnassignedClanId] = useState("");
  const [defaultClanId, setDefaultClanId] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState<Role>("guest");
  const [activeSection, setActiveSection] = useState<AdminSection>("clans");
  const [status, setStatus] = useState("");
  const [pendingApprovals, setPendingApprovals] = useState<readonly PendingApprovalRow[]>([]);

  const clanNameById = useMemo(() => new Map(clans.map((c) => [c.id, c.name])), [clans]);

  /* ── Load clans ── */
  const loadClans = useCallback(async () => {
    const { data, error } = await supabase.from("clans").select("id,name,description,is_unassigned").order("name");
    if (error) {
      setStatus(`Failed to load clans: ${error.message}`);
      return;
    }
    const rows = data ?? [];
    setClans(rows);
    const unassigned = rows.find((c) => c.is_unassigned);
    setUnassignedClanId(unassigned?.id ?? "");
  }, [supabase]);

  /* ── Initialize once ── */
  useEffect(() => {
    async function init(): Promise<void> {
      /* Parallelize independent init queries (reuses loadClans for clan data) */
      const [, { data: defClan }, { data: authData }, approvalsRes] = await Promise.all([
        loadClans(),
        supabase.from("clans").select("id").eq("is_default", true).maybeSingle(),
        supabase.auth.getUser(),
        fetch("/api/admin/game-account-approvals").catch(() => null),
      ]);

      // Default clan
      setDefaultClanId(defClan?.id ?? "");

      // Current user
      const userId = authData.user?.id ?? "";
      setCurrentUserId(userId);

      // Fetch current user's role
      if (userId) {
        const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
        if (roleRow) setCurrentUserRole(toRole(roleRow.role));
      }

      // Pending approvals (for badge)
      if (approvalsRes?.ok) {
        try {
          const result = await approvalsRes.json();
          setPendingApprovals(result.data ?? []);
        } catch {
          /* ignore parse failure for badge count */
        }
      }
    }
    void init();
  }, [supabase, loadClans]);

  /* ── Restore/sync selected clan: localStorage takes priority, else default clan ── */
  const [hasRestoredClan, setHasRestoredClan] = useState(false);
  useEffect(() => {
    if (clans.length === 0) return;
    if (!hasRestoredClan) {
      const stored = window.localStorage.getItem("tc.currentClanId") ?? "";
      const match = stored ? clans.find((c) => c.id === stored) : undefined;
      setSelectedClanId(
        match?.id ?? (defaultClanId && clans.some((c) => c.id === defaultClanId) ? defaultClanId : clans[0]!.id),
      );
      setHasRestoredClan(true);
    } else if (defaultClanId && clans.some((c) => c.id === defaultClanId)) {
      const stored = window.localStorage.getItem("tc.currentClanId") ?? "";
      const match = stored ? clans.find((c) => c.id === stored) : undefined;
      if (!match) setSelectedClanId(defaultClanId);
    }
  }, [clans, defaultClanId, hasRestoredClan]);

  /* ── Sync active section from URL ── */
  useEffect(() => {
    const rawTab = searchParams.get("tab");
    const next = resolveSection(rawTab);
    setActiveSection(next);
    if (rawTab === "rules") {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "validation");
      router.replace(`/admin?${params.toString()}`);
    }
  }, [router, searchParams]);

  /* ── Toast status messages ── */
  useEffect(() => {
    if (status) pushToast(status);
  }, [pushToast, status]);

  /* ── Section navigation ── */
  const updateActiveSection = useCallback(
    (next: AdminSection) => {
      setActiveSection(next);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", next);
      router.replace(`/admin?${params.toString()}`);
    },
    [router, searchParams],
  );

  const navigateAdmin = useCallback((path: string) => router.push(path), [router]);

  /* ── Context value ── */
  const value = useMemo<AdminContextValue>(
    () => ({
      supabase,
      clans,
      selectedClanId,
      setSelectedClanId,
      unassignedClanId,
      defaultClanId,
      setDefaultClanId,
      clanNameById,
      loadClans,
      currentUserId,
      currentUserRole,
      activeSection,
      updateActiveSection,
      navigateAdmin,
      status,
      setStatus,
      pendingApprovals,
      setPendingApprovals,
    }),
    [
      supabase,
      clans,
      selectedClanId,
      unassignedClanId,
      defaultClanId,
      clanNameById,
      loadClans,
      currentUserId,
      currentUserRole,
      activeSection,
      updateActiveSection,
      navigateAdmin,
      status,
      pendingApprovals,
    ],
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}
