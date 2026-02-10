"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactElement } from "react";
import { useLocale, useTranslations } from "next-intl";
import RadixSelect from "../../components/ui/radix-select";
import SearchInput from "../../components/ui/search-input";
import IconButton from "../../components/ui/icon-button";
import LabeledSelect from "../../components/ui/labeled-select";
import TableScroll from "../../components/table-scroll";
import { useAdminContext } from "../admin-context";
import SortableColumnHeader from "../components/sortable-column-header";
import DangerConfirmModal from "../components/danger-confirm-modal";
import { useConfirmDelete } from "../hooks/use-confirm-delete";
import { useSortable, compareValues } from "../hooks/use-sortable";
import type {
  MembershipRow,
  MembershipQueryRow,
  MembershipEditState,
  GameAccountEditState,
  GameAccountRow,
  AssignableGameAccount,
  ProfileRow,
} from "../admin-types";
import { rankOptions, formatRank, normalizeMembershipRows, type MemberSortKey } from "../admin-types";

const clanSelectNone = "__none__";

function validateMembershipEdit(
  membership: MembershipRow,
  membershipEdits: Record<string, MembershipEditState>,
): string | null {
  const edit = getMembershipEditValueStub(membership, membershipEdits);
  if (!edit.clan_id) return "Clan is required.";
  return null;
}

function getMembershipEditValueStub(
  membership: MembershipRow,
  membershipEdits: Record<string, MembershipEditState>,
): MembershipEditState {
  return {
    is_active: membershipEdits[membership.id]?.is_active ?? membership.is_active,
    rank: membershipEdits[membership.id]?.rank ?? membership.rank ?? "",
    clan_id: membershipEdits[membership.id]?.clan_id ?? membership.clan_id,
  };
}

