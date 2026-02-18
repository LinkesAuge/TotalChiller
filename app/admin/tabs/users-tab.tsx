"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type ReactElement } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useToast } from "../../components/toast-provider";
import SearchInput from "../../components/ui/search-input";
import LabeledSelect from "../../components/ui/labeled-select";
import RadixSelect from "../../components/ui/radix-select";
import IconButton from "../../components/ui/icon-button";
import GameButton from "../../components/ui/game-button";
import TableScroll from "../../components/table-scroll";
import { useAdminContext } from "../admin-context";
import SortableColumnHeader from "@/app/components/sortable-column-header";
import DangerConfirmModal from "../components/danger-confirm-modal";
import ConfirmModal from "@/app/components/confirm-modal";
import FormModal from "@/app/components/form-modal";
import { useConfirmDelete } from "../hooks/use-confirm-delete";
import { useSortable, compareValues } from "@/lib/hooks/use-sortable";
import {
  type UserRow,
  type UserEditState,
  type GameAccountRow,
  type GameAccountEditState,
  type MembershipRow,
  type MembershipEditState,
  type MembershipQueryRow,
  type UserSortKey,
  roleOptions,
  rankOptions,
  formatRank,
  formatRole,
  buildFallbackUserDb,
  normalizeMembershipRows,
} from "../admin-types";
import { isAdmin as isAdminRole, canChangeRoleOf } from "@/lib/permissions";

function getMembershipLabel(membership: MembershipRow): string {
  return membership.game_accounts?.game_username ?? "-";
}

/**
 * Users tab — manage users, game accounts, and inline editing.
 */