export default function ClansTab(): ReactElement {
  const {
    supabase,
    clans,
    selectedClanId,
    setSelectedClanId,
    unassignedClanId,
    defaultClanId,
    setDefaultClanId,
    clanNameById,
    currentUserId: _currentUserId,
    setStatus,
    loadClans,
  } = useAdminContext();

  const tAdmin = useTranslations("admin");
  const locale = useLocale();

  const clanDelete = useConfirmDelete();
  const gameAccountDelete = useConfirmDelete();
  const memberSort = useSortable<MemberSortKey>("game", "asc");
  const { sortKey: memberSortKey, sortDirection: memberSortDirection, toggleSort: toggleMemberSort } = memberSort;

  /* ── Local state ── */
  const [memberships, setMemberships] = useState<readonly MembershipRow[]>([]);
  const [membershipEdits, setMembershipEdits] = useState<Record<string, MembershipEditState>>({});
  const [membershipErrors, setMembershipErrors] = useState<Record<string, string>>({});
  const [profilesById, setProfilesById] = useState<Record<string, ProfileRow>>({});
  const [_userRolesById, setUserRolesById] = useState<Record<string, string>>({});
  const [memberSearch, setMemberSearch] = useState("");
  const [memberRankFilter, setMemberRankFilter] = useState("all");
  const [memberStatusFilter, setMemberStatusFilter] = useState("all");
  const [clanModal, setClanModal] = useState({
    open: false,
    mode: "create" as "create" | "edit",
    name: "",
    description: "",
  });
  const [assignAccounts, setAssignAccounts] = useState({
    isOpen: false,
    accounts: [] as readonly AssignableGameAccount[],
    selectedIds: [] as readonly string[],
    search: "",
    filter: "unassigned" as "unassigned" | "current" | "other" | "all",
    status: "",
  });
  const [gameAccountEdits, setGameAccountEdits] = useState<Record<string, GameAccountEditState>>({});
  const [activeGameAccountId, setActiveGameAccountId] = useState("");
  const [gameAccountToDelete, setGameAccountToDelete] = useState<GameAccountRow | null>(null);

  const selectedClan = useMemo(() => clans.find((c) => c.id === selectedClanId), [clans, selectedClanId]);

  const clanSelectValue = selectedClanId || clanSelectNone;
  const clanSelectOptions = useMemo(
    () => [
      { value: clanSelectNone, label: tAdmin("clans.selectClan") },
      ...clans.map((c) => ({ value: c.id, label: c.name })),
    ],
    [clans, tAdmin],
  );

  /* ── Helpers ── */
  const getMembershipEditValue = useCallback(
    (membership: MembershipRow): MembershipEditState => getMembershipEditValueStub(membership, membershipEdits),
    [membershipEdits],
  );

  const ensureUnassignedMemberships = useCallback(async (): Promise<void> => {
    if (!unassignedClanId) return;
    const { error } = await supabase.rpc("ensure_unassigned_memberships");
    if (error) setStatus(`Failed to sync unassigned accounts: ${error.message}`);
  }, [unassignedClanId, supabase, setStatus]);

  async function insertAuditLogs(entries: readonly Record<string, unknown>[]): Promise<void> {
    if (entries.length === 0) return;
    const { error } = await supabase.from("audit_logs").insert(entries);
    if (error) setStatus(`Audit log failed: ${error.message}`);
  }

  async function getCurrentUserId(): Promise<string | null> {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  }

  const loadMemberships = useCallback(
    async (clanId: string): Promise<void> => {
      if (!clanId) {
        setMemberships([]);
        setProfilesById({});
        return;
      }
      if (clanId === unassignedClanId) {
        await ensureUnassignedMemberships();
      }
      const { data, error } = await supabase
        .from("game_account_clan_memberships")
        .select("id,clan_id,game_account_id,is_active,rank,game_accounts(id,user_id,game_username)")
        .eq("clan_id", clanId)
        .order("game_account_id");
      if (error) {
        setStatus(`Failed to load memberships: ${error.message}`);
        return;
      }
      const membershipRows = normalizeMembershipRows(data as readonly MembershipQueryRow[] | null | undefined);
      setMemberships(membershipRows);
      const userIds = membershipRows
        .map((row) => row.game_accounts?.user_id)
        .filter((value): value is string => Boolean(value));
      if (userIds.length === 0) {
        setProfilesById({});
        return;
      }
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id,email,display_name,username")
        .in("id", userIds);
      if (profileError) {
        setStatus(`Failed to load profiles: ${profileError.message}`);
        return;
      }
      const profileMap = (profileData ?? []).reduce<Record<string, ProfileRow>>((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {});
      setProfilesById(profileMap);
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id,role")
        .in("user_id", userIds);
      if (roleError) {
        setStatus(`Failed to load user roles: ${roleError.message}`);
        return;
      }
      const roleMap = (roleData ?? []).reduce<Record<string, string>>((acc, row) => {
        acc[row.user_id] = row.role;
        return acc;
      }, {});
      setUserRolesById((current) => ({ ...current, ...roleMap }));
    },
    [supabase, unassignedClanId, ensureUnassignedMemberships, setStatus],
  );

  const getMemberSortValue = useCallback(
    (membership: MembershipRow): string | number => {
      const userId = membership.game_accounts?.user_id ?? "";
      const profile = userId ? profilesById[userId] : undefined;
      const userLabel = profile?.display_name ?? profile?.username ?? profile?.email ?? "";
      const clanLabel = clanNameById.get(membership.clan_id) ?? "";
      if (memberSortKey === "game") return membership.game_accounts?.game_username ?? "";
      if (memberSortKey === "user") return userLabel;
      if (memberSortKey === "clan") return clanLabel;
      if (memberSortKey === "rank") return membership.rank ?? "";
      return membership.is_active ? "active" : "inactive";
    },
    [profilesById, clanNameById, memberSortKey],
  );

  const filteredMemberships = useMemo(() => {
    const normalizedSearch = memberSearch.trim().toLowerCase();
    return memberships.filter((membership) => {
      const userId = membership.game_accounts?.user_id ?? "";
      if (memberRankFilter !== "all" && (membership.rank ?? "") !== memberRankFilter) return false;
      if (memberStatusFilter !== "all") {
        const expectedActive = memberStatusFilter === "active";
        if (membership.is_active !== expectedActive) return false;
      }
      if (!normalizedSearch) return true;
      const profile = userId ? profilesById[userId] : undefined;
      const searchText = [
        membership.game_accounts?.game_username,
        profile?.display_name,
        profile?.username,
        profile?.email,
        userId,
      ]
        .filter((value): value is string => Boolean(value))
        .join(" ")
        .toLowerCase();
      return searchText.includes(normalizedSearch);
    });
  }, [memberRankFilter, memberSearch, memberStatusFilter, memberships, profilesById]);

  const sortedMemberships = useMemo(() => {
    const sorted = [...filteredMemberships];
    sorted.sort((left, right) => {
      const leftValue = getMemberSortValue(left);
      const rightValue = getMemberSortValue(right);
      return compareValues(leftValue, rightValue, memberSortDirection);
    });
    return sorted;
  }, [filteredMemberships, memberSortDirection, getMemberSortValue]);

  const filteredAssignableAccounts = useMemo(() => {
    const normalizedSearch = assignAccounts.search.trim().toLowerCase();
    return assignAccounts.accounts.filter((account) => {
      if (assignAccounts.filter === "unassigned" && account.clan_id !== unassignedClanId) return false;
      if (assignAccounts.filter === "current" && account.clan_id !== selectedClanId) return false;
      if (assignAccounts.filter === "other" && (!account.clan_id || account.clan_id === selectedClanId)) return false;
      if (!normalizedSearch) return true;
      const target = `${account.game_username} ${account.user_email} ${account.user_display}`.toLowerCase();
      return target.includes(normalizedSearch);
    });
  }, [assignAccounts.accounts, assignAccounts.filter, assignAccounts.search, selectedClanId, unassignedClanId]);

  /* ── Clan modal ── */
  async function handleSaveClan(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!clanModal.name.trim()) {
      setStatus("Clan name is required.");
      return;
    }
    if (clanModal.mode === "edit" && !selectedClanId) {
      setStatus("Select a clan to edit.");
      return;
    }
    setStatus(clanModal.mode === "edit" ? "Updating clan..." : "Creating clan...");
    if (clanModal.mode === "edit") {
      const { data, error } = await supabase
        .from("clans")
        .update({ name: clanModal.name.trim(), description: clanModal.description.trim() || null })
        .eq("id", selectedClanId)
        .select("id")
        .single();
      if (error) {
        setStatus(`Failed to update clan: ${error.message}`);
        return;
      }
      setSelectedClanId(data?.id ?? selectedClanId);
      setStatus("Clan updated.");
    } else {
      const { data, error } = await supabase
        .from("clans")
        .insert({ name: clanModal.name.trim(), description: clanModal.description.trim() || null })
        .select("id")
        .single();
      if (error) {
        setStatus(`Failed to create clan: ${error.message}`);
        return;
      }
      if (data?.id) setSelectedClanId(data.id);
      setStatus("Clan created.");
    }
    setClanModal({ open: false, mode: "create", name: "", description: "" });
    await loadClans();
  }

  async function handleDeleteClan(): Promise<void> {
    if (!selectedClan || !selectedClanId) {
      setStatus("Select a clan to delete.");
      return;
    }
    if (!clanDelete.isConfirmed(`DELETE ${selectedClan.name}`)) {
      setStatus("Deletion phrase does not match.");
      return;
    }
    const { error } = await supabase.from("clans").delete().eq("id", selectedClanId);
    if (error) {
      setStatus(`Failed to delete clan: ${error.message}`);
      return;
    }
    clanDelete.close();
    setStatus("Clan deleted.");
    await loadClans();
  }

  /* ── Membership edit ── */
  function updateMembershipEdit(id: string, field: keyof MembershipEditState, value: string): void {
    const membership = memberships.find((m) => m.id === id);
    const baseMembership = membership ?? ({ is_active: true, rank: "", clan_id: selectedClanId } as MembershipRow);
    setMembershipEdits((current) => {
      const existing = current[id] ?? {
        is_active: baseMembership.is_active,
        rank: baseMembership.rank ?? "",
        clan_id: baseMembership.clan_id,
      };
      const nextValue = field === "is_active" ? value === "true" : value;
      return { ...current, [id]: { ...existing, [field]: nextValue } };
    });
    setMembershipErrors((current) => {
      if (!current[id]) return current;
      const updated = { ...current };
      delete updated[id];
      return updated;
    });
    const m = memberships.find((x) => x.id === id);
    if (m?.game_accounts?.id) cancelGameAccountEdit(m.game_accounts.id);
  }

  function cancelMembershipEdits(id: string): void {
    setMembershipEdits((current) => {
      if (!current[id]) return current;
      const updated = { ...current };
      delete updated[id];
      return updated;
    });
    setMembershipErrors((current) => {
      if (!current[id]) return current;
      const updated = { ...current };
      delete updated[id];
      return updated;
    });
    const m = memberships.find((x) => x.id === id);
    if (m?.game_accounts?.id) cancelGameAccountEdit(m.game_accounts.id);
  }

  function cancelAllMembershipEdits(): void {
    setMembershipEdits({});
    setMembershipErrors({});
    setStatus("All membership changes cleared.");
  }

  function isMembershipFieldChanged(membership: MembershipRow, field: keyof MembershipEditState): boolean {
    const edits = membershipEdits[membership.id];
    if (!edits || edits[field] === undefined) return false;
    const nextValue = edits[field];
    if (field === "is_active") return Boolean(nextValue) !== membership.is_active;
    if (field === "rank") return String(nextValue ?? "") !== String(membership.rank ?? "");
    if (field === "clan_id") return String(nextValue ?? "") !== membership.clan_id;
    return false;
  }

  async function handleSaveMembershipEdit(membership: MembershipRow, shouldReload = true): Promise<void> {
    const edits = membershipEdits[membership.id];
    const hasGameAccountEdit = Boolean(membership.game_accounts?.id && gameAccountEdits[membership.game_accounts.id]);
    if (!edits && !hasGameAccountEdit) {
      setStatus("No changes to save.");
      return;
    }
    if (edits) {
      const validationError = validateMembershipEdit(membership, membershipEdits);
      if (validationError) {
        setMembershipErrors((current) => ({ ...current, [membership.id]: validationError }));
        return;
      }
    }
    const actorId = await getCurrentUserId();
    if (!actorId) {
      setStatus("You must be logged in to update memberships.");
      return;
    }
    let membershipPayload: { clan_id: string; is_active: boolean; rank: string | null } | null = null;
    if (edits) {
      const nextEdits = getMembershipEditValue(membership);
      const nextClanId = nextEdits.clan_id ?? membership.clan_id;
      membershipPayload = {
        clan_id: nextClanId,
        is_active: nextEdits.is_active ?? membership.is_active,
        rank: nextEdits.rank ?? membership.rank,
      };
      const { error } = await supabase
        .from("game_account_clan_memberships")
        .update(membershipPayload)
        .eq("id", membership.id);
      if (error) {
        setStatus(`Failed to update membership: ${error.message}`);
        return;
      }
    }
    if (membership.game_accounts?.id && gameAccountEdits[membership.game_accounts.id]) {
      await handleSaveGameAccountEdit(
        {
          id: membership.game_accounts.id,
          user_id: membership.game_accounts.user_id ?? "",
          game_username: membership.game_accounts.game_username,
        },
        false,
      );
    }
    if (membershipPayload) {
      await insertAuditLogs([
        {
          clan_id: membershipPayload.clan_id,
          actor_id: actorId,
          action: "update",
          entity: "game_account_clan_memberships",
          entity_id: membership.id,
          diff: {
            game_account_id: membership.game_account_id,
            clan_id: { from: membership.clan_id, to: membershipPayload.clan_id },
            is_active: { from: membership.is_active, to: membershipPayload.is_active },
            rank: { from: membership.rank ?? null, to: membershipPayload.rank ?? null },
          },
        },
      ]);
    }
    setMembershipEdits((current) => {
      const updated = { ...current };
      delete updated[membership.id];
      return updated;
    });
    setStatus("Membership updated.");
    if (shouldReload) await loadMemberships(selectedClanId);
  }

  async function handleSaveAllMembershipEdits(): Promise<void> {
    const editEntries = Object.keys(membershipEdits);
    if (editEntries.length === 0) {
      setStatus("No changes to save.");
      return;
    }
    const confirmSave = window.confirm(`Save ${editEntries.length} membership change(s)?`);
    if (!confirmSave) return;
    setStatus("Saving membership changes...");
    let hasValidationError = false;
    for (const membershipId of editEntries) {
      const membership = memberships.find((m) => m.id === membershipId);
      if (!membership) continue;
      const validationError = validateMembershipEdit(membership, membershipEdits);
      if (validationError) {
        setMembershipErrors((current) => ({ ...current, [membership.id]: validationError }));
        hasValidationError = true;
        continue;
      }
      await handleSaveMembershipEdit(membership, false);
    }
    if (hasValidationError) {
      setStatus("Some membership updates need fixes before saving.");
      return;
    }
    await loadMemberships(selectedClanId);
    setStatus("All membership changes saved.");
  }

  function getMembershipLabel(membership: MembershipRow): string {
    const gameAccount = membership.game_accounts;
    if (!gameAccount) return membership.game_account_id;
    const editedUsername = gameAccountEdits[gameAccount.id]?.game_username;
    if (editedUsername?.trim()) return editedUsername;
    if (gameAccount.game_username?.trim()) return gameAccount.game_username;
    const profile = gameAccount.user_id ? profilesById[gameAccount.user_id] : undefined;
    return profile?.email ?? gameAccount.id;
  }

  /* ── Assign accounts ── */
  function openAssignAccountsModal(): void {
    if (!selectedClanId) {
      setStatus("Select a clan before assigning game accounts.");
      return;
    }
    setAssignAccounts((a) => ({
      ...a,
      isOpen: true,
      selectedIds: [],
      search: "",
      filter: "unassigned",
      status: "",
    }));
    void loadAssignableGameAccounts();
  }

  function closeAssignAccountsModal(): void {
    setAssignAccounts((a) => ({
      ...a,
      isOpen: false,
      selectedIds: [],
      search: "",
      status: "",
    }));
  }

  async function loadAssignableGameAccounts(): Promise<void> {
    if (unassignedClanId) await ensureUnassignedMemberships();
    const { data: accountData, error: accountError } = await supabase
      .from("game_accounts")
      .select("id,user_id,game_username,approval_status")
      .eq("approval_status", "approved")
      .order("game_username");
    if (accountError) {
      setAssignAccounts((a) => ({ ...a, status: `Failed to load game accounts: ${accountError.message}` }));
      return;
    }
    const accounts = accountData ?? [];
    const accountIds = accounts.map((a) => a.id);
    const userIds = accounts.map((a) => a.user_id);
    if (accountIds.length === 0 || userIds.length === 0) {
      setAssignAccounts((a) => ({ ...a, accounts: [] }));
      return;
    }
    const { data: membershipData, error: membershipError } = await supabase
      .from("game_account_clan_memberships")
      .select("game_account_id,clan_id")
      .in("game_account_id", accountIds);
    if (membershipError) {
      setAssignAccounts((a) => ({ ...a, status: `Failed to load memberships: ${membershipError.message}` }));
      return;
    }
    const membershipMap = (membershipData ?? []).reduce<Record<string, string | null>>((acc, m) => {
      acc[m.game_account_id] = m.clan_id;
      return acc;
    }, {});
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id,email,display_name,username")
      .in("id", userIds);
    if (profileError) {
      setAssignAccounts((a) => ({ ...a, status: `Failed to load profiles: ${profileError.message}` }));
      return;
    }
    const profileMap = (profileData ?? []).reduce<Record<string, ProfileRow>>((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {});
    const assignable: AssignableGameAccount[] = accounts.map((account) => {
      const profile = profileMap[account.user_id];
      return {
        id: account.id,
        user_id: account.user_id,
        game_username: account.game_username,
        clan_id: membershipMap[account.id] ?? null,
        user_email: profile?.email ?? "",
        user_display: profile?.display_name ?? profile?.username ?? "",
      };
    });
    setAssignAccounts((a) => ({ ...a, accounts: assignable }));
  }

  async function handleAssignAccounts(): Promise<void> {
    if (!selectedClanId) {
      setAssignAccounts((a) => ({ ...a, status: "Select a clan before assigning." }));
      return;
    }
    if (assignAccounts.selectedIds.length === 0) {
      setAssignAccounts((a) => ({ ...a, status: "Select at least one game account to assign." }));
      return;
    }
    setAssignAccounts((a) => ({ ...a, status: "Assigning game accounts..." }));
    const rows = assignAccounts.selectedIds.map((game_account_id) => ({
      game_account_id,
      clan_id: selectedClanId,
      is_active: true,
      rank: "soldier",
    }));
    const { error } = await supabase
      .from("game_account_clan_memberships")
      .upsert(rows, { onConflict: "game_account_id" });
    if (error) {
      setAssignAccounts((a) => ({ ...a, status: `Failed to assign: ${error.message}` }));
      return;
    }
    setAssignAccounts((a) => ({ ...a, status: "Assignments updated." }));
    await loadMemberships(selectedClanId);
    closeAssignAccountsModal();
  }

  function toggleAssignSelection(accountId: string): void {
    setAssignAccounts((a) => {
      const includes = a.selectedIds.includes(accountId);
      return {
        ...a,
        selectedIds: includes ? a.selectedIds.filter((id) => id !== accountId) : [...a.selectedIds, accountId],
      };
    });
  }

  /* ── Game account edit / delete ── */
  function beginGameAccountEdit(account: GameAccountRow): void {
    setActiveGameAccountId(account.id);
    setGameAccountEdits((current) => ({
      ...current,
      [account.id]: { game_username: current[account.id]?.game_username ?? account.game_username },
    }));
  }

  function updateGameAccountEdit(accountId: string, field: keyof GameAccountEditState, value: string): void {
    setGameAccountEdits((current) => ({
      ...current,
      [accountId]: { ...current[accountId], [field]: value },
    }));
  }

  function cancelGameAccountEdit(accountId: string): void {
    setGameAccountEdits((current) => {
      const next = { ...current };
      delete next[accountId];
      return next;
    });
    setActiveGameAccountId((prev) => (prev === accountId ? "" : prev));
  }

  async function handleSaveGameAccountEdit(account: GameAccountRow, shouldReload = true): Promise<boolean> {
    const editState = gameAccountEdits[account.id];
    if (!editState) return true;
    const nextUsername = (editState.game_username ?? account.game_username).trim();
    if (!nextUsername) {
      setStatus("Game username is required.");
      return false;
    }
    setStatus("Updating game account...");
    const { error } = await supabase.from("game_accounts").update({ game_username: nextUsername }).eq("id", account.id);
    if (error) {
      setStatus(`Failed to update game account: ${error.message}`);
      return false;
    }
    cancelGameAccountEdit(account.id);
    setActiveGameAccountId("");
    setStatus("Game account updated.");
    if (shouldReload) await loadMemberships(selectedClanId);
    return true;
  }

  function openGameAccountDeleteConfirm(account: GameAccountRow): void {
    setGameAccountToDelete(account);
    gameAccountDelete.openConfirm();
  }

  async function handleConfirmDeleteGameAccount(): Promise<void> {
    if (!gameAccountToDelete) {
      setStatus("Select a game account to delete.");
      return;
    }
    if (!gameAccountDelete.isConfirmed(`DELETE ${gameAccountToDelete.game_username}`)) {
      setStatus("Deletion phrase does not match.");
      return;
    }
    const { error } = await supabase.from("game_accounts").delete().eq("id", gameAccountToDelete.id);
    if (error) {
      setStatus(`Failed to delete game account: ${error.message}`);
      return;
    }
    gameAccountDelete.close();
    setGameAccountToDelete(null);
    setStatus("Game account deleted.");
    await loadMemberships(selectedClanId);
  }

  /* ── Effects ── */
  useEffect(() => {
    void loadMemberships(selectedClanId);
  }, [selectedClanId, loadMemberships]);

  /* status → toast is handled by AdminProvider */

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <div className="card-title">{tAdmin("clans.title")}</div>
          <div className="card-subtitle">{selectedClan ? selectedClan.name : tAdmin("clans.selectClan")}</div>
        </div>
        <IconButton
          ariaLabel={tAdmin("clans.deleteClan")}
          onClick={() => {
            if (!selectedClan || !selectedClanId) {
              setStatus("Select a clan to delete.");
              return;
            }
            if (selectedClanId === unassignedClanId) {
              setStatus("Unassigned clan cannot be deleted.");
              return;
            }
            clanDelete.openConfirm();
          }}
          disabled={!selectedClanId || selectedClanId === unassignedClanId}
          variant="danger"
        >
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2.5L13.5 12.5H2.5L8 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M8 6V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M8 11.2H8.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </IconButton>
      </div>

      <div className="admin-clan-row">
        <label htmlFor="selectedClan">{tAdmin("common.clan")}</label>
        <RadixSelect
          id="selectedClan"
          ariaLabel={tAdmin("common.clan")}
          value={clanSelectValue}
          onValueChange={(value) => setSelectedClanId(value === clanSelectNone ? "" : value)}
          options={clanSelectOptions}
          renderOptionContent={(option) => {
            if (option.value === clanSelectNone) return option.label;
            return (
              <span className="select-item-content">
                <span>{option.label}</span>
                {defaultClanId && option.value === defaultClanId ? (
                  <span className="badge select-badge">{tAdmin("common.default")}</span>
                ) : null}
              </span>
            );
          }}
        />
        <div className="list inline" style={{ alignItems: "center", flexWrap: "wrap" }}>
          <span className="text-muted">{tAdmin("clans.clanActions")}</span>
          <div className="list inline">
            <IconButton
              ariaLabel={tAdmin("clans.createClan")}
              onClick={() => setClanModal({ open: true, mode: "create", name: "", description: "" })}
              variant="primary"
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3.5V12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M3.5 8H12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </IconButton>
            <IconButton
              ariaLabel={tAdmin("clans.editClan")}
              onClick={() => {
                if (!selectedClan) {
                  setStatus("Select a clan to edit.");
                  return;
                }
                setClanModal({
                  open: true,
                  mode: "edit",
                  name: selectedClan.name,
                  description: selectedClan.description ?? "",
                });
              }}
              disabled={!selectedClanId}
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3 11.5L4 8.5L10.5 2L14 5.5L7.5 12L3 11.5Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path d="M9.5 3L13 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </IconButton>
            <IconButton
              ariaLabel={tAdmin("clans.assignAccounts")}
              onClick={openAssignAccountsModal}
              disabled={!selectedClanId}
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M5 6.5C6.1 6.5 7 5.6 7 4.5C7 3.4 6.1 2.5 5 2.5C3.9 2.5 3 3.4 3 4.5C3 5.6 3.9 6.5 5 6.5Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M1.5 12.5C1.5 10.6 3.1 9 5 9C6.9 9 8.5 10.6 8.5 12.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path d="M11 5V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M8.5 8H13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </IconButton>
            <IconButton
              ariaLabel={tAdmin("clans.setDefault")}
              onClick={() => {
                if (!selectedClanId) {
                  setStatus("Select a clan to set default.");
                  return;
                }
                void supabase
                  .from("clans")
                  .update({ is_default: true })
                  .eq("id", selectedClanId)
                  .then(({ error }) => {
                    if (error) setStatus(`Failed to set default: ${error.message}`);
                    else {
                      setDefaultClanId(selectedClanId);
                      setStatus("Default clan saved.");
                    }
                  });
              }}
              disabled={!selectedClanId}
            >
              <svg
                aria-hidden="true"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill={selectedClanId && selectedClanId === defaultClanId ? "currentColor" : "none"}
              >
                <path
                  d="M8 2.5L9.7 6.1L13.5 6.6L10.7 9.2L11.4 13L8 11.1L4.6 13L5.3 9.2L2.5 6.6L6.3 6.1L8 2.5Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </IconButton>
            {selectedClanId && selectedClanId === defaultClanId ? (
              <IconButton
                ariaLabel={tAdmin("clans.clearDefault")}
                onClick={() => {
                  void supabase
                    .from("clans")
                    .update({ is_default: false })
                    .eq("id", selectedClanId)
                    .then(({ error }) => {
                      if (error) setStatus(`Failed to clear default: ${error.message}`);
                      else {
                        setDefaultClanId("");
                        setStatus("Default clan cleared.");
                      }
                    });
                }}
              >
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M8 2.5L9.7 6.1L13.5 6.6L10.7 9.2L11.4 13L8 11.1L4.6 13L5.3 9.2L2.5 6.6L6.3 6.1L8 2.5Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path d="M3 13L13 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </IconButton>
            ) : null}
          </div>
        </div>
      </div>

      <div className="card-section" />
      <div className="list inline admin-members-filters filter-bar" style={{ alignItems: "center", flexWrap: "wrap" }}>
        <SearchInput
          id="memberSearch"
          label={tAdmin("common.search")}
          value={memberSearch}
          onChange={setMemberSearch}
          placeholder={tAdmin("clans.searchPlaceholder")}
        />
        <LabeledSelect
          id="memberRankFilter"
          label={tAdmin("common.rank")}
          value={memberRankFilter}
          onValueChange={setMemberRankFilter}
          options={[
            { value: "all", label: tAdmin("common.all") },
            { value: "", label: tAdmin("common.none") },
            ...rankOptions.map((rank) => ({ value: rank, label: formatRank(rank, locale) })),
          ]}
        />
        <LabeledSelect
          id="memberStatusFilter"
          label={tAdmin("common.status")}
          value={memberStatusFilter}
          onValueChange={setMemberStatusFilter}
          options={[
            { value: "all", label: tAdmin("common.all") },
            { value: "active", label: tAdmin("common.active") },
            { value: "inactive", label: tAdmin("common.inactive") },
          ]}
        />
        <button
          className="button"
          type="button"
          onClick={() => {
            setMemberSearch("");
            setMemberRankFilter("all");
            setMemberStatusFilter("all");
          }}
        >
          {tAdmin("common.clearFilters")}
        </button>
        <button
          className="button"
          type="button"
          onClick={handleSaveAllMembershipEdits}
          disabled={Object.keys(membershipEdits).length === 0}
        >
          {tAdmin("common.saveAll")}
        </button>
        <button
          className="button"
          type="button"
          onClick={cancelAllMembershipEdits}
          disabled={Object.keys(membershipEdits).length === 0}
        >
          {tAdmin("common.cancelAll")}
        </button>
        <span className="text-muted">
          {filteredMemberships.length} / {memberships.length}
        </span>
      </div>

      {memberships.length === 0 ? (
        <div className="list">
          <div className="list-item">
            <span>{tAdmin("clans.noAccountsYet")}</span>
            <span className="badge">{tAdmin("clans.assignSome")}</span>
          </div>
        </div>
      ) : filteredMemberships.length === 0 ? (
        <div className="list">
          <div className="list-item">
            <span>{tAdmin("clans.noAccountsMatch")}</span>
            <span className="badge">{tAdmin("clans.adjustSearch")}</span>
          </div>
        </div>
      ) : (
        <TableScroll>
          <div className="table members">
            <header>
              <span>#</span>
              <SortableColumnHeader
                label={tAdmin("members.gameAccount")}
                sortKey="game"
                activeSortKey={memberSortKey}
                direction={memberSortDirection}
                onToggle={toggleMemberSort}
                variant="triangle"
              />
              <SortableColumnHeader
                label={tAdmin("members.user")}
                sortKey="user"
                activeSortKey={memberSortKey}
                direction={memberSortDirection}
                onToggle={toggleMemberSort}
                variant="triangle"
              />
              <SortableColumnHeader
                label={tAdmin("common.clan")}
                sortKey="clan"
                activeSortKey={memberSortKey}
                direction={memberSortDirection}
                onToggle={toggleMemberSort}
                variant="triangle"
              />
              <SortableColumnHeader
                label={tAdmin("common.rank")}
                sortKey="rank"
                activeSortKey={memberSortKey}
                direction={memberSortDirection}
                onToggle={toggleMemberSort}
                variant="triangle"
              />
              <SortableColumnHeader
                label={tAdmin("common.status")}
                sortKey="status"
                activeSortKey={memberSortKey}
                direction={memberSortDirection}
                onToggle={toggleMemberSort}
                variant="triangle"
              />
              <span>{tAdmin("common.actions")}</span>
            </header>
            {sortedMemberships.map((membership, index) => (
              <div className="row" key={membership.id}>
                <span className="text-muted">{index + 1}</span>
                <div>
                  {membership.game_accounts?.id ? (
                    activeGameAccountId === membership.game_accounts.id ? (
                      <input
                        value={
                          gameAccountEdits[membership.game_accounts.id]?.game_username ??
                          membership.game_accounts.game_username
                        }
                        onChange={(e) =>
                          updateGameAccountEdit(membership.game_accounts!.id, "game_username", e.target.value)
                        }
                        placeholder={tAdmin("clans.gameUsername")}
                      />
                    ) : (
                      <button
                        className="editable-button editable-field"
                        type="button"
                        onClick={() =>
                          beginGameAccountEdit({
                            id: membership.game_accounts!.id,
                            user_id: membership.game_accounts!.user_id ?? "",
                            game_username: membership.game_accounts!.game_username ?? "",
                          })
                        }
                      >
                        {getMembershipLabel(membership)}
                      </button>
                    )
                  ) : (
                    <div>{getMembershipLabel(membership)}</div>
                  )}
                </div>
                <div>
                  <div>
                    {membership.game_accounts?.user_id
                      ? (profilesById[membership.game_accounts.user_id]?.email ?? "-")
                      : "-"}
                  </div>
                  <div className="text-muted">
                    {membership.game_accounts?.user_id
                      ? (profilesById[membership.game_accounts.user_id]?.display_name ??
                        profilesById[membership.game_accounts.user_id]?.username ??
                        "-")
                      : "-"}
                  </div>
                </div>
                <RadixSelect
                  ariaLabel={tAdmin("common.clan")}
                  value={getMembershipEditValue(membership).clan_id ?? membership.clan_id}
                  onValueChange={(value) => updateMembershipEdit(membership.id, "clan_id", value)}
                  options={clans.map((c) => ({ value: c.id, label: c.name }))}
                  triggerClassName={`select-trigger${isMembershipFieldChanged(membership, "clan_id") ? " is-edited" : ""}`}
                />
                <RadixSelect
                  ariaLabel={tAdmin("common.rank")}
                  value={getMembershipEditValue(membership).rank ?? ""}
                  onValueChange={(value) => updateMembershipEdit(membership.id, "rank", value)}
                  options={[
                    { value: "", label: tAdmin("common.none") },
                    ...rankOptions.map((rank) => ({ value: rank, label: formatRank(rank, locale) })),
                  ]}
                  triggerClassName={`select-trigger${isMembershipFieldChanged(membership, "rank") ? " is-edited" : ""}`}
                />
                <RadixSelect
                  ariaLabel={tAdmin("common.status")}
                  value={getMembershipEditValue(membership).is_active ? "true" : "false"}
                  onValueChange={(value) => updateMembershipEdit(membership.id, "is_active", value)}
                  options={[
                    { value: "true", label: tAdmin("common.active") },
                    { value: "false", label: tAdmin("common.inactive") },
                  ]}
                  triggerClassName={`select-trigger${isMembershipFieldChanged(membership, "is_active") ? " is-edited" : ""}`}
                  triggerDataRole="status-select"
                />
                <div className="list inline">
                  <IconButton
                    ariaLabel={tAdmin("common.saveChanges")}
                    onClick={() => void handleSaveMembershipEdit(membership)}
                  >
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M4 8.5L7 11.5L12 5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </IconButton>
                  <IconButton
                    ariaLabel={tAdmin("common.cancelChanges")}
                    onClick={() => cancelMembershipEdits(membership.id)}
                  >
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M4.5 4.5L11.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M11.5 4.5L4.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </IconButton>
                  {membership.game_accounts?.id ? (
                    <IconButton
                      ariaLabel={tAdmin("members.deleteGameAccount")}
                      onClick={() =>
                        openGameAccountDeleteConfirm({
                          id: membership.game_accounts!.id,
                          user_id: membership.game_accounts!.user_id ?? "",
                          game_username: membership.game_accounts!.game_username ?? "",
                        })
                      }
                      variant="danger"
                    >
                      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M3.5 5.5H12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        <path
                          d="M6 5.5V4C6 3.4 6.4 3 7 3H9C9.6 3 10 3.4 10 4V5.5"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                        />
                        <path
                          d="M5.2 5.5L5.6 12C5.6 12.6 6.1 13 6.7 13H9.3C9.9 13 10.4 12.6 10.4 12L10.8 5.5"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                        />
                      </svg>
                    </IconButton>
                  ) : null}
                  {membershipErrors[membership.id] ? (
                    <span className="text-muted">{membershipErrors[membership.id]}</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </TableScroll>
      )}

      {/* Clan create/edit modal */}
      {clanModal.open ? (
        <div className="modal-backdrop">
          <div className="modal card">
            <div className="card-header">
              <div>
                <div className="card-title">
                  {clanModal.mode === "edit" ? tAdmin("clans.editClan") : tAdmin("clans.createClan")}
                </div>
                <div className="card-subtitle">{tAdmin("clans.nameAndDescription")}</div>
              </div>
            </div>
            <form onSubmit={handleSaveClan}>
              <div className="form-group">
                <label htmlFor="clanModalName">{tAdmin("clans.clanName")}</label>
                <input
                  id="clanModalName"
                  value={clanModal.name}
                  onChange={(e) => setClanModal((m) => ({ ...m, name: e.target.value }))}
                  placeholder="[THC] Chiller & Killer"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="clanModalDescription">{tAdmin("clans.description")}</label>
                <input
                  id="clanModalDescription"
                  value={clanModal.description}
                  onChange={(e) => setClanModal((m) => ({ ...m, description: e.target.value }))}
                  placeholder="Primary clan hub"
                />
              </div>
              <div className="list">
                <button className="button primary" type="submit">
                  {clanModal.mode === "edit" ? tAdmin("common.saveChanges") : tAdmin("clans.createClan")}
                </button>
                <button className="button" type="button" onClick={() => setClanModal((m) => ({ ...m, open: false }))}>
                  {tAdmin("common.cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <DangerConfirmModal
        state={clanDelete}
        title={tAdmin("clans.deleteClan")}
        subtitle={tAdmin("danger.cannotBeUndone")}
        warningText={`This will permanently delete ${selectedClan?.name ?? ""} and all related data.`}
        confirmPhrase={`DELETE ${selectedClan?.name ?? ""}`}
        onConfirm={() => void handleDeleteClan()}
        deleteLabel={tAdmin("clans.deleteClan")}
        inputId="clanDeleteInput"
      />

      <DangerConfirmModal
        state={gameAccountDelete}
        title={tAdmin("gameAccounts.deleteTitle")}
        subtitle={tAdmin("danger.cannotBeUndone")}
        warningText={`This will permanently delete ${gameAccountToDelete?.game_username ?? ""} and all related data.`}
        confirmPhrase={`DELETE ${gameAccountToDelete?.game_username ?? ""}`}
        onConfirm={() => void handleConfirmDeleteGameAccount()}
        deleteLabel={tAdmin("members.deleteGameAccount")}
        inputId="gameAccountDeleteInput"
      />

      {/* Assign accounts modal */}
      {assignAccounts.isOpen ? (
        <div className="modal-backdrop">
          <div className="modal card">
            <div className="card-header">
              <div>
                <div className="card-title">{tAdmin("gameAccounts.assignTitle")}</div>
                <div className="card-subtitle">
                  {selectedClan ? `Assign to ${selectedClan.name}` : tAdmin("gameAccounts.selectClan")}
                </div>
              </div>
            </div>
            <div className="list inline admin-members-filters filter-bar" style={{ alignItems: "center" }}>
              <div className="form-group min-w-60">
                <SearchInput
                  id="assignSearch"
                  label={tAdmin("common.search")}
                  value={assignAccounts.search}
                  onChange={(value) => setAssignAccounts((a) => ({ ...a, search: value }))}
                  placeholder={tAdmin("gameAccounts.searchPlaceholder")}
                />
              </div>
              <div className="form-group">
                <label htmlFor="assignFilter">{tAdmin("common.show")}</label>
                <RadixSelect
                  id="assignFilter"
                  ariaLabel={tAdmin("common.show")}
                  value={assignAccounts.filter}
                  onValueChange={(value) =>
                    setAssignAccounts((a) => ({ ...a, filter: value as "unassigned" | "current" | "other" | "all" }))
                  }
                  options={[
                    { value: "unassigned", label: tAdmin("gameAccounts.unassigned") },
                    { value: "current", label: tAdmin("gameAccounts.currentClan") },
                    { value: "other", label: tAdmin("gameAccounts.otherClans") },
                    { value: "all", label: tAdmin("common.all") },
                  ]}
                />
              </div>
              <span className="text-muted">{assignAccounts.selectedIds.length} selected</span>
            </div>
            {assignAccounts.status ? <div className="alert info">{assignAccounts.status}</div> : null}
            {filteredAssignableAccounts.length === 0 ? (
              <div className="list">
                <div className="list-item">
                  <span>No game accounts match the filters</span>
                </div>
              </div>
            ) : (
              <div className="list">
                {filteredAssignableAccounts.map((account) => {
                  const clanName =
                    clans.find((c) => c.id === account.clan_id)?.name ??
                    (account.clan_id ? tAdmin("common.unknown") : "Unassigned");
                  const isSelected = assignAccounts.selectedIds.includes(account.id);
                  return (
                    <label key={account.id} className="list-item" style={{ cursor: "pointer" }}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleAssignSelection(account.id)} />
                      <div>
                        <div>{account.game_username}</div>
                        <div className="text-muted">
                          {account.user_display || account.user_email || account.user_id}
                        </div>
                      </div>
                      <span className="badge">{clanName}</span>
                    </label>
                  );
                })}
              </div>
            )}
            <div className="list inline">
              <button className="button primary" type="button" onClick={() => void handleAssignAccounts()}>
                {tAdmin("gameAccounts.assignSelected")}
              </button>
              <button className="button" type="button" onClick={closeAssignAccountsModal}>
                {tAdmin("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