export default function UsersTab(): ReactElement {
  const {
    supabase,
    clans,
    unassignedClanId,
    currentUserId,
    currentUserRole,
    setStatus: _setStatus,
    setPendingApprovals,
    emailConfirmationsByUserId,
    setEmailConfirmationsByUserId,
    refreshEmailConfirmations,
  } = useAdminContext();
  const { pushToast } = useToast();
  const tAdmin = useTranslations("admin");
  const locale = useLocale();

  const userSort = useSortable<UserSortKey>("username", "asc");
  const { sortKey: userSortKey, sortDirection: userSortDirection, toggleSort: toggleUserSort } = userSort;

  const userDeleteState = useConfirmDelete();
  const gameAccountDeleteState = useConfirmDelete();

  const [userRows, setUserRows] = useState<readonly UserRow[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userGameAccountFilter, setUserGameAccountFilter] = useState<"all" | "with" | "without">("all");
  const [userConfirmedFilter, setUserConfirmedFilter] = useState<"all" | "confirmed" | "unconfirmed">("all");
  const [userEdits, setUserEdits] = useState<Record<string, UserEditState>>({});
  const [userErrors, setUserErrors] = useState<Record<string, string>>({});
  const [userStatus, setUserStatus] = useState("");
  const [gameAccountsByUserId, setGameAccountsByUserId] = useState<Record<string, GameAccountRow[]>>({});
  const [userMembershipsByAccountId, setUserMembershipsByAccountId] = useState<Record<string, MembershipRow>>({});
  const [userRolesById, setUserRolesById] = useState<Record<string, string>>({});
  const [expandedUserIds, setExpandedUserIds] = useState<readonly string[]>([]);
  const [activeEditingUserId, setActiveEditingUserId] = useState("");
  const [activeGameAccountId, setActiveGameAccountId] = useState("");
  const [gameAccountEdits, setGameAccountEdits] = useState<Record<string, GameAccountEditState>>({});
  const [membershipEdits, setMembershipEdits] = useState<Record<string, MembershipEditState>>({});
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [createUserEmail, setCreateUserEmail] = useState("");
  const [createUserUsername, setCreateUserUsername] = useState("");
  const [createUserDisplayName, setCreateUserDisplayName] = useState("");
  const [createUserStatus, setCreateUserStatus] = useState("");
  const [userToDelete, setUserToDelete] = useState<UserRow | null>(null);
  const [createGameAccountUser, setCreateGameAccountUser] = useState<UserRow | null>(null);
  const [createGameAccountForm, setCreateGameAccountForm] = useState({ username: "", clanId: "", rank: "soldier" });
  const [createGameAccountMessage, setCreateGameAccountMessage] = useState("");
  const [gameAccountToDelete, setGameAccountToDelete] = useState<GameAccountRow | null>(null);
  const [pendingSaveAllCount, setPendingSaveAllCount] = useState<number | null>(null);
  const [pendingResendInviteEmail, setPendingResendInviteEmail] = useState<string | null>(null);
  const [pendingConfirmUser, setPendingConfirmUser] = useState<UserRow | null>(null);

  const clanSelectOptions = useMemo(
    () => [{ value: "", label: tAdmin("clans.selectClan") }, ...clans.map((c) => ({ value: c.id, label: c.name }))],
    [clans, tAdmin],
  );

  const loadUsers = useCallback(async () => {
    const query = supabase.from("profiles").select("id,email,display_name,username,user_db").order("email");
    if (userSearch.trim()) {
      const pattern = `%${userSearch.trim()}%`;
      query.or(`email.ilike.${pattern},username.ilike.${pattern},display_name.ilike.${pattern}`);
    }
    const { data, error } = await query;
    if (error) {
      setUserStatus(`Failed to load users: ${error.message}`);
      return;
    }
    const rows = (data ?? []) as UserRow[];
    setUserRows(rows);
    const userIds = rows.map((r) => r.id);
    if (userIds.length === 0) {
      setGameAccountsByUserId({});
      setUserMembershipsByAccountId({});
      setUserRolesById({});
      return;
    }
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("user_id,role")
      .in("user_id", userIds);
    if (roleError) {
      setUserStatus(`Failed to load user roles: ${roleError.message}`);
      return;
    }
    const roleMap = (roleData ?? []).reduce<Record<string, string>>((acc, row) => {
      acc[row.user_id] = row.role;
      return acc;
    }, {});
    setUserRolesById(roleMap);
    const { data: gameAccountData, error: gameAccountError } = await supabase
      .from("game_accounts")
      .select("id,user_id,game_username,approval_status")
      .in("user_id", userIds)
      .order("game_username");
    if (gameAccountError) {
      setUserStatus(`Failed to load game accounts: ${gameAccountError.message}`);
      return;
    }
    const mapped = (gameAccountData ?? []).reduce<Record<string, GameAccountRow[]>>((acc, account) => {
      const list = acc[account.user_id] ?? [];
      list.push(account);
      acc[account.user_id] = list;
      return acc;
    }, {});
    setGameAccountsByUserId(mapped);
    const accountIds = (gameAccountData ?? []).map((a) => a.id);
    if (accountIds.length === 0) {
      setUserMembershipsByAccountId({});
      return;
    }
    if (unassignedClanId) {
      await supabase.rpc("ensure_unassigned_memberships");
    }
    const { data: membershipData, error: membershipError } = await supabase
      .from("game_account_clan_memberships")
      .select("id,clan_id,game_account_id,is_active,is_shadow,rank,game_accounts(id,user_id,game_username)")
      .in("game_account_id", accountIds);
    if (membershipError) {
      setUserStatus(`Failed to load memberships: ${membershipError.message}`);
      return;
    }
    const membershipMap = normalizeMembershipRows(
      membershipData as readonly MembershipQueryRow[] | null | undefined,
    ).reduce<Record<string, MembershipRow>>((acc, m) => {
      acc[m.game_account_id] = m;
      return acc;
    }, {});
    setUserMembershipsByAccountId(membershipMap);
  }, [supabase, unassignedClanId, userSearch]);

  const loadEmailConfirmations = useCallback(async () => {
    await refreshEmailConfirmations();
  }, [refreshEmailConfirmations]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    void loadEmailConfirmations();
  }, [loadEmailConfirmations]);

  useEffect(() => {
    if (userDeleteState.step === "closed") setUserToDelete(null);
  }, [userDeleteState.step]);

  useEffect(() => {
    if (gameAccountDeleteState.step === "closed") setGameAccountToDelete(null);
  }, [gameAccountDeleteState.step]);

  const getUserRole = useCallback((userId: string) => userRolesById[userId] ?? "member", [userRolesById]);

  const isUserConfirmed = useCallback(
    (userId: string): boolean => !!emailConfirmationsByUserId[userId],
    [emailConfirmationsByUserId],
  );

  const getUserSortValue = useCallback(
    (user: UserRow): string | number => {
      if (userSortKey === "email") return user.email;
      if (userSortKey === "nickname") return user.display_name ?? user.username ?? "";
      if (userSortKey === "role") return getUserRole(user.id);
      if (userSortKey === "accounts") return gameAccountsByUserId[user.id]?.length ?? 0;
      if (userSortKey === "confirmed") return isUserConfirmed(user.id) ? 1 : 0;
      return user.username ?? user.display_name ?? user.email;
    },
    [userSortKey, getUserRole, gameAccountsByUserId, isUserConfirmed],
  );

  const filteredUserRows = useMemo(() => {
    return userRows.filter((user) => {
      if (userRoleFilter !== "all" && (userRolesById[user.id] ?? "member") !== userRoleFilter) return false;
      if (userGameAccountFilter !== "all") {
        const hasAccounts = (gameAccountsByUserId[user.id]?.length ?? 0) > 0;
        if (userGameAccountFilter === "with" && !hasAccounts) return false;
        if (userGameAccountFilter === "without" && hasAccounts) return false;
      }
      if (userConfirmedFilter !== "all") {
        const confirmed = !!emailConfirmationsByUserId[user.id];
        if (userConfirmedFilter === "confirmed" && !confirmed) return false;
        if (userConfirmedFilter === "unconfirmed" && confirmed) return false;
      }
      return true;
    });
  }, [
    userRows,
    userRoleFilter,
    userGameAccountFilter,
    userConfirmedFilter,
    userRolesById,
    gameAccountsByUserId,
    emailConfirmationsByUserId,
  ]);

  const sortedUserRows = useMemo(() => {
    const sorted = [...filteredUserRows];
    sorted.sort((a, b) => compareValues(getUserSortValue(a), getUserSortValue(b), userSortDirection));
    return sorted;
  }, [filteredUserRows, getUserSortValue, userSortDirection]);

  const toggleUserExpanded = useCallback((userId: string) => {
    setExpandedUserIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );
  }, []);

  const handleUserRowClick = useCallback(
    (userId: string) => {
      if (activeEditingUserId && activeEditingUserId !== userId) {
        setActiveGameAccountId("");
        setActiveEditingUserId("");
      }
      toggleUserExpanded(userId);
    },
    [activeEditingUserId, toggleUserExpanded],
  );

  const beginUserEdit = useCallback(
    (user: UserRow) => {
      setActiveEditingUserId(user.id);
      setUserEdits((c) => ({
        ...c,
        [user.id]: {
          display_name: c[user.id]?.display_name ?? user.display_name ?? "",
          username: c[user.id]?.username ?? user.username ?? "",
          role: c[user.id]?.role ?? userRolesById[user.id] ?? "member",
        },
      }));
      setUserErrors((c) => {
        const next = { ...c };
        delete next[user.id];
        return next;
      });
    },
    [userRolesById],
  );

  const updateUserEdit = useCallback((userId: string, field: keyof UserEditState, value: string) => {
    setUserEdits((c) => ({ ...c, [userId]: { ...c[userId], [field]: value } }));
    setUserErrors((c) => {
      if (!c[userId]) return c;
      const next = { ...c };
      delete next[userId];
      return next;
    });
  }, []);

  const cancelUserEdit = useCallback((userId: string) => {
    setUserEdits((c) => {
      const next = { ...c };
      delete next[userId];
      return next;
    });
    setUserErrors((c) => {
      const next = { ...c };
      delete next[userId];
      return next;
    });
    setActiveEditingUserId((cur) => (cur === userId ? "" : cur));
  }, []);

  const isUserFieldChanged = useCallback(
    (user: UserRow, field: keyof UserEditState): boolean => {
      const edits = userEdits[user.id];
      if (!edits || edits[field] === undefined) return false;
      const nextValue = edits[field] ?? "";
      if (field === "display_name") return String(nextValue) !== String(user.display_name ?? "");
      if (field === "username") return String(nextValue) !== String(user.username ?? "");
      if (field === "role") return String(nextValue) !== getUserRole(user.id);
      return false;
    },
    [userEdits, getUserRole],
  );

  const getUserEditValue = useCallback(
    (user: UserRow): UserEditState => ({
      display_name: userEdits[user.id]?.display_name ?? user.display_name ?? "",
      username: userEdits[user.id]?.username ?? user.username ?? "",
      role: userEdits[user.id]?.role ?? getUserRole(user.id),
    }),
    [userEdits, getUserRole],
  );

  const handleSaveUserEdit = useCallback(
    async (user: UserRow, shouldReload = true): Promise<boolean> => {
      const edits = getUserEditValue(user);
      const baseUsername = user.username ?? user.user_db ?? "";
      let nextUsernameDisplay = edits.username?.trim() || baseUsername;
      if (!nextUsernameDisplay && user.email) {
        nextUsernameDisplay = buildFallbackUserDb(user.email, user.id);
        updateUserEdit(user.id, "username", nextUsernameDisplay);
      }
      if (!nextUsernameDisplay) {
        setUserErrors((c) => ({ ...c, [user.id]: "Username is required before updating nickname." }));
        return false;
      }
      const nextUsername = nextUsernameDisplay.toLowerCase();
      if (nextUsername.length < 2 || nextUsername.length > 32) {
        setUserErrors((c) => ({ ...c, [user.id]: "Username must be 2-32 characters." }));
        return false;
      }
      const nextRole = edits.role?.trim() || getUserRole(user.id);
      if (!roleOptions.includes(nextRole)) {
        setUserErrors((c) => ({ ...c, [user.id]: "Role is invalid." }));
        return false;
      }
      const currentTargetRole = getUserRole(user.id);
      if (nextRole !== currentTargetRole && !canChangeRoleOf(currentUserRole, currentTargetRole)) {
        setUserErrors((c) => ({ ...c, [user.id]: "You do not have permission to change this user's role." }));
        return false;
      }
      if (nextRole !== getUserRole(user.id)) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .upsert({ user_id: user.id, role: nextRole }, { onConflict: "user_id" });
        if (roleError) {
          setUserErrors((c) => ({ ...c, [user.id]: roleError.message }));
          return false;
        }
        setUserRolesById((c) => ({ ...c, [user.id]: nextRole }));
      }
      const nextDisplayName = edits.display_name?.trim() || null;
      if (nextDisplayName) {
        const { data: existing, error: dnError } = await supabase
          .from("profiles")
          .select("id")
          .ilike("display_name", nextDisplayName)
          .neq("id", user.id)
          .maybeSingle();
        if (dnError) {
          setUserErrors((c) => ({ ...c, [user.id]: dnError.message }));
          return false;
        }
        if (existing) {
          setUserErrors((c) => ({ ...c, [user.id]: "Nickname already exists." }));
          return false;
        }
      }
      const { error } = await supabase
        .from("profiles")
        .update({
          user_db: nextUsername,
          username: nextUsernameDisplay,
          display_name: nextDisplayName,
        })
        .eq("id", user.id);
      if (error) {
        setUserErrors((c) => ({ ...c, [user.id]: error.message }));
        return false;
      }
      cancelUserEdit(user.id);
      setActiveEditingUserId("");
      if (shouldReload) await loadUsers();
      return true;
    },
    [getUserEditValue, getUserRole, updateUserEdit, cancelUserEdit, supabase, loadUsers, currentUserRole],
  );

  const cancelAllUserEdits = useCallback(() => {
    setUserEdits({});
    setUserErrors({});
    setGameAccountEdits({});
    setMembershipEdits({});
    setActiveGameAccountId("");
    setActiveEditingUserId("");
    setUserStatus("All changes cleared.");
  }, []);

  const beginGameAccountEdit = useCallback((account: GameAccountRow) => {
    setActiveEditingUserId(account.user_id);
    setActiveGameAccountId(account.id);
    setGameAccountEdits((c) => ({
      ...c,
      [account.id]: { game_username: c[account.id]?.game_username ?? account.game_username },
    }));
  }, []);

  const updateGameAccountEdit = useCallback((accountId: string, field: keyof GameAccountEditState, value: string) => {
    setGameAccountEdits((c) => ({ ...c, [accountId]: { ...c[accountId], [field]: value } }));
    setUserStatus("");
  }, []);

  const cancelGameAccountEdit = useCallback((accountId: string) => {
    setGameAccountEdits((c) => {
      const next = { ...c };
      delete next[accountId];
      return next;
    });
    setActiveGameAccountId((cur) => (cur === accountId ? "" : cur));
  }, []);

  /* ── Membership edit helpers ── */

  const getMembershipEditValue = useCallback(
    (membership: MembershipRow): MembershipEditState => ({
      is_active: membershipEdits[membership.id]?.is_active ?? membership.is_active,
      is_shadow: membershipEdits[membership.id]?.is_shadow ?? membership.is_shadow,
      rank: membershipEdits[membership.id]?.rank ?? membership.rank ?? "",
      clan_id: membershipEdits[membership.id]?.clan_id ?? membership.clan_id,
    }),
    [membershipEdits],
  );

  const updateMembershipEdit = useCallback(
    (membershipId: string, field: keyof MembershipEditState, value: string) => {
      const membership = Object.values(userMembershipsByAccountId).find((m) => m.id === membershipId);
      const base: MembershipEditState = membership
        ? {
            is_active: membership.is_active,
            is_shadow: membership.is_shadow,
            rank: membership.rank ?? "",
            clan_id: membership.clan_id,
          }
        : { is_active: true, is_shadow: false, rank: "", clan_id: "" };
      setMembershipEdits((c) => {
        const existing = c[membershipId] ?? base;
        const nextValue = field === "is_active" || field === "is_shadow" ? value === "true" : value;
        return { ...c, [membershipId]: { ...existing, [field]: nextValue } };
      });
    },
    [userMembershipsByAccountId],
  );

  const cancelMembershipEdit = useCallback((membershipId: string) => {
    setMembershipEdits((c) => {
      if (!c[membershipId]) return c;
      const next = { ...c };
      delete next[membershipId];
      return next;
    });
  }, []);

  const isMembershipFieldChanged = useCallback(
    (membership: MembershipRow, field: keyof MembershipEditState): boolean => {
      const edits = membershipEdits[membership.id];
      if (!edits || edits[field] === undefined) return false;
      const nextValue = edits[field];
      if (field === "is_active") return Boolean(nextValue) !== membership.is_active;
      if (field === "is_shadow") return Boolean(nextValue) !== membership.is_shadow;
      if (field === "rank") return String(nextValue ?? "") !== String(membership.rank ?? "");
      if (field === "clan_id") return String(nextValue ?? "") !== membership.clan_id;
      return false;
    },
    [membershipEdits],
  );

  const handleSaveMembershipEdit = useCallback(
    async (membership: MembershipRow, shouldReload = true): Promise<boolean> => {
      const edits = membershipEdits[membership.id];
      if (!edits) return true;
      const next = getMembershipEditValue(membership);
      const nextClanId = next.clan_id ?? membership.clan_id;
      if (!nextClanId) {
        setUserStatus("Clan is required.");
        return false;
      }
      const payload = {
        clan_id: nextClanId,
        is_active: next.is_active ?? membership.is_active,
        is_shadow: next.is_shadow ?? membership.is_shadow,
        rank: next.rank ?? membership.rank,
      };
      const { error } = await supabase.from("game_account_clan_memberships").update(payload).eq("id", membership.id);
      if (error) {
        setUserStatus(`Failed to update membership: ${error.message}`);
        return false;
      }
      setMembershipEdits((c) => {
        const updated = { ...c };
        delete updated[membership.id];
        return updated;
      });
      setUserStatus("Membership updated.");
      if (shouldReload) await loadUsers();
      return true;
    },
    [membershipEdits, getMembershipEditValue, supabase, loadUsers],
  );

  const updateGameAccountState = useCallback((accountId: string, nextUsername: string) => {
    setGameAccountsByUserId((c) => {
      const updated: Record<string, GameAccountRow[]> = {};
      Object.entries(c).forEach(([userId, accounts]) => {
        updated[userId] = accounts.map((a) => (a.id === accountId ? { ...a, game_username: nextUsername } : a));
      });
      return updated;
    });
    setUserMembershipsByAccountId((c) => {
      const m = c[accountId];
      if (!m?.game_accounts) return c;
      return {
        ...c,
        [accountId]: {
          ...m,
          game_accounts: { ...m.game_accounts, game_username: nextUsername },
        },
      };
    });
  }, []);

  const handleSaveGameAccountEdit = useCallback(
    async (account: GameAccountRow, shouldReload = true): Promise<boolean> => {
      const editState = gameAccountEdits[account.id];
      if (!editState) return true;
      const nextUsername = (editState.game_username ?? account.game_username).trim();
      if (!nextUsername) {
        setUserStatus("Game username is required.");
        return false;
      }
      setUserStatus("Updating game account...");
      const { error } = await supabase
        .from("game_accounts")
        .update({ game_username: nextUsername })
        .eq("id", account.id);
      if (error) {
        setUserStatus(`Failed to update game account: ${error.message}`);
        return false;
      }
      updateGameAccountState(account.id, nextUsername);
      cancelGameAccountEdit(account.id);
      setActiveGameAccountId("");
      setUserStatus("Game account updated.");
      if (shouldReload) await loadUsers();
      return true;
    },
    [gameAccountEdits, supabase, updateGameAccountState, cancelGameAccountEdit, loadUsers],
  );

  const handleSaveAllUserEdits = useCallback(() => {
    const editIds = Object.keys(userEdits);
    const accountIds = Object.keys(gameAccountEdits);
    const memberIds = Object.keys(membershipEdits);
    if (editIds.length === 0 && accountIds.length === 0 && memberIds.length === 0) {
      setUserStatus("No changes to save.");
      return;
    }
    const total = editIds.length + accountIds.length + memberIds.length;
    setPendingSaveAllCount(total);
  }, [userEdits, gameAccountEdits, membershipEdits]);

  const handleConfirmSaveAll = useCallback(async () => {
    if (pendingSaveAllCount === null) return;
    const editIds = Object.keys(userEdits);
    const accountIds = Object.keys(gameAccountEdits);
    const memberIds = Object.keys(membershipEdits);
    setPendingSaveAllCount(null);
    setUserStatus("Saving changes...");
    let hasError = false;
    for (const userId of editIds) {
      const user = userRows.find((u) => u.id === userId);
      if (user && !(await handleSaveUserEdit(user, false))) hasError = true;
    }
    const allAccounts = Object.values(gameAccountsByUserId).flat();
    for (const accountId of accountIds) {
      const account = allAccounts.find((a) => a.id === accountId);
      if (account && !(await handleSaveGameAccountEdit(account, false))) hasError = true;
    }
    const allMemberships = Object.values(userMembershipsByAccountId);
    for (const membershipId of memberIds) {
      const membership = allMemberships.find((m) => m.id === membershipId);
      if (membership && !(await handleSaveMembershipEdit(membership, false))) hasError = true;
    }
    if (hasError) {
      setUserStatus("Some updates need fixes before saving.");
      return;
    }
    setUserStatus("All changes saved.");
    await loadUsers();
  }, [
    pendingSaveAllCount,
    userEdits,
    gameAccountEdits,
    membershipEdits,
    userRows,
    gameAccountsByUserId,
    userMembershipsByAccountId,
    handleSaveUserEdit,
    handleSaveGameAccountEdit,
    handleSaveMembershipEdit,
    loadUsers,
  ]);

  const handleCreateUser = useCallback(async () => {
    if (!createUserEmail.trim()) {
      setCreateUserStatus("Email is required.");
      return;
    }
    if (!createUserUsername.trim()) {
      setCreateUserStatus("Username is required.");
      return;
    }
    const u = createUserUsername.trim();
    if (u.length < 2 || u.length > 32) {
      setCreateUserStatus("Username must be 2-32 characters.");
      return;
    }
    setCreateUserStatus("Creating user...");
    const res = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: createUserEmail.trim(),
        username: u,
        displayName: createUserDisplayName.trim() || undefined,
      }),
    });
    const payload = (await res.json()) as { id?: string; error?: string };
    if (!res.ok) {
      setCreateUserStatus(payload.error ?? "Failed to create user.");
      return;
    }
    setCreateUserEmail("");
    setCreateUserUsername("");
    setCreateUserDisplayName("");
    setCreateUserStatus("User created.");
    setIsCreateUserModalOpen(false);
    await loadUsers();
  }, [createUserEmail, createUserUsername, createUserDisplayName, loadUsers]);

  const openUserDeleteConfirm = useCallback(
    (user: UserRow) => {
      if (user.id === currentUserId) {
        setUserStatus("You cannot delete your own account.");
        return;
      }
      if (
        isAdminRole(userRolesById[user.id] ?? "member") &&
        userRows.filter((r) => isAdminRole(userRolesById[r.id] ?? "member")).length <= 1
      ) {
        setUserStatus("At least one admin is required.");
        return;
      }
      setUserToDelete(user);
      userDeleteState.openConfirm();
    },
    [currentUserId, userRolesById, userRows, userDeleteState],
  );

  const handleDeleteUser = useCallback(async () => {
    if (!userToDelete) {
      setUserStatus("Select a user to delete.");
      return;
    }
    const phrase = `DELETE ${userToDelete.username ?? userToDelete.email}`;
    if (!userDeleteState.isConfirmed(phrase)) {
      setUserStatus("Deletion phrase does not match.");
      return;
    }
    setUserStatus("Deleting user...");
    const res = await fetch("/api/admin/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: userToDelete.id }),
    });
    const payload = (await res.json()) as { error?: string };
    if (!res.ok) {
      setUserStatus(payload.error ?? "Failed to delete user.");
      return;
    }
    userDeleteState.close();
    setUserToDelete(null);
    setUserStatus("User deleted.");
    await loadUsers();
  }, [userToDelete, userDeleteState, loadUsers]);

  const openCreateGameAccountModal = useCallback(
    (user: UserRow) => {
      setCreateGameAccountUser(user);
      const defaultRank = getUserRole(user.id) === "guest" ? "guest" : "soldier";
      setCreateGameAccountForm({ username: "", clanId: unassignedClanId, rank: defaultRank });
      setCreateGameAccountMessage("");
    },
    [unassignedClanId, getUserRole],
  );

  const closeCreateGameAccountModal = useCallback(() => {
    setCreateGameAccountUser(null);
    setCreateGameAccountMessage("");
  }, []);

  const handleCreateGameAccount = useCallback(async () => {
    if (!createGameAccountUser) return;
    const { username, clanId, rank } = createGameAccountForm;
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setCreateGameAccountMessage("Game username is required.");
      return;
    }
    if (!clanId) {
      setCreateGameAccountMessage("Select a clan for this account.");
      return;
    }
    if (!rank.trim()) {
      setCreateGameAccountMessage("Select a rank for this account.");
      return;
    }
    setCreateGameAccountMessage("Creating game account...");
    const { data: accountData, error } = await supabase
      .from("game_accounts")
      .insert({ user_id: createGameAccountUser.id, game_username: trimmedUsername })
      .select("id")
      .single();
    if (error || !accountData) {
      setCreateGameAccountMessage(error?.message ?? "Failed to create game account.");
      return;
    }
    const { error: membershipError } = await supabase.from("game_account_clan_memberships").upsert(
      {
        game_account_id: accountData.id,
        clan_id: clanId,
        is_active: true,
        rank: rank.trim() || null,
      },
      { onConflict: "game_account_id" },
    );
    if (membershipError) {
      setCreateGameAccountMessage(`Account created, but assignment failed: ${membershipError.message}`);
      return;
    }
    closeCreateGameAccountModal();
    await loadUsers();
  }, [createGameAccountUser, createGameAccountForm, supabase, closeCreateGameAccountModal, loadUsers]);

  const handleConfirmUser = useCallback(async () => {
    if (!pendingConfirmUser) return;
    setPendingConfirmUser(null);
    setUserStatus(tAdmin("users.confirmUser") + "...");
    try {
      const res = await fetch("/api/admin/email-confirmations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: pendingConfirmUser.id }),
      });
      const payload = (await res.json()) as { data?: { email_confirmed_at?: string }; error?: string };
      if (!res.ok) {
        setUserStatus(payload.error ?? tAdmin("users.confirmUserFailed"));
        return;
      }
      setEmailConfirmationsByUserId((c) => ({
        ...c,
        [pendingConfirmUser.id]: payload.data?.email_confirmed_at ?? new Date().toISOString(),
      }));
      setUserStatus(tAdmin("users.confirmUserSuccess"));
      pushToast(tAdmin("users.confirmUserSuccess"));
    } catch {
      setUserStatus(tAdmin("users.confirmUserFailed"));
    }
  }, [pendingConfirmUser, tAdmin, pushToast, setEmailConfirmationsByUserId]);

  const handleResendInvite = useCallback((email: string) => {
    if (!email) {
      setCreateUserStatus("User email is required to resend invite.");
      return;
    }
    setPendingResendInviteEmail(email);
  }, []);

  const handleConfirmResendInvite = useCallback(async () => {
    const email = pendingResendInviteEmail;
    if (!email) return;
    setPendingResendInviteEmail(null);
    setCreateUserStatus("Resending invite...");
    const res = await fetch("/api/admin/resend-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const payload = (await res.json()) as { error?: string };
    if (!res.ok) {
      setCreateUserStatus(payload.error ?? "Failed to resend invite.");
      return;
    }
    setCreateUserStatus("Invite resent.");
  }, [pendingResendInviteEmail]);

  const handleApprovalAction = useCallback(
    async (gameAccountId: string, action: "approve" | "reject") => {
      setUserStatus(action === "approve" ? "Approving..." : "Rejecting...");
      try {
        const res = await fetch("/api/admin/game-account-approvals", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ game_account_id: gameAccountId, action }),
        });
        const result = await res.json();
        if (!res.ok) {
          setUserStatus(result.error ?? `Failed to ${action} account.`);
          return;
        }
        setPendingApprovals((cur) => cur.filter((item) => item.id !== gameAccountId));
        setUserStatus(action === "approve" ? "Game account approved." : "Game account rejected.");
        pushToast(action === "approve" ? "Game account approved" : "Game account rejected");
      } catch {
        setUserStatus(`Network error during ${action}.`);
      }
    },
    [setPendingApprovals, pushToast],
  );

  const openGameAccountDeleteConfirm = useCallback(
    (account: GameAccountRow) => {
      setGameAccountToDelete(account);
      gameAccountDeleteState.openConfirm();
    },
    [gameAccountDeleteState],
  );

  const handleConfirmDeleteGameAccount = useCallback(async () => {
    if (!gameAccountToDelete) {
      setUserStatus("Select a game account to delete.");
      return;
    }
    const phrase = `DELETE ${gameAccountToDelete.game_username}`;
    if (!gameAccountDeleteState.isConfirmed(phrase)) {
      setUserStatus("Deletion phrase does not match.");
      return;
    }
    setUserStatus("Deleting game account...");
    const { error } = await supabase.from("game_accounts").delete().eq("id", gameAccountToDelete.id);
    if (error) {
      setUserStatus(`Failed to delete game account: ${error.message}`);
      return;
    }
    gameAccountDeleteState.close();
    setGameAccountToDelete(null);
    setUserStatus("Game account deleted.");
    await loadUsers();
  }, [gameAccountToDelete, gameAccountDeleteState, supabase, loadUsers]);

  const hasEdits =
    Object.keys(userEdits).length > 0 ||
    Object.keys(gameAccountEdits).length > 0 ||
    Object.keys(membershipEdits).length > 0;

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <div className="card-title">{tAdmin("users.title")}</div>
          <div className="card-subtitle">{tAdmin("users.subtitle")}</div>
        </div>
        <span className="badge">{filteredUserRows.length}</span>
      </div>
      <div className="list inline admin-members-filters filter-bar admin-filter-row">
        <div style={{ marginRight: 12 }}>
          <span className="filter-bar-spacer" aria-hidden="true">
            &nbsp;
          </span>
          <GameButton variant="ornate2" fontSize="0.62rem" onClick={() => setIsCreateUserModalOpen(true)}>
            {tAdmin("users.createUser")}
          </GameButton>
        </div>
        <div style={{ maxWidth: 220 }}>
          <SearchInput
            id="userSearch"
            label={tAdmin("common.search")}
            value={userSearch}
            onChange={setUserSearch}
            placeholder={tAdmin("users.searchPlaceholder")}
          />
        </div>
        <LabeledSelect
          id="userRoleFilter"
          label={tAdmin("common.role")}
          value={userRoleFilter}
          onValueChange={setUserRoleFilter}
          options={[
            { value: "all", label: tAdmin("common.all") },
            ...roleOptions.map((role) => ({ value: role, label: formatRole(role, locale) })),
          ]}
        />
        <LabeledSelect
          id="userGameAccountFilter"
          label={tAdmin("users.gameAccounts")}
          value={userGameAccountFilter}
          onValueChange={(v) => setUserGameAccountFilter(v as "all" | "with" | "without")}
          options={[
            { value: "all", label: tAdmin("common.all") },
            { value: "with", label: tAdmin("users.withGameAccount") },
            { value: "without", label: tAdmin("users.withoutGameAccount") },
          ]}
        />
        <LabeledSelect
          id="userConfirmedFilter"
          label={tAdmin("users.confirmed")}
          value={userConfirmedFilter}
          onValueChange={(v) => setUserConfirmedFilter(v as "all" | "confirmed" | "unconfirmed")}
          options={[
            { value: "all", label: tAdmin("common.all") },
            { value: "confirmed", label: tAdmin("users.confirmedFilter") },
            { value: "unconfirmed", label: tAdmin("users.unconfirmedFilter") },
          ]}
        />
        <button
          className="button"
          type="button"
          onClick={() => {
            setUserSearch("");
            setUserRoleFilter("all");
            setUserGameAccountFilter("all");
            setUserConfirmedFilter("all");
          }}
        >
          {tAdmin("common.clearFilters")}
        </button>
        <button className="button" type="button" onClick={handleSaveAllUserEdits} disabled={!hasEdits}>
          {tAdmin("common.saveAll")}
        </button>
        <button className="button" type="button" onClick={cancelAllUserEdits} disabled={!hasEdits}>
          {tAdmin("common.cancelAll")}
        </button>
        <span className="text-muted admin-filter-summary">
          {filteredUserRows.length} / {userRows.length}
        </span>
      </div>
      {userStatus ? <div className="alert info">{userStatus}</div> : null}
      {userRows.length === 0 ? (
        <div className="list">
          <div className="list-item">
            <span>{tAdmin("users.noUsersFound")}</span>
            <span className="badge">{tAdmin("users.adjustSearch")}</span>
          </div>
        </div>
      ) : filteredUserRows.length === 0 ? (
        <div className="list">
          <div className="list-item">
            <span>{tAdmin("users.noUsersMatch")}</span>
            <span className="badge">{tAdmin("users.adjustSearch")}</span>
          </div>
        </div>
      ) : (
        <TableScroll>
          <div className="table users">
            <header>
              <span>#</span>
              <SortableColumnHeader
                label={tAdmin("users.username")}
                sortKey="username"
                activeSortKey={userSortKey}
                direction={userSortDirection}
                onToggle={toggleUserSort}
                variant="triangle"
              />
              <SortableColumnHeader
                label={tAdmin("users.email")}
                sortKey="email"
                activeSortKey={userSortKey}
                direction={userSortDirection}
                onToggle={toggleUserSort}
                variant="triangle"
              />
              <SortableColumnHeader
                label={tAdmin("users.nickname")}
                sortKey="nickname"
                activeSortKey={userSortKey}
                direction={userSortDirection}
                onToggle={toggleUserSort}
                variant="triangle"
              />
              <SortableColumnHeader
                label={tAdmin("common.role")}
                sortKey="role"
                activeSortKey={userSortKey}
                direction={userSortDirection}
                onToggle={toggleUserSort}
                variant="triangle"
              />
              <SortableColumnHeader
                label={tAdmin("users.confirmed")}
                sortKey="confirmed"
                activeSortKey={userSortKey}
                direction={userSortDirection}
                onToggle={toggleUserSort}
                variant="triangle"
              />
              <SortableColumnHeader
                label={tAdmin("users.gameAccounts")}
                sortKey="accounts"
                activeSortKey={userSortKey}
                direction={userSortDirection}
                onToggle={toggleUserSort}
                variant="triangle"
              />
              <span>{tAdmin("common.actions")}</span>
            </header>
            {sortedUserRows.map((user, index) => {
              const isExpanded = expandedUserIds.includes(user.id);
              const accounts = [...(gameAccountsByUserId[user.id] ?? [])].sort((a, b) =>
                a.game_username.localeCompare(b.game_username),
              );
              const edits = getUserEditValue(user);
              const isEditing = activeEditingUserId === user.id;
              return (
                <div key={user.id}>
                  <div
                    className="row"
                    role="button"
                    tabIndex={0}
                    onClick={() => handleUserRowClick(user.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleUserRowClick(user.id);
                      }
                    }}
                  >
                    <span className="text-muted">{index + 1}</span>
                    <div className="flex items-center gap-2">
                      <span className="row-caret" aria-hidden="true">
                        <svg width="14" height="10" viewBox="0 0 12 8" fill="none">
                          <path
                            d={isExpanded ? "M1 1L6 6L11 1" : "M3 1L9 4L3 7"}
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      {isEditing ? (
                        <input
                          className={`editable-field flex-1 ${isUserFieldChanged(user, "username") ? "is-edited" : ""}`.trim()}
                          value={edits.username ?? ""}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => updateUserEdit(user.id, "username", e.target.value)}
                        />
                      ) : (
                        <button
                          className="editable-button editable-field"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            beginUserEdit(user);
                          }}
                        >
                          {edits.username || "-"}
                        </button>
                      )}
                    </div>
                    <div>{user.email}</div>
                    {isEditing ? (
                      <input
                        className={`editable-field ${isUserFieldChanged(user, "display_name") ? "is-edited" : ""}`.trim()}
                        value={edits.display_name ?? ""}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updateUserEdit(user.id, "display_name", e.target.value)}
                      />
                    ) : (
                      <button
                        className="editable-button editable-field"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          beginUserEdit(user);
                        }}
                      >
                        {edits.display_name || "-"}
                      </button>
                    )}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      {(() => {
                        const targetRole = getUserRole(user.id);
                        const roleChangeAllowed = canChangeRoleOf(currentUserRole, targetRole);
                        return (
                          <RadixSelect
                            ariaLabel={tAdmin("common.role")}
                            value={edits.role ?? targetRole}
                            onValueChange={(v) => updateUserEdit(user.id, "role", v)}
                            options={roleOptions.map((r) => ({ value: r, label: formatRole(r, locale) }))}
                            triggerClassName={`select-trigger${isUserFieldChanged(user, "role") ? " is-edited" : ""}`}
                            disabled={!roleChangeAllowed}
                          />
                        );
                      })()}
                    </div>
                    <div>
                      {isUserConfirmed(user.id) ? (
                        <span className="badge success" title={tAdmin("users.emailConfirmed")}>
                          {tAdmin("users.confirmed")}
                        </span>
                      ) : (
                        <span className="badge warning" title={tAdmin("users.emailUnconfirmed")}>
                          {tAdmin("users.unconfirmed")}
                        </span>
                      )}
                    </div>
                    <div className="text-muted flex items-center gap-1.5">
                      <span className="badge" aria-label={`${accounts.length} game accounts`}>
                        {accounts.length}
                      </span>
                    </div>
                    <div
                      role="toolbar"
                      className="list inline user-actions action-icons admin-row-actions"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      {!isUserConfirmed(user.id) ? (
                        <IconButton
                          ariaLabel={tAdmin("users.confirmUser")}
                          onClick={() => setPendingConfirmUser(user)}
                          variant="primary"
                          className="admin-action-primary"
                        >
                          <img src="/assets/game/icons/icons_moderator_add.png" alt="" width={16} height={16} />
                        </IconButton>
                      ) : null}
                      <IconButton
                        ariaLabel={tAdmin("users.resendInvite")}
                        onClick={() => handleResendInvite(user.email)}
                        className="admin-action-secondary"
                      >
                        <img src="/assets/game/icons/icons_envelope_1.png" alt="" width={16} height={16} />
                      </IconButton>
                      <IconButton
                        ariaLabel={tAdmin("users.addGameAccount")}
                        onClick={() => openCreateGameAccountModal(user)}
                        className="admin-action-secondary"
                      >
                        <img src="/assets/game/icons/icons_plus_3.png" alt="" width={16} height={16} />
                      </IconButton>
                      <IconButton
                        ariaLabel={tAdmin("common.saveChanges")}
                        onClick={() => handleSaveUserEdit(user)}
                        variant="primary"
                        className="admin-action-primary"
                      >
                        <img src="/assets/game/icons/components_check_box_mark.png" alt="" width={16} height={16} />
                      </IconButton>
                      <IconButton
                        ariaLabel={tAdmin("common.cancelChanges")}
                        onClick={() => cancelUserEdit(user.id)}
                        className="admin-action-secondary"
                      >
                        <img src="/assets/game/icons/icons_close.png" alt="" width={16} height={16} />
                      </IconButton>
                      <IconButton
                        ariaLabel={tAdmin("users.deleteUser")}
                        onClick={() => openUserDeleteConfirm(user)}
                        variant="danger"
                        className="admin-action-danger"
                      >
                        <img src="/assets/game/icons/icons_paper_cross_1.png" alt="" width={16} height={16} />
                      </IconButton>
                    </div>
                  </div>
                  {isExpanded ? (
                    <div className="row subrow">
                      <div className="col-span-full">
                        {accounts.length === 0 ? (
                          <div className="text-muted">{tAdmin("clans.noAccountsYet")}</div>
                        ) : (
                          <TableScroll>
                            <div className="table members">
                              <header>
                                <span>#</span>
                                <span>{tAdmin("members.gameAccount")}</span>
                                <span>{tAdmin("members.user")}</span>
                                <span>{tAdmin("common.clan")}</span>
                                <span>{tAdmin("common.rank")}</span>
                                <span>{tAdmin("common.status")}</span>
                                <span>{tAdmin("common.actions")}</span>
                              </header>
                              {accounts.map((account, idx) => {
                                const membership = userMembershipsByAccountId[account.id];
                                const isAccountEditing = activeGameAccountId === account.id;
                                const displayUsername =
                                  isAccountEditing && gameAccountEdits[account.id]
                                    ? (gameAccountEdits[account.id]!.game_username ?? account.game_username)
                                    : account.game_username;
                                if (!membership) {
                                  return (
                                    <div className="row" key={account.id}>
                                      <span className="text-muted">{idx + 1}</span>
                                      <div>
                                        {account.game_username}
                                        {account.approval_status && account.approval_status !== "approved" ? (
                                          <span
                                            className={`badge ${account.approval_status === "pending" ? "warning" : "danger"} ml-2 text-[0.75em]`}
                                          >
                                            {account.approval_status}
                                          </span>
                                        ) : null}
                                      </div>
                                      <div>
                                        <div>{user.email}</div>
                                        <div className="text-muted">{user.display_name ?? user.username ?? "-"}</div>
                                      </div>
                                      <div className="text-muted">-</div>
                                      <div className="text-muted">-</div>
                                      <div className="text-muted">{tAdmin("members.missingMembership")}</div>
                                      <div className="list inline action-icons admin-row-actions">
                                        {account.approval_status === "pending" ? (
                                          <>
                                            <IconButton
                                              ariaLabel={tAdmin("common.approve")}
                                              onClick={() => handleApprovalAction(account.id, "approve")}
                                              variant="primary"
                                              className="admin-action-primary"
                                            >
                                              <img
                                                src="/assets/game/icons/components_check_box_mark.png"
                                                alt=""
                                                width={16}
                                                height={16}
                                              />
                                            </IconButton>
                                            <IconButton
                                              ariaLabel={tAdmin("common.reject")}
                                              onClick={() => handleApprovalAction(account.id, "reject")}
                                              variant="danger"
                                              className="admin-action-danger"
                                            >
                                              <img
                                                src="/assets/game/icons/icons_close.png"
                                                alt=""
                                                width={16}
                                                height={16}
                                              />
                                            </IconButton>
                                          </>
                                        ) : null}
                                        <IconButton
                                          ariaLabel={tAdmin("members.deleteGameAccount")}
                                          onClick={() => openGameAccountDeleteConfirm(account)}
                                          variant="danger"
                                          className="admin-action-danger"
                                        >
                                          <img
                                            src="/assets/game/icons/icons_paper_cross_1.png"
                                            alt=""
                                            width={16}
                                            height={16}
                                          />
                                        </IconButton>
                                      </div>
                                    </div>
                                  );
                                }
                                const memberEdits = getMembershipEditValue(membership);
                                const hasMemberEdits = !!membershipEdits[membership.id];
                                const hasAnyRowEdit = isAccountEditing || hasMemberEdits;
                                return (
                                  <div
                                    className={`row${(memberEdits.is_shadow ?? membership.is_shadow) ? " is-shadow" : ""}`}
                                    key={membership.id}
                                  >
                                    <span className="text-muted">
                                      {idx + 1}
                                      {(memberEdits.is_shadow ?? membership.is_shadow) ? (
                                        <span className="badge shadow-badge" title={tAdmin("clans.shadowTooltip")}>
                                          S
                                        </span>
                                      ) : null}
                                    </span>
                                    <div>
                                      {isAccountEditing ? (
                                        <input
                                          value={displayUsername}
                                          onChange={(e) =>
                                            updateGameAccountEdit(account.id, "game_username", e.target.value)
                                          }
                                          placeholder={tAdmin("clans.gameUsername")}
                                        />
                                      ) : (
                                        <button
                                          className="editable-button editable-field"
                                          type="button"
                                          onClick={() => beginGameAccountEdit(account)}
                                        >
                                          {getMembershipLabel(membership)}
                                        </button>
                                      )}
                                      {account.approval_status && account.approval_status !== "approved" ? (
                                        <span
                                          className={`badge ${account.approval_status === "pending" ? "warning" : "danger"} ml-2 text-[0.75em]`}
                                        >
                                          {account.approval_status}
                                        </span>
                                      ) : null}
                                    </div>
                                    <div>
                                      <div>{user.email}</div>
                                      <div className="text-muted">{user.display_name ?? user.username ?? "-"}</div>
                                    </div>
                                    <RadixSelect
                                      ariaLabel={tAdmin("common.clan")}
                                      value={memberEdits.clan_id ?? membership.clan_id}
                                      onValueChange={(v) => updateMembershipEdit(membership.id, "clan_id", v)}
                                      options={clans.map((c) => ({ value: c.id, label: c.name }))}
                                      triggerClassName={`select-trigger${isMembershipFieldChanged(membership, "clan_id") ? " is-edited" : ""}`}
                                    />
                                    <RadixSelect
                                      ariaLabel={tAdmin("common.rank")}
                                      value={memberEdits.rank ?? ""}
                                      onValueChange={(v) => updateMembershipEdit(membership.id, "rank", v)}
                                      options={[
                                        { value: "", label: tAdmin("common.none") },
                                        ...rankOptions.map((r) => ({ value: r, label: formatRank(r, locale) })),
                                      ]}
                                      triggerClassName={`select-trigger${isMembershipFieldChanged(membership, "rank") ? " is-edited" : ""}`}
                                    />
                                    <RadixSelect
                                      ariaLabel={tAdmin("common.status")}
                                      value={memberEdits.is_active ? "true" : "false"}
                                      onValueChange={(v) => updateMembershipEdit(membership.id, "is_active", v)}
                                      options={[
                                        { value: "true", label: tAdmin("common.active") },
                                        { value: "false", label: tAdmin("common.inactive") },
                                      ]}
                                      triggerClassName={`select-trigger${isMembershipFieldChanged(membership, "is_active") ? " is-edited" : ""}`}
                                      triggerDataRole="status-select"
                                    />
                                    <div className="list inline action-icons admin-row-actions">
                                      {hasAnyRowEdit ? (
                                        <>
                                          <IconButton
                                            ariaLabel={tAdmin("common.saveChanges")}
                                            onClick={async () => {
                                              if (isAccountEditing) await handleSaveGameAccountEdit(account, false);
                                              if (hasMemberEdits) await handleSaveMembershipEdit(membership, false);
                                              await loadUsers();
                                            }}
                                            variant="primary"
                                            className="admin-action-primary"
                                          >
                                            <img
                                              src="/assets/game/icons/components_check_box_mark.png"
                                              alt=""
                                              width={16}
                                              height={16}
                                            />
                                          </IconButton>
                                          <IconButton
                                            ariaLabel={tAdmin("common.cancelChanges")}
                                            onClick={() => {
                                              cancelGameAccountEdit(account.id);
                                              cancelMembershipEdit(membership.id);
                                            }}
                                            className="admin-action-secondary"
                                          >
                                            <img
                                              src="/assets/game/icons/icons_close.png"
                                              alt=""
                                              width={16}
                                              height={16}
                                            />
                                          </IconButton>
                                        </>
                                      ) : null}
                                      <IconButton
                                        ariaLabel={tAdmin("clans.toggleShadow")}
                                        onClick={() => {
                                          const current = memberEdits.is_shadow ?? membership.is_shadow;
                                          updateMembershipEdit(membership.id, "is_shadow", current ? "false" : "true");
                                        }}
                                        variant={(memberEdits.is_shadow ?? membership.is_shadow) ? "active" : undefined}
                                        className="admin-action-secondary"
                                      >
                                        <img
                                          src="/assets/game/icons/icons_player_4.png"
                                          alt=""
                                          width={16}
                                          height={16}
                                        />
                                      </IconButton>
                                      {account.approval_status === "pending" ? (
                                        <>
                                          <IconButton
                                            ariaLabel={tAdmin("common.approve")}
                                            onClick={() => handleApprovalAction(account.id, "approve")}
                                            variant="primary"
                                            className="admin-action-primary"
                                          >
                                            <img
                                              src="/assets/game/icons/components_check_box_mark.png"
                                              alt=""
                                              width={16}
                                              height={16}
                                            />
                                          </IconButton>
                                          <IconButton
                                            ariaLabel={tAdmin("common.reject")}
                                            onClick={() => handleApprovalAction(account.id, "reject")}
                                            variant="danger"
                                            className="admin-action-danger"
                                          >
                                            <img
                                              src="/assets/game/icons/icons_close.png"
                                              alt=""
                                              width={16}
                                              height={16}
                                            />
                                          </IconButton>
                                        </>
                                      ) : null}
                                      <IconButton
                                        ariaLabel={tAdmin("members.deleteGameAccount")}
                                        onClick={() => openGameAccountDeleteConfirm(account)}
                                        variant="danger"
                                        className="admin-action-danger"
                                      >
                                        <img
                                          src="/assets/game/icons/icons_paper_cross_1.png"
                                          alt=""
                                          width={16}
                                          height={16}
                                        />
                                      </IconButton>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </TableScroll>
                        )}
                      </div>
                    </div>
                  ) : null}
                  {userErrors[user.id] ? (
                    <div className="row subrow">
                      <div className="col-span-full">
                        <div className="alert warn">{userErrors[user.id]}</div>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </TableScroll>
      )}

      {/* Create user modal */}
      <FormModal
        isOpen={isCreateUserModalOpen}
        title={tAdmin("users.createUser")}
        statusMessage={createUserStatus}
        submitLabel={tAdmin("common.create")}
        cancelLabel={tAdmin("common.cancel")}
        onSubmit={handleCreateUser}
        onCancel={() => {
          setIsCreateUserModalOpen(false);
          setCreateUserStatus("");
        }}
      >
        <div className="list">
          <div className="form-group">
            <label htmlFor="createUserEmail">{tAdmin("users.email")}</label>
            <input
              id="createUserEmail"
              type="email"
              value={createUserEmail}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setCreateUserEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>
          <div className="form-group">
            <label htmlFor="createUserUsername">{tAdmin("users.username")}</label>
            <input
              id="createUserUsername"
              value={createUserUsername}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setCreateUserUsername(e.target.value)}
              placeholder="username"
            />
          </div>
          <div className="form-group">
            <label htmlFor="createUserDisplayName">{tAdmin("users.nickname")}</label>
            <input
              id="createUserDisplayName"
              value={createUserDisplayName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setCreateUserDisplayName(e.target.value)}
              placeholder="Display name"
            />
          </div>
        </div>
      </FormModal>

      {/* User delete DangerConfirmModal */}
      <DangerConfirmModal
        state={userDeleteState}
        title={tAdmin("users.deleteUser")}
        subtitle={userToDelete ? userToDelete.email : undefined}
        warningText={tAdmin("danger.deleteUserWarning")}
        confirmPhrase={`DELETE ${userToDelete?.username ?? userToDelete?.email}`}
        onConfirm={handleDeleteUser}
        inputId="userDeleteInput"
      />

      {/* Create game account modal */}
      <FormModal
        isOpen={!!createGameAccountUser}
        title={tAdmin("users.addGameAccount")}
        subtitle={
          createGameAccountUser
            ? `${createGameAccountUser.email} (${createGameAccountUser.display_name ?? createGameAccountUser.username ?? "-"})`
            : undefined
        }
        statusMessage={createGameAccountMessage}
        submitLabel={tAdmin("common.create")}
        cancelLabel={tAdmin("common.cancel")}
        onSubmit={handleCreateGameAccount}
        onCancel={closeCreateGameAccountModal}
      >
        <div className="list">
          <div className="form-group">
            <label htmlFor="createGameAccountUsername">{tAdmin("clans.gameUsername")}</label>
            <input
              id="createGameAccountUsername"
              value={createGameAccountForm.username}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setCreateGameAccountForm((prev) => ({ ...prev, username: e.target.value }))
              }
              placeholder={tAdmin("clans.gameUsername")}
            />
          </div>
          <div className="form-group">
            <LabeledSelect
              id="createGameAccountClan"
              label={tAdmin("common.clan")}
              value={createGameAccountForm.clanId}
              onValueChange={(v) => setCreateGameAccountForm((prev) => ({ ...prev, clanId: v }))}
              options={clanSelectOptions}
            />
          </div>
          <div className="form-group">
            <LabeledSelect
              id="createGameAccountRank"
              label={tAdmin("common.rank")}
              value={createGameAccountForm.rank}
              onValueChange={(v) => setCreateGameAccountForm((prev) => ({ ...prev, rank: v }))}
              options={[
                { value: "", label: tAdmin("common.none") },
                ...rankOptions.map((r) => ({ value: r, label: formatRank(r, locale) })),
              ]}
            />
          </div>
        </div>
      </FormModal>

      {/* Game account delete DangerConfirmModal */}
      <DangerConfirmModal
        state={gameAccountDeleteState}
        title={tAdmin("members.deleteGameAccount")}
        warningText={tAdmin("danger.deleteGameAccountWarning")}
        confirmPhrase={`DELETE ${gameAccountToDelete?.game_username}`}
        onConfirm={handleConfirmDeleteGameAccount}
        inputId="gameAccountDeleteInput"
      />

      {/* Save all changes ConfirmModal */}
      <ConfirmModal
        isOpen={pendingSaveAllCount !== null}
        title={tAdmin("common.saveAll")}
        message={tAdmin("users.saveAllConfirm", { count: pendingSaveAllCount ?? 0 })}
        variant="info"
        confirmLabel={tAdmin("common.saveChanges")}
        cancelLabel={tAdmin("common.cancel")}
        onConfirm={() => void handleConfirmSaveAll()}
        onCancel={() => setPendingSaveAllCount(null)}
      />

      {/* Resend invite ConfirmModal */}
      <ConfirmModal
        isOpen={pendingResendInviteEmail !== null}
        title={tAdmin("users.resendInvite")}
        message={tAdmin("users.resendInviteConfirm", { email: pendingResendInviteEmail ?? "" })}
        variant="info"
        confirmButtonVariant="turquoise"
        confirmLabel={tAdmin("users.resendInvite")}
        cancelLabel={tAdmin("common.cancel")}
        onConfirm={() => void handleConfirmResendInvite()}
        onCancel={() => setPendingResendInviteEmail(null)}
      />

      {/* Confirm user registration ConfirmModal */}
      <ConfirmModal
        isOpen={pendingConfirmUser !== null}
        title={tAdmin("users.confirmUser")}
        message={tAdmin("users.confirmUserMessage", { email: pendingConfirmUser?.email ?? "" })}
        variant="info"
        confirmButtonVariant="turquoise"
        confirmLabel={tAdmin("users.confirmUser")}
        cancelLabel={tAdmin("common.cancel")}
        onConfirm={() => void handleConfirmUser()}
        onCancel={() => setPendingConfirmUser(null)}
      />
    </section>
  );
}
