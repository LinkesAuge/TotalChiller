"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import RadixSelect from "../components/ui/radix-select";
import SearchInput from "../components/ui/search-input";
import IconButton from "../components/ui/icon-button";
import LabeledSelect from "../components/ui/labeled-select";
import TableScroll from "../components/table-scroll";
import { useRouter, useSearchParams } from "next/navigation";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";
import formatGermanDateTime from "../../lib/date-format";
import { useToast } from "../components/toast-provider";

interface ClanRow {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly is_unassigned?: boolean | null;
}

interface GameAccountRow {
  readonly id: string;
  readonly user_id: string;
  readonly game_username: string;
}

interface MembershipRow {
  readonly id: string;
  readonly clan_id: string;
  readonly game_account_id: string;
  readonly is_active: boolean;
  readonly rank: string | null;
  readonly game_accounts: GameAccountRow | null;
}

interface MembershipEditState {
  readonly is_active?: boolean;
  readonly rank?: string | null;
  readonly clan_id?: string;
}

interface GameAccountEditState {
  readonly game_username?: string;
}

interface AssignableGameAccount {
  readonly id: string;
  readonly user_id: string;
  readonly game_username: string;
  readonly clan_id: string | null;
  readonly user_email: string;
  readonly user_display: string;
}

interface ProfileRow {
  readonly id: string;
  readonly email: string;
  readonly display_name: string | null;
  readonly username: string | null;
}

type MemberSortKey = "game" | "user" | "clan" | "rank" | "status";
type UserSortKey = "username" | "email" | "nickname" | "role" | "admin" | "accounts";

interface UserRow {
  readonly id: string;
  readonly email: string;
  readonly display_name: string | null;
  readonly username: string | null;
  readonly user_db: string | null;
  readonly is_admin?: boolean | null;
}

interface UserEditState {
  readonly display_name?: string | null;
  readonly username?: string | null;
  readonly role?: string | null;
}

interface RuleRow {
  readonly id: string;
  readonly field?: string;
  readonly match_value?: string;
  readonly replacement_value?: string;
  readonly status?: string;
  readonly chest_match?: string;
  readonly source_match?: string;
  readonly min_level?: number | null;
  readonly max_level?: number | null;
  readonly score?: number;
  readonly rule_order?: number;
}

interface ValidationFieldCount {
  readonly total: number;
  readonly active: number;
}

interface AuditLogRow {
  readonly id: string;
  readonly clan_id: string;
  readonly actor_id: string;
  readonly action: string;
  readonly entity: string;
  readonly entity_id: string;
  readonly diff: Record<string, unknown> | null;
  readonly created_at: string;
}

const roleOptions: readonly string[] = ["owner", "admin", "moderator", "editor", "member"];
const rankOptions: readonly string[] = ["leader", "superior", "officer", "veteran", "soldier"];
const ruleFieldOptions: readonly string[] = ["player", "source", "chest", "clan"];
const correctionFieldOptions: readonly string[] = ["all", ...ruleFieldOptions];
const NEW_VALIDATION_ID = "validation-new";
const NEW_CORRECTION_ID = "correction-new";
const validationSortOptions: readonly { value: "field" | "status" | "match_value"; label: string }[] = [
  { value: "field", label: "Field" },
  { value: "status", label: "Status" },
  { value: "match_value", label: "Match value" },
];
const correctionSortOptions: readonly { value: "field" | "match_value" | "replacement_value" | "status"; label: string }[] = [
  { value: "field", label: "Field" },
  { value: "match_value", label: "Match value" },
  { value: "replacement_value", label: "Replacement" },
  { value: "status", label: "Status" },
];
const scoringSortOptions: readonly { value: "rule_order" | "score" | "chest_match" | "source_match"; label: string }[] =
  [
    { value: "rule_order", label: "Order" },
    { value: "score", label: "Score" },
    { value: "chest_match", label: "Chest" },
    { value: "source_match", label: "Source" },
  ];

function formatLabel(value: string): string {
  if (!value) {
    return value;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function buildFallbackUserDb(email: string, userId: string): string {
  const prefix = email.split("@")[0] || "user";
  const suffix = userId.replace(/-/g, "").slice(-6);
  return `${prefix}_${suffix}`.toLowerCase();
}

/**
 * Admin UI for clan and game account management.
 */
function AdminClient(): JSX.Element {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pushToast } = useToast();
  const [clans, setClans] = useState<readonly ClanRow[]>([]);
  const [memberships, setMemberships] = useState<readonly MembershipRow[]>([]);
  const [selectedClanId, setSelectedClanId] = useState<string>("");
  const [unassignedClanId, setUnassignedClanId] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [membershipEdits, setMembershipEdits] = useState<Record<string, MembershipEditState>>({});
  const [membershipErrors, setMembershipErrors] = useState<Record<string, string>>({});
  const [profilesById, setProfilesById] = useState<Record<string, ProfileRow>>({});
  const [memberSearch, setMemberSearch] = useState<string>("");
  const [memberRankFilter, setMemberRankFilter] = useState<string>("all");
  const [memberStatusFilter, setMemberStatusFilter] = useState<string>("all");
  const [memberSortKey, setMemberSortKey] = useState<MemberSortKey>("game");
  const [memberSortDirection, setMemberSortDirection] = useState<"asc" | "desc">("asc");
  const [userSortKey, setUserSortKey] = useState<UserSortKey>("username");
  const [userSortDirection, setUserSortDirection] = useState<"asc" | "desc">("asc");
  const [validationRules, setValidationRules] = useState<readonly RuleRow[]>([]);
  const [correctionRules, setCorrectionRules] = useState<readonly RuleRow[]>([]);
  const [scoringRules, setScoringRules] = useState<readonly RuleRow[]>([]);
  const [validationSearch, setValidationSearch] = useState<string>("");
  const [validationListField, setValidationListField] = useState<string>("player");
  const [validationStatusFilter, setValidationStatusFilter] = useState<string>("all");
  const [validationSortKey, setValidationSortKey] = useState<"field" | "status" | "match_value">("field");
  const [validationSortDirection, setValidationSortDirection] = useState<"asc" | "desc">("asc");
  const [validationImportStatus, setValidationImportStatus] = useState<string>("");
  const [validationImportMode, setValidationImportMode] = useState<"append" | "replace">("append");
  const [validationIgnoreDuplicates, setValidationIgnoreDuplicates] = useState<boolean>(true);
  const [isValidationImportOpen, setIsValidationImportOpen] = useState<boolean>(false);
  const [isValidationReplaceConfirmOpen, setIsValidationReplaceConfirmOpen] = useState<boolean>(false);
  const [validationImportFileName, setValidationImportFileName] = useState<string>("");
  const [validationImportEntries, setValidationImportEntries] = useState<readonly RuleRow[]>([]);
  const [validationImportErrors, setValidationImportErrors] = useState<readonly string[]>([]);
  const [validationImportSelected, setValidationImportSelected] = useState<readonly number[]>([]);
  const [validationSelectedIds, setValidationSelectedIds] = useState<readonly string[]>([]);
  const [isValidationDeleteConfirmOpen, setIsValidationDeleteConfirmOpen] = useState<boolean>(false);
  const [isValidationDeleteInputOpen, setIsValidationDeleteInputOpen] = useState<boolean>(false);
  const [validationDeleteInput, setValidationDeleteInput] = useState<string>("");
  const [correctionSearch, setCorrectionSearch] = useState<string>("");
  const [correctionListField, setCorrectionListField] = useState<string>("player");
  const [correctionStatusFilter, setCorrectionStatusFilter] = useState<string>("all");
  const [correctionSortKey, setCorrectionSortKey] =
    useState<"field" | "match_value" | "replacement_value" | "status">("field");
  const [correctionSortDirection, setCorrectionSortDirection] = useState<"asc" | "desc">("asc");
  const [correctionImportStatus, setCorrectionImportStatus] = useState<string>("");
  const [correctionImportMode, setCorrectionImportMode] = useState<"append" | "replace">("append");
  const [correctionIgnoreDuplicates, setCorrectionIgnoreDuplicates] = useState<boolean>(true);
  const [isCorrectionImportOpen, setIsCorrectionImportOpen] = useState<boolean>(false);
  const [isCorrectionReplaceConfirmOpen, setIsCorrectionReplaceConfirmOpen] = useState<boolean>(false);
  const [correctionImportFileName, setCorrectionImportFileName] = useState<string>("");
  const [correctionImportEntries, setCorrectionImportEntries] = useState<readonly RuleRow[]>([]);
  const [correctionImportErrors, setCorrectionImportErrors] = useState<readonly string[]>([]);
  const [correctionImportSelected, setCorrectionImportSelected] = useState<readonly number[]>([]);
  const [correctionSelectedIds, setCorrectionSelectedIds] = useState<readonly string[]>([]);
  const [isCorrectionDeleteConfirmOpen, setIsCorrectionDeleteConfirmOpen] = useState<boolean>(false);
  const [isCorrectionDeleteInputOpen, setIsCorrectionDeleteInputOpen] = useState<boolean>(false);
  const [correctionDeleteInput, setCorrectionDeleteInput] = useState<string>("");
  const [scoringSearch, setScoringSearch] = useState<string>("");
  const [scoringSortKey, setScoringSortKey] =
    useState<"rule_order" | "score" | "chest_match" | "source_match">("rule_order");
  const [scoringSortDirection, setScoringSortDirection] = useState<"asc" | "desc">("asc");
  const [validationPage, setValidationPage] = useState<number>(1);
  const [correctionPage, setCorrectionPage] = useState<number>(1);
  const [scoringPage, setScoringPage] = useState<number>(1);
  const [validationPageSize, setValidationPageSize] = useState<number>(50);
  const [correctionPageSize, setCorrectionPageSize] = useState<number>(50);
  const [scoringPageSize, setScoringPageSize] = useState<number>(50);
  const [auditLogs, setAuditLogs] = useState<readonly AuditLogRow[]>([]);
  const [auditActorsById, setAuditActorsById] = useState<Record<string, ProfileRow>>({});
  const [auditPage, setAuditPage] = useState<number>(1);
  const [auditPageSize, setAuditPageSize] = useState<number>(50);
  const [auditTotalCount, setAuditTotalCount] = useState<number>(0);
  const [auditSearch, setAuditSearch] = useState<string>("");
  const [auditActionFilter, setAuditActionFilter] = useState<string>("all");
  const [auditEntityFilter, setAuditEntityFilter] = useState<string>("all");
  const [auditActorFilter, setAuditActorFilter] = useState<string>("all");
  const [auditClanFilter, setAuditClanFilter] = useState<string>("");
  const [validationField, setValidationField] = useState<string>("source");
  const [validationMatch, setValidationMatch] = useState<string>("");
  const [validationStatus, setValidationStatus] = useState<string>("valid");
  const [validationEditingId, setValidationEditingId] = useState<string>("");
  const [correctionField, setCorrectionField] = useState<string>("source");
  const [correctionMatch, setCorrectionMatch] = useState<string>("");
  const [correctionReplacement, setCorrectionReplacement] = useState<string>("");
  const [correctionStatus, setCorrectionStatus] = useState<string>("active");
  const [correctionEditingId, setCorrectionEditingId] = useState<string>("");
  const [scoringChest, setScoringChest] = useState<string>("");
  const [scoringSource, setScoringSource] = useState<string>("");
  const [scoringMinLevel, setScoringMinLevel] = useState<string>("");
  const [scoringMaxLevel, setScoringMaxLevel] = useState<string>("");
  const [scoringScore, setScoringScore] = useState<string>("");
  const [scoringOrder, setScoringOrder] = useState<string>("1");
  const [scoringEditingId, setScoringEditingId] = useState<string>("");
  const [activeSection, setActiveSection] = useState<"clans" | "validation" | "corrections" | "logs" | "users">("clans");
  const [isClanModalOpen, setIsClanModalOpen] = useState<boolean>(false);
  const [clanModalMode, setClanModalMode] = useState<"create" | "edit">("create");
  const [clanModalName, setClanModalName] = useState<string>("");
  const [clanModalDescription, setClanModalDescription] = useState<string>("");
  const [isClanDeleteConfirmOpen, setIsClanDeleteConfirmOpen] = useState<boolean>(false);
  const [isClanDeleteInputOpen, setIsClanDeleteInputOpen] = useState<boolean>(false);
  const [clanDeleteInput, setClanDeleteInput] = useState<string>("");
  const [defaultClanId, setDefaultClanId] = useState<string>("");
  const [userSearch, setUserSearch] = useState<string>("");
  const [userRoleFilter, setUserRoleFilter] = useState<string>("all");
  const [userAdminFilter, setUserAdminFilter] = useState<string>("all");
  const [userRows, setUserRows] = useState<readonly UserRow[]>([]);
  const [gameAccountsByUserId, setGameAccountsByUserId] = useState<Record<string, GameAccountRow[]>>({});
  const [userMembershipsByAccountId, setUserMembershipsByAccountId] = useState<Record<string, MembershipRow>>({});
  const [userRolesById, setUserRolesById] = useState<Record<string, string>>({});
  const [userStatus, setUserStatus] = useState<string>("");
  const [gameAccountEdits, setGameAccountEdits] = useState<Record<string, GameAccountEditState>>({});
  const [activeGameAccountId, setActiveGameAccountId] = useState<string>("");
  const [userEdits, setUserEdits] = useState<Record<string, UserEditState>>({});
  const [userErrors, setUserErrors] = useState<Record<string, string>>({});
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [activeEditingUserId, setActiveEditingUserId] = useState<string>("");
  const [assignAccounts, setAssignAccounts] = useState<readonly AssignableGameAccount[]>([]);
  const [assignSelectedIds, setAssignSelectedIds] = useState<readonly string[]>([]);
  const [assignSearch, setAssignSearch] = useState<string>("");
  const [assignFilter, setAssignFilter] = useState<"unassigned" | "current" | "other" | "all">("unassigned");
  const [assignStatus, setAssignStatus] = useState<string>("");
  const [isAssignAccountsModalOpen, setIsAssignAccountsModalOpen] = useState<boolean>(false);
  const clanSelectNone = "__none__";
  const clanSelectValue = selectedClanId || clanSelectNone;
  const clanSelectOptions = useMemo(
    () => [
      { value: clanSelectNone, label: "Select a clan" },
      ...clans.map((clan) => ({ value: clan.id, label: clan.name })),
    ],
    [clans, clanSelectNone],
  );
  const clanNameById = useMemo(() => {
    return new Map(clans.map((clan) => [clan.id, clan.name]));
  }, [clans]);
  const [createUserEmail, setCreateUserEmail] = useState<string>("");
  const [createUserUsername, setCreateUserUsername] = useState<string>("");
  const [createUserDisplayName, setCreateUserDisplayName] = useState<string>("");
  const [createUserStatus, setCreateUserStatus] = useState<string>("");
  const [expandedUserIds, setExpandedUserIds] = useState<readonly string[]>([]);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState<boolean>(false);
  const [isUserDeleteConfirmOpen, setIsUserDeleteConfirmOpen] = useState<boolean>(false);
  const [isUserDeleteInputOpen, setIsUserDeleteInputOpen] = useState<boolean>(false);
  const [userDeleteInput, setUserDeleteInput] = useState<string>("");
  const [userToDelete, setUserToDelete] = useState<UserRow | null>(null);
  const [isCreateGameAccountModalOpen, setIsCreateGameAccountModalOpen] = useState<boolean>(false);
  const [createGameAccountUser, setCreateGameAccountUser] = useState<UserRow | null>(null);
  const [createGameAccountUsername, setCreateGameAccountUsername] = useState<string>("");
  const [createGameAccountClanId, setCreateGameAccountClanId] = useState<string>("");
  const [createGameAccountRank, setCreateGameAccountRank] = useState<string>("soldier");
  const [createGameAccountStatus, setCreateGameAccountStatus] = useState<string>("active");
  const [createGameAccountMessage, setCreateGameAccountMessage] = useState<string>("");
  const [isGameAccountDeleteConfirmOpen, setIsGameAccountDeleteConfirmOpen] = useState<boolean>(false);
  const [isGameAccountDeleteInputOpen, setIsGameAccountDeleteInputOpen] = useState<boolean>(false);
  const [gameAccountDeleteInput, setGameAccountDeleteInput] = useState<string>("");
  const [gameAccountToDelete, setGameAccountToDelete] = useState<GameAccountRow | null>(null);

  const selectedClan = useMemo(
    () => clans.find((clan) => clan.id === selectedClanId),
    [clans, selectedClanId],
  );
  const validationSelectAllRef = useRef<HTMLInputElement | null>(null);
  const correctionSelectAllRef = useRef<HTMLInputElement | null>(null);

  function paginateRules<T>(rules: readonly T[], page: number, pageSize: number): readonly T[] {
    const startIndex = (page - 1) * pageSize;
    return rules.slice(startIndex, startIndex + pageSize);
  }

  function compareRuleValues(
    left: string | number | null | undefined,
    right: string | number | null | undefined,
    direction: "asc" | "desc",
  ): number {
    if (left === right) {
      return 0;
    }
    if (left === undefined || left === null) {
      return direction === "asc" ? 1 : -1;
    }
    if (right === undefined || right === null) {
      return direction === "asc" ? -1 : 1;
    }
    if (typeof left === "number" && typeof right === "number") {
      return direction === "asc" ? left - right : right - left;
    }
    const leftText = String(left);
    const rightText = String(right);
    const result = leftText.localeCompare(rightText, undefined, { sensitivity: "base" });
    return direction === "asc" ? result : -result;
  }

  function getMemberSortValue(membership: MembershipRow): string | number {
    const userId = membership.game_accounts?.user_id ?? "";
    const profile = userId ? profilesById[userId] : undefined;
    const userLabel = profile?.display_name ?? profile?.username ?? profile?.email ?? "";
    const clanLabel = clanNameById.get(membership.clan_id) ?? "";
    if (memberSortKey === "game") {
      return membership.game_accounts?.game_username ?? "";
    }
    if (memberSortKey === "user") {
      return userLabel;
    }
    if (memberSortKey === "clan") {
      return clanLabel;
    }
    if (memberSortKey === "rank") {
      return membership.rank ?? "";
    }
    return membership.is_active ? "active" : "inactive";
  }

  function getUserSortValue(user: UserRow): string | number {
    if (userSortKey === "email") {
      return user.email;
    }
    if (userSortKey === "nickname") {
      return user.display_name ?? user.username ?? "";
    }
    if (userSortKey === "role") {
      return userRolesById[user.id] ?? "member";
    }
    if (userSortKey === "admin") {
      return user.is_admin ? 1 : 0;
    }
    if (userSortKey === "accounts") {
      return gameAccountsByUserId[user.id]?.length ?? 0;
    }
    return user.username ?? user.display_name ?? user.email;
  }

  function getAccountSortValue(account: GameAccountRow): string | number {
    const membership = userMembershipsByAccountId[account.id];
    if (membership) {
      return getMemberSortValue(membership);
    }
    if (memberSortKey === "game") {
      return account.game_username;
    }
    if (memberSortKey === "user") {
      const profile = profilesById[account.user_id];
      return profile?.display_name ?? profile?.username ?? profile?.email ?? "";
    }
    return "";
  }

  function toggleMemberSort(nextKey: MemberSortKey): void {
    if (memberSortKey !== nextKey) {
      setMemberSortKey(nextKey);
      setMemberSortDirection("asc");
      return;
    }
    setMemberSortDirection((current) => (current === "asc" ? "desc" : "asc"));
  }

  function renderMemberSortButton(label: string, key: MemberSortKey): JSX.Element {
    const isActive = memberSortKey === key;
    return (
      <button className="table-sort-button" type="button" onClick={() => toggleMemberSort(key)}>
        <span>{label}</span>
        {isActive ? (
          <svg
            aria-hidden="true"
            className={`table-sort-indicator ${memberSortDirection === "desc" ? "is-desc" : ""}`.trim()}
            width="10"
            height="10"
            viewBox="0 0 12 12"
            fill="none"
          >
            <path d="M6 2L10 6H2L6 2Z" fill="currentColor" />
          </svg>
        ) : null}
      </button>
    );
  }

  function toggleUserSort(nextKey: UserSortKey): void {
    if (userSortKey !== nextKey) {
      setUserSortKey(nextKey);
      setUserSortDirection("asc");
      return;
    }
    setUserSortDirection((current) => (current === "asc" ? "desc" : "asc"));
  }

  function renderUserSortButton(label: string, key: UserSortKey): JSX.Element {
    const isActive = userSortKey === key;
    return (
      <button className="table-sort-button" type="button" onClick={() => toggleUserSort(key)}>
        <span>{label}</span>
        {isActive ? (
          <svg
            aria-hidden="true"
            className={`table-sort-indicator ${userSortDirection === "desc" ? "is-desc" : ""}`.trim()}
            width="10"
            height="10"
            viewBox="0 0 12 12"
            fill="none"
          >
            <path d="M6 2L10 6H2L6 2Z" fill="currentColor" />
          </svg>
        ) : null}
      </button>
    );
  }

  function toggleUserExpanded(userId: string): void {
    setExpandedUserIds((current) => {
      if (current.includes(userId)) {
        return current.filter((id) => id !== userId);
      }
      return [...current, userId];
    });
  }

  function handleUserRowClick(userId: string): void {
    if (activeEditingUserId && activeEditingUserId !== userId) {
      setActiveGameAccountId("");
      setActiveEditingUserId("");
    }
    toggleUserExpanded(userId);
  }

  function openAssignAccountsModal(): void {
    if (!selectedClanId) {
      setStatus("Select a clan before assigning game accounts.");
      return;
    }
    setAssignSelectedIds([]);
    setAssignSearch("");
    setAssignFilter("unassigned");
    setAssignStatus("");
    setIsAssignAccountsModalOpen(true);
    void loadAssignableGameAccounts();
  }

  function closeAssignAccountsModal(): void {
    setIsAssignAccountsModalOpen(false);
    setAssignSelectedIds([]);
    setAssignSearch("");
    setAssignStatus("");
  }

  async function handleAssignAccounts(): Promise<void> {
    if (!selectedClanId) {
      setAssignStatus("Select a clan before assigning.");
      return;
    }
    if (assignSelectedIds.length === 0) {
      setAssignStatus("Select at least one game account to assign.");
      return;
    }
    setAssignStatus("Assigning game accounts...");
    const { error } = await supabase
      .from("game_account_clan_memberships")
      .update({ clan_id: selectedClanId })
      .in("game_account_id", assignSelectedIds);
    if (error) {
      setAssignStatus(`Failed to assign: ${error.message}`);
      return;
    }
    setAssignStatus("Assignments updated.");
    await loadMemberships(selectedClanId);
    await loadUsers();
    closeAssignAccountsModal();
  }

  const filteredAssignableAccounts = useMemo(() => {
    const normalizedSearch = assignSearch.trim().toLowerCase();
    return assignAccounts.filter((account) => {
      if (assignFilter === "unassigned" && account.clan_id !== unassignedClanId) {
        return false;
      }
      if (assignFilter === "current" && account.clan_id !== selectedClanId) {
        return false;
      }
      if (assignFilter === "other" && (!account.clan_id || account.clan_id === selectedClanId)) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      const target = `${account.game_username} ${account.user_email} ${account.user_display}`.toLowerCase();
      return target.includes(normalizedSearch);
    });
  }, [assignAccounts, assignFilter, assignSearch, selectedClanId, unassignedClanId]);

  function toggleAssignSelection(accountId: string): void {
    setAssignSelectedIds((current) => {
      if (current.includes(accountId)) {
        return current.filter((id) => id !== accountId);
      }
      return [...current, accountId];
    });
  }

  function updateGameAccountState(accountId: string, nextUsername: string): void {
    setGameAccountsByUserId((current) => {
      const updated: Record<string, GameAccountRow[]> = {};
      Object.entries(current).forEach(([userId, accounts]) => {
        updated[userId] = accounts.map((account) =>
          account.id === accountId ? { ...account, game_username: nextUsername } : account,
        );
      });
      return updated;
    });
    setUserMembershipsByAccountId((current) => {
      const membership = current[accountId];
      if (!membership || !membership.game_accounts) {
        return current;
      }
      return {
        ...current,
        [accountId]: {
          ...membership,
          game_accounts: {
            ...membership.game_accounts,
            game_username: nextUsername,
          },
        },
      };
    });
    setMemberships((current) =>
      current.map((membership) => {
        if (membership.game_accounts?.id !== accountId || !membership.game_accounts) {
          return membership;
        }
        return {
          ...membership,
          game_accounts: {
            ...membership.game_accounts,
            game_username: nextUsername,
          },
        };
      }),
    );
    setAssignAccounts((current) =>
      current.map((account) => (account.id === accountId ? { ...account, game_username: nextUsername } : account)),
    );
  }

  const filteredValidationRules = useMemo(() => {
    const normalizedSearch = validationSearch.trim().toLowerCase();
    return validationRules.filter((rule) => {
      if (validationListField && rule.field !== validationListField) {
        return false;
      }
      if (validationStatusFilter !== "all" && rule.status !== validationStatusFilter) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      const searchText = [rule.field, rule.match_value, rule.status]
        .filter((value): value is string => Boolean(value))
        .join(" ")
        .toLowerCase();
      return searchText.includes(normalizedSearch);
    });
  }, [validationListField, validationRules, validationSearch, validationStatusFilter]);

  const sortedValidationRules = useMemo(() => {
    const sorted = [...filteredValidationRules];
    sorted.sort((left, right) => {
      const leftValue = left[validationSortKey];
      const rightValue = right[validationSortKey];
      return compareRuleValues(leftValue, rightValue, validationSortDirection);
    });
    return sorted;
  }, [filteredValidationRules, validationSortDirection, validationSortKey]);

  const validationFieldCounts = useMemo(() => {
    const counts = ruleFieldOptions.reduce<Record<string, ValidationFieldCount>>((acc, field) => {
      acc[field] = { total: 0, active: 0 };
      return acc;
    }, {});
    validationRules.forEach((rule) => {
      const field = rule.field ?? "";
      const target = counts[field];
      if (!target) {
        return;
      }
      target.total += 1;
      const statusValue = (rule.status ?? "").toLowerCase();
      if (statusValue === "valid" || statusValue === "active") {
        target.active += 1;
      }
    });
    return counts;
  }, [validationRules]);

  const correctionFieldCounts = useMemo(() => {
    const counts = correctionFieldOptions.reduce<Record<string, ValidationFieldCount>>((acc, field) => {
      acc[field] = { total: 0, active: 0 };
      return acc;
    }, {});
    correctionRules.forEach((rule) => {
      const field = rule.field ?? "";
      const target = counts[field];
      if (!target) {
        return;
      }
      target.total += 1;
      const statusValue = (rule.status ?? "active").toLowerCase();
      if (statusValue === "active") {
        target.active += 1;
      }
    });
    return counts;
  }, [correctionRules]);

  const filteredCorrectionRules = useMemo(() => {
    const normalizedSearch = correctionSearch.trim().toLowerCase();
    return correctionRules.filter((rule) => {
      if (rule.field !== correctionListField) {
        return false;
      }
      const statusValue = (rule.status ?? "active").toLowerCase();
      if (correctionStatusFilter !== "all" && statusValue !== correctionStatusFilter) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      const searchText = [rule.field, rule.match_value, rule.replacement_value, rule.status]
        .filter((value): value is string => Boolean(value))
        .join(" ")
        .toLowerCase();
      return searchText.includes(normalizedSearch);
    });
  }, [correctionListField, correctionRules, correctionSearch, correctionStatusFilter]);

  const sortedCorrectionRules = useMemo(() => {
    const sorted = [...filteredCorrectionRules];
    sorted.sort((left, right) => {
      const leftValue = left[correctionSortKey];
      const rightValue = right[correctionSortKey];
      return compareRuleValues(leftValue, rightValue, correctionSortDirection);
    });
    return sorted;
  }, [correctionSortDirection, correctionSortKey, filteredCorrectionRules]);

  const filteredScoringRules = useMemo(() => {
    const normalizedSearch = scoringSearch.trim().toLowerCase();
    return scoringRules.filter((rule) => {
      if (!normalizedSearch) {
        return true;
      }
      const searchText = [
        rule.chest_match,
        rule.source_match,
        rule.min_level?.toString(),
        rule.max_level?.toString(),
        rule.score?.toString(),
        rule.rule_order?.toString(),
      ]
        .filter((value): value is string => Boolean(value))
        .join(" ")
        .toLowerCase();
      return searchText.includes(normalizedSearch);
    });
  }, [scoringRules, scoringSearch]);

  const sortedScoringRules = useMemo(() => {
    const sorted = [...filteredScoringRules];
    sorted.sort((left, right) => {
      const leftValue = left[scoringSortKey];
      const rightValue = right[scoringSortKey];
      return compareRuleValues(leftValue, rightValue, scoringSortDirection);
    });
    return sorted;
  }, [filteredScoringRules, scoringSortDirection, scoringSortKey]);

  const pagedValidationRules = useMemo(
    () => paginateRules(sortedValidationRules, validationPage, validationPageSize),
    [sortedValidationRules, validationPageSize, validationPage],
  );
  const validationSelectedSet = useMemo(() => new Set(validationSelectedIds), [validationSelectedIds]);
  const areAllValidationRowsSelected = useMemo(
    () => pagedValidationRules.length > 0 && pagedValidationRules.every((rule) => validationSelectedSet.has(rule.id)),
    [pagedValidationRules, validationSelectedSet],
  );
  const areSomeValidationRowsSelected = useMemo(
    () => pagedValidationRules.some((rule) => validationSelectedSet.has(rule.id)) && !areAllValidationRowsSelected,
    [areAllValidationRowsSelected, pagedValidationRules, validationSelectedSet],
  );
  const activeValidationCounts = validationFieldCounts[validationListField] ?? { total: 0, active: 0 };
  const pagedCorrectionRules = useMemo(
    () => paginateRules(sortedCorrectionRules, correctionPage, correctionPageSize),
    [sortedCorrectionRules, correctionPageSize, correctionPage],
  );
  const correctionSelectedSet = useMemo(() => new Set(correctionSelectedIds), [correctionSelectedIds]);
  const areAllCorrectionRowsSelected = useMemo(
    () => pagedCorrectionRules.length > 0 && pagedCorrectionRules.every((rule) => correctionSelectedSet.has(rule.id)),
    [pagedCorrectionRules, correctionSelectedSet],
  );
  const areSomeCorrectionRowsSelected = useMemo(
    () => pagedCorrectionRules.some((rule) => correctionSelectedSet.has(rule.id)) && !areAllCorrectionRowsSelected,
    [areAllCorrectionRowsSelected, pagedCorrectionRules, correctionSelectedSet],
  );
  const activeCorrectionCounts = correctionFieldCounts[correctionListField] ?? { total: 0, active: 0 };
  const pagedScoringRules = useMemo(
    () => paginateRules(sortedScoringRules, scoringPage, scoringPageSize),
    [sortedScoringRules, scoringPageSize, scoringPage],
  );
  const validationTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredValidationRules.length / validationPageSize)),
    [filteredValidationRules.length, validationPageSize],
  );
  const correctionTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredCorrectionRules.length / correctionPageSize)),
    [filteredCorrectionRules.length, correctionPageSize],
  );
  const scoringTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredScoringRules.length / scoringPageSize)),
    [filteredScoringRules.length, scoringPageSize],
  );
  const auditTotalPages = useMemo(
    () => Math.max(1, Math.ceil(auditTotalCount / auditPageSize)),
    [auditPageSize, auditTotalCount],
  );

  function clampPageValue(nextValue: string, maxPage: number): number | null {
    const numericValue = Number(nextValue);
    if (Number.isNaN(numericValue)) {
      return null;
    }
    if (numericValue < 1) {
      return 1;
    }
    if (numericValue > maxPage) {
      return maxPage;
    }
    return numericValue;
  }
  const auditActionOptions = useMemo(() => {
    const options = new Set(auditLogs.map((entry) => entry.action));
    return Array.from(options);
  }, [auditLogs]);
  const auditEntityOptions = useMemo(() => {
    const options = new Set(auditLogs.map((entry) => entry.entity));
    return Array.from(options);
  }, [auditLogs]);
  const auditActorOptions = useMemo(() => {
    const options = new Set(auditLogs.map((entry) => entry.actor_id));
    return Array.from(options);
  }, [auditLogs]);

  const filteredMemberships = useMemo(() => {
    const normalizedSearch = memberSearch.trim().toLowerCase();
    return memberships.filter((membership) => {
      const userId = membership.game_accounts?.user_id ?? "";
      const userRole = userId ? userRolesById[userId] ?? "member" : "member";
      if (memberRankFilter !== "all" && (membership.rank ?? "") !== memberRankFilter) {
        return false;
      }
      if (memberStatusFilter !== "all") {
        const expectedActive = memberStatusFilter === "active";
        if (membership.is_active !== expectedActive) {
          return false;
        }
      }
      if (!normalizedSearch) {
        return true;
      }
      const profile = userId ? profilesById[userId] : undefined;
      const searchText = [
        membership.game_accounts?.game_username,
        profile?.display_name,
        profile?.username,
        profile?.username,
        profile?.email,
        userId,
      ]
        .filter((value): value is string => Boolean(value))
        .join(" ")
        .toLowerCase();
      return searchText.includes(normalizedSearch);
    });
  }, [memberRankFilter, memberSearch, memberStatusFilter, memberships, profilesById, userRolesById]);
  const sortedMemberships = useMemo(() => {
    const sorted = [...filteredMemberships];
    sorted.sort((left, right) => {
      const leftValue = getMemberSortValue(left);
      const rightValue = getMemberSortValue(right);
      return compareRuleValues(leftValue, rightValue, memberSortDirection);
    });
    return sorted;
  }, [filteredMemberships, getMemberSortValue, memberSortDirection]);

  const filteredUserRows = useMemo(() => {
    return userRows.filter((user) => {
      const role = userRolesById[user.id] ?? "member";
      if (userRoleFilter !== "all" && role !== userRoleFilter) {
        return false;
      }
      if (userAdminFilter !== "all") {
        const expectedAdmin = userAdminFilter === "admin";
        if (Boolean(user.is_admin) !== expectedAdmin) {
          return false;
        }
      }
      return true;
    });
  }, [userAdminFilter, userRoleFilter, userRows, userRolesById]);
  const sortedUserRows = useMemo(() => {
    const sorted = [...filteredUserRows];
    sorted.sort((left, right) => {
      const leftValue = getUserSortValue(left);
      const rightValue = getUserSortValue(right);
      return compareRuleValues(leftValue, rightValue, userSortDirection);
    });
    return sorted;
  }, [filteredUserRows, getUserSortValue, userSortDirection]);

  function resolveSection(value: string | null): "clans" | "validation" | "corrections" | "logs" | "users" {
    if (value === "validation" || value === "corrections" || value === "logs" || value === "users") {
      return value;
    }
    if (value === "rules") {
      return "validation";
    }
    return "clans";
  }

  function updateActiveSection(nextSection: "clans" | "validation" | "corrections" | "logs" | "users"): void {
    setActiveSection(nextSection);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", nextSection);
    router.replace(`/admin?${params.toString()}`);
  }

  function handleNavigateAdmin(path: string): void {
    router.push(path);
  }

  async function getCurrentUserId(): Promise<string | null> {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  }

  async function loadCurrentUserId(): Promise<void> {
    const userId = await getCurrentUserId();
    setCurrentUserId(userId ?? "");
  }

  async function insertAuditLogs(entries: readonly Record<string, unknown>[]): Promise<void> {
    if (entries.length === 0) {
      return;
    }
    const { error } = await supabase.from("audit_logs").insert(entries);
    if (error) {
      setStatus(`Audit log failed: ${error.message}`);
    }
  }

  async function loadClans(): Promise<void> {
    const { data, error } = await supabase
      .from("clans")
      .select("id,name,description,is_unassigned")
      .order("name");
    if (error) {
      setStatus(`Failed to load clans: ${error.message}`);
      return;
    }
    const clanRows = data ?? [];
    setClans(clanRows);
    const unassignedClan = clanRows.find((clan) => clan.is_unassigned);
    setUnassignedClanId(unassignedClan?.id ?? "");
    if (!selectedClanId && data && data.length > 0) {
      const storedClanId = window.localStorage.getItem("tc.currentClanId") ?? "";
      const matchedClan = storedClanId ? clanRows.find((clan) => clan.id === storedClanId) : undefined;
      setSelectedClanId(matchedClan?.id ?? clanRows[0].id);
    }
  }

  async function ensureUnassignedMemberships(): Promise<void> {
    if (!unassignedClanId) {
      return;
    }
    const { error } = await supabase.rpc("ensure_unassigned_memberships");
    if (error) {
      setStatus(`Failed to sync unassigned accounts: ${error.message}`);
    }
  }


  async function loadDefaultClan(): Promise<void> {
    const { data: defaultClan } = await supabase
      .from("clans")
      .select("id")
      .eq("is_default", true)
      .maybeSingle();
    setDefaultClanId(defaultClan?.id ?? "");
  }

  async function loadMemberships(clanId: string): Promise<void> {
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
    const membershipRows = data ?? [];
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
  }

  async function loadRules(): Promise<void> {
    const { data: validationData } = await supabase
      .from("validation_rules")
      .select("id,field,match_value,status")
      .order("field");
    setValidationRules(validationData ?? []);
    setValidationSelectedIds([]);
    const { data: correctionData } = await supabase
      .from("correction_rules")
      .select("id,field,match_value,replacement_value,status")
      .order("field");
    setCorrectionRules(correctionData ?? []);
    setCorrectionSelectedIds([]);
  }

  async function loadAuditLogs(clanId: string, nextPage: number, pageSize: number): Promise<void> {
    if (!clanId) {
      setAuditLogs([]);
      setAuditActorsById({});
      setAuditPage(1);
      setAuditTotalCount(0);
      return;
    }
    const fromIndex = (nextPage - 1) * pageSize;
    const toIndex = fromIndex + pageSize - 1;
    let query = supabase
      .from("audit_logs")
      .select("id,clan_id,actor_id,action,entity,entity_id,diff,created_at", { count: "exact" });
    const clanFilterValue =
      auditClanFilter && auditClanFilter !== "all" ? auditClanFilter : clanId;
    if (clanFilterValue) {
      query = query.eq("clan_id", clanFilterValue);
    }
    if (auditActionFilter !== "all") {
      query = query.eq("action", auditActionFilter);
    }
    if (auditEntityFilter !== "all") {
      query = query.eq("entity", auditEntityFilter);
    }
    if (auditActorFilter !== "all") {
      query = query.eq("actor_id", auditActorFilter);
    }
    if (auditSearch.trim()) {
      const pattern = `%${auditSearch.trim()}%`;
      query = query.or(`action.ilike.${pattern},entity.ilike.${pattern},entity_id.ilike.${pattern}`);
    }
    const { data, error, count } = await query.order("created_at", { ascending: false }).range(fromIndex, toIndex);
    if (error) {
      setStatus(`Failed to load audit logs: ${error.message}`);
      return;
    }
    const rows = data ?? [];
    setAuditTotalCount(count ?? 0);
    setAuditLogs(rows);
    const actorIds = Array.from(new Set(rows.map((row) => row.actor_id)));
    if (actorIds.length === 0) {
      setAuditActorsById({});
      return;
    }
    const { data: actorData, error: actorError } = await supabase
      .from("profiles")
      .select("id,email,display_name")
      .in("id", actorIds);
    if (actorError) {
      setStatus(`Failed to load audit actors: ${actorError.message}`);
      return;
    }
    const actorMap = (actorData ?? []).reduce<Record<string, ProfileRow>>((acc, profile) => {
      acc[profile.id] = profile;
      return acc;
    }, {});
    setAuditActorsById(actorMap);
  }

  async function loadAssignableGameAccounts(): Promise<void> {
    if (unassignedClanId) {
      await ensureUnassignedMemberships();
    }
    const { data: accountData, error: accountError } = await supabase
      .from("game_accounts")
      .select("id,user_id,game_username")
      .order("game_username");
    if (accountError) {
      setAssignStatus(`Failed to load game accounts: ${accountError.message}`);
      return;
    }
    const accounts = accountData ?? [];
    const accountIds = accounts.map((account) => account.id);
    const userIds = accounts.map((account) => account.user_id);
    if (accountIds.length === 0 || userIds.length === 0) {
      setAssignAccounts([]);
      return;
    }
    const { data: membershipData, error: membershipError } = await supabase
      .from("game_account_clan_memberships")
      .select("game_account_id,clan_id")
      .in("game_account_id", accountIds);
    if (membershipError) {
      setAssignStatus(`Failed to load memberships: ${membershipError.message}`);
      return;
    }
    const membershipMap = (membershipData ?? []).reduce<Record<string, string | null>>((acc, membership) => {
      acc[membership.game_account_id] = membership.clan_id;
      return acc;
    }, {});
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id,email,display_name,username")
      .in("id", userIds);
    if (profileError) {
      setAssignStatus(`Failed to load profiles: ${profileError.message}`);
      return;
    }
    const profileMap = (profileData ?? []).reduce<Record<string, ProfileRow>>((acc, profile) => {
      acc[profile.id] = profile;
      return acc;
    }, {});
    const assignable = accounts.map<AssignableGameAccount>((account) => {
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
    setAssignAccounts(assignable);
  }

  async function loadUsers(): Promise<void> {
    const query = supabase
      .from("profiles")
      .select("id,email,display_name,username,user_db,is_admin")
      .order("email")
      .limit(25);
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
    const userIds = rows.map((row) => row.id);
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
      .select("id,user_id,game_username")
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
    const accountIds = (gameAccountData ?? []).map((account) => account.id);
    if (accountIds.length === 0) {
      setUserMembershipsByAccountId({});
      return;
    }
    if (unassignedClanId) {
      await ensureUnassignedMemberships();
    }
    const { data: membershipData, error: membershipError } = await supabase
      .from("game_account_clan_memberships")
      .select("id,clan_id,game_account_id,is_active,rank,game_accounts(id,user_id,game_username)")
      .in("game_account_id", accountIds);
    if (membershipError) {
      setUserStatus(`Failed to load memberships: ${membershipError.message}`);
      return;
    }
    const membershipMap = (membershipData ?? []).reduce<Record<string, MembershipRow>>((acc, membership) => {
      acc[membership.game_account_id] = membership;
      return acc;
    }, {});
    setUserMembershipsByAccountId(membershipMap);
  }

  async function handleCreateUser(): Promise<void> {
    if (!createUserEmail.trim()) {
      setCreateUserStatus("Email is required.");
      return;
    }
    if (!createUserUsername.trim()) {
      setCreateUserStatus("Username is required.");
      return;
    }
    if (createUserUsername.trim().length < 2 || createUserUsername.trim().length > 32) {
      setCreateUserStatus("Username must be 2-32 characters.");
      return;
    }
    setCreateUserStatus("Creating user...");
    const response = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: createUserEmail.trim(),
        username: createUserUsername.trim(),
        displayName: createUserDisplayName.trim() || undefined,
      }),
    });
    const payload = (await response.json()) as { id?: string; error?: string };
    if (!response.ok) {
      setCreateUserStatus(payload.error ?? "Failed to create user.");
      return;
    }
    setCreateUserEmail("");
    setCreateUserUsername("");
    setCreateUserDisplayName("");
    setCreateUserStatus("User created.");
    setIsCreateUserModalOpen(false);
    await loadUsers();
  }

  function openCreateUserModal(): void {
    setCreateUserStatus("");
    setIsCreateUserModalOpen(true);
  }

  function closeCreateUserModal(): void {
    setIsCreateUserModalOpen(false);
  }

  function openUserDeleteConfirm(user: UserRow): void {
    if (user.id === currentUserId) {
      setUserStatus("You cannot delete your own account.");
      return;
    }
    if (user.is_admin && userRows.filter((row) => Boolean(row.is_admin)).length <= 1) {
      setUserStatus("At least one admin is required.");
      return;
    }
    setUserToDelete(user);
    setIsUserDeleteConfirmOpen(true);
  }

  function closeUserDeleteConfirm(): void {
    setIsUserDeleteConfirmOpen(false);
  }

  function openUserDeleteInput(): void {
    setIsUserDeleteConfirmOpen(false);
    setUserDeleteInput("");
    setIsUserDeleteInputOpen(true);
  }

  function closeUserDeleteInput(): void {
    setIsUserDeleteInputOpen(false);
    setUserDeleteInput("");
    setUserToDelete(null);
  }

  async function handleDeleteUser(): Promise<void> {
    if (!userToDelete) {
      setUserStatus("Select a user to delete.");
      return;
    }
    const expectedPhrase = `DELETE ${userToDelete.username ?? userToDelete.email}`;
    if (userDeleteInput.trim() !== expectedPhrase) {
      setUserStatus("Deletion phrase does not match.");
      return;
    }
    setUserStatus("Deleting user...");
    const response = await fetch("/api/admin/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: userToDelete.id }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setUserStatus(payload.error ?? "Failed to delete user.");
      return;
    }
    closeUserDeleteInput();
    setUserStatus("User deleted.");
    await loadUsers();
  }

  function openCreateGameAccountModal(user: UserRow): void {
    setCreateGameAccountUser(user);
    setCreateGameAccountUsername("");
    setCreateGameAccountClanId(unassignedClanId);
    setCreateGameAccountRank("soldier");
    setCreateGameAccountStatus("active");
    setCreateGameAccountMessage("");
    setIsCreateGameAccountModalOpen(true);
  }

  function closeCreateGameAccountModal(): void {
    setIsCreateGameAccountModalOpen(false);
    setCreateGameAccountUser(null);
    setCreateGameAccountUsername("");
    setCreateGameAccountClanId(unassignedClanId);
    setCreateGameAccountRank("soldier");
    setCreateGameAccountStatus("active");
    setCreateGameAccountMessage("");
  }

  async function handleCreateGameAccount(): Promise<void> {
    if (!createGameAccountUser) {
      setCreateGameAccountMessage("Select a user first.");
      return;
    }
    const nextUsername = createGameAccountUsername.trim();
    if (!nextUsername) {
      setCreateGameAccountMessage("Game username is required.");
      return;
    }
    if (!createGameAccountClanId) {
      setCreateGameAccountMessage("Select a clan for this account.");
      return;
    }
    if (!createGameAccountRank.trim()) {
      setCreateGameAccountMessage("Select a rank for this account.");
      return;
    }
    setCreateGameAccountMessage("Creating game account...");
    const { data: accountData, error } = await supabase
      .from("game_accounts")
      .insert({
        user_id: createGameAccountUser.id,
        game_username: nextUsername,
      })
      .select("id")
      .single();
    if (error || !accountData) {
      setCreateGameAccountMessage(error?.message ?? "Failed to create game account.");
      return;
    }
    const { error: membershipError } = await supabase.from("game_account_clan_memberships").upsert(
      {
        game_account_id: accountData.id,
        clan_id: createGameAccountClanId,
        is_active: createGameAccountStatus === "active",
        rank: createGameAccountRank.trim() || null,
      },
      { onConflict: "game_account_id" },
    );
    if (membershipError) {
      setCreateGameAccountMessage(`Account created, but assignment failed: ${membershipError.message}`);
      return;
    }
    setCreateGameAccountMessage("Game account added.");
    closeCreateGameAccountModal();
    await loadUsers();
  }

  function openGameAccountDeleteConfirm(account: GameAccountRow): void {
    setGameAccountToDelete(account);
    setIsGameAccountDeleteConfirmOpen(true);
  }

  function closeGameAccountDeleteConfirm(): void {
    setIsGameAccountDeleteConfirmOpen(false);
  }

  function openGameAccountDeleteInput(): void {
    setIsGameAccountDeleteConfirmOpen(false);
    setGameAccountDeleteInput("");
    setIsGameAccountDeleteInputOpen(true);
  }

  function closeGameAccountDeleteInput(): void {
    setIsGameAccountDeleteInputOpen(false);
    setGameAccountDeleteInput("");
    setGameAccountToDelete(null);
  }

  async function handleConfirmDeleteGameAccount(): Promise<void> {
    if (!gameAccountToDelete) {
      setUserStatus("Select a game account to delete.");
      return;
    }
    const expectedPhrase = `DELETE ${gameAccountToDelete.game_username}`;
    if (gameAccountDeleteInput.trim() !== expectedPhrase) {
      setUserStatus("Deletion phrase does not match.");
      return;
    }
    setUserStatus("Deleting game account...");
    const { error } = await supabase.from("game_accounts").delete().eq("id", gameAccountToDelete.id);
    if (error) {
      setUserStatus(`Failed to delete game account: ${error.message}`);
      return;
    }
    closeGameAccountDeleteInput();
    setUserStatus("Game account deleted.");
    await loadUsers();
  }

  async function handleSaveAllUserEdits(): Promise<void> {
    const editEntries = Object.keys(userEdits);
    const accountEntries = Object.keys(gameAccountEdits);
    const membershipEntries = Object.keys(membershipEdits);
    if (editEntries.length === 0 && accountEntries.length === 0 && membershipEntries.length === 0) {
      setUserStatus("No changes to save.");
      return;
    }
    const totalEdits = editEntries.length + accountEntries.length + membershipEntries.length;
    const confirmSave = window.confirm(`Save ${totalEdits} change(s)?`);
    if (!confirmSave) {
      return;
    }
    setUserStatus("Saving changes...");
    let hasError = false;
    for (const userId of editEntries) {
      const user = userRows.find((entry) => entry.id === userId);
      if (!user) {
        continue;
      }
      const success = await handleSaveUserEdit(user, false);
      if (!success) {
        hasError = true;
      }
    }
    const accountList = Object.values(gameAccountsByUserId).flat();
    for (const accountId of accountEntries) {
      const account = accountList.find((entry) => entry.id === accountId);
      if (!account) {
        continue;
      }
      const success = await handleSaveGameAccountEdit(account, false);
      if (!success) {
        hasError = true;
      }
    }
    for (const membershipId of membershipEntries) {
      const membership = memberships.find((entry) => entry.id === membershipId);
      if (!membership) {
        continue;
      }
      const validationError = validateMembershipEdit(membership);
      if (validationError) {
        setMembershipErrors((current) => ({ ...current, [membership.id]: validationError }));
        hasError = true;
        continue;
      }
      await handleSaveMembershipEdit(membership, false);
      if (membershipErrors[membershipId]) {
        hasError = true;
      }
    }
    if (hasError) {
      setUserStatus("Some updates need fixes before saving.");
      return;
    }
    setUserStatus("All changes saved.");
    await loadUsers();
  }

  function cancelAllUserEdits(): void {
    setUserEdits({});
    setUserErrors({});
    setGameAccountEdits({});
    setMembershipEdits({});
    setMembershipErrors({});
    setActiveGameAccountId("");
    setActiveEditingUserId("");
    setUserStatus("All changes cleared.");
  }

  async function handleResendInvite(email: string): Promise<void> {
    if (!email) {
      setCreateUserStatus("User email is required to resend invite.");
      return;
    }
    const confirmResend = window.confirm(`Resend invite to ${email}?`);
    if (!confirmResend) {
      return;
    }
    setCreateUserStatus("Resending invite...");
    const response = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const payload = (await response.json()) as { id?: string; error?: string };
    if (!response.ok) {
      setCreateUserStatus(payload.error ?? "Failed to resend invite.");
      return;
    }
    setCreateUserStatus("Invite resent.");
  }

  async function handleToggleAdmin(user: UserRow): Promise<void> {
    const nextValue = !Boolean(user.is_admin);
    if (!nextValue && currentUserId && user.id === currentUserId) {
      setUserStatus("You cannot revoke your own admin access.");
      return;
    }
    if (!nextValue) {
      const adminCount = userRows.filter((row) => Boolean(row.is_admin)).length;
      if (adminCount <= 1) {
        setUserStatus("At least one admin is required.");
        return;
      }
    }
    const confirmToggle = window.confirm(
      `${nextValue ? "Grant" : "Revoke"} admin access for ${user.email}?`,
    );
    if (!confirmToggle) {
      return;
    }
    setUserStatus("Updating admin access...");
    const { error } = await supabase.from("profiles").update({ is_admin: nextValue }).eq("id", user.id);
    if (error) {
      setUserStatus(`Failed to update admin access: ${error.message}`);
      return;
    }
    setUserStatus("Admin access updated.");
    await loadUsers();
  }

  function updateUserEdit(userId: string, field: keyof UserEditState, value: string): void {
    setUserEdits((current) => ({
      ...current,
      [userId]: {
        ...current[userId],
        [field]: value,
      },
    }));
    setUserErrors((current) => {
      if (!current[userId]) {
        return current;
      }
      const updated = { ...current };
      delete updated[userId];
      return updated;
    });
  }

  function cancelUserEdit(userId: string): void {
    setUserEdits((current) => {
      if (!current[userId]) {
        return current;
      }
      const updated = { ...current };
      delete updated[userId];
      return updated;
    });
    setUserErrors((current) => {
      if (!current[userId]) {
        return current;
      }
      const updated = { ...current };
      delete updated[userId];
      return updated;
    });
    setActiveEditingUserId((current) => (current === userId ? "" : current));
  }

  function beginUserEdit(user: UserRow): void {
    setActiveEditingUserId(user.id);
    setUserEdits((current) => ({
      ...current,
      [user.id]: {
        display_name: current[user.id]?.display_name ?? user.display_name ?? "",
        username: current[user.id]?.username ?? user.username ?? "",
        role: current[user.id]?.role ?? userRolesById[user.id] ?? "member",
      },
    }));
    setUserErrors((current) => {
      if (!current[user.id]) {
        return current;
      }
      const updated = { ...current };
      delete updated[user.id];
      return updated;
    });
  }

  function getUserRole(userId: string): string {
    return userRolesById[userId] ?? "member";
  }

  function getUserEditValue(user: UserRow): UserEditState {
    return {
      display_name: userEdits[user.id]?.display_name ?? user.display_name ?? "",
      username: userEdits[user.id]?.username ?? user.username ?? "",
      role: userEdits[user.id]?.role ?? getUserRole(user.id),
    };
  }

  function isUserFieldChanged(user: UserRow, field: keyof UserEditState): boolean {
    const edits = userEdits[user.id];
    if (!edits || edits[field] === undefined) {
      return false;
    }
    const nextValue = edits[field] ?? "";
    if (field === "display_name") {
      return String(nextValue) !== String(user.display_name ?? "");
    }
    if (field === "username") {
      return String(nextValue) !== String(user.username ?? "");
    }
    if (field === "role") {
      return String(nextValue) !== getUserRole(user.id);
    }
    return false;
  }

  async function handleSaveUserEdit(user: UserRow, shouldReload: boolean = true): Promise<boolean> {
    const edits = getUserEditValue(user);
    const baseUsername = user.username ?? user.user_db ?? "";
    const nextUsernameDisplay = edits.username?.trim() || baseUsername;
    if (!nextUsernameDisplay) {
      if (user.email) {
        const fallback = buildFallbackUserDb(user.email, user.id);
        updateUserEdit(user.id, "username", fallback);
      }
      setUserErrors((current) => ({
        ...current,
        [user.id]: "Username is required before updating nickname.",
      }));
      return false;
    }
    const nextUsername = nextUsernameDisplay.toLowerCase();
    if (!nextUsername || nextUsername.length < 2 || nextUsername.length > 32) {
      setUserErrors((current) => ({
        ...current,
        [user.id]: "Username must be 2-32 characters.",
      }));
      return false;
    }
    const nextRole = edits.role?.trim() || getUserRole(user.id);
    if (!roleOptions.includes(nextRole)) {
      setUserErrors((current) => ({
        ...current,
        [user.id]: "Role is invalid.",
      }));
      return false;
    }
    if (nextRole !== getUserRole(user.id)) {
      const { error: roleError } = await supabase
        .from("user_roles")
        .upsert({ user_id: user.id, role: nextRole }, { onConflict: "user_id" });
      if (roleError) {
        setUserErrors((current) => ({
          ...current,
          [user.id]: roleError.message,
        }));
        return false;
      }
      setUserRolesById((current) => ({ ...current, [user.id]: nextRole }));
    }
    const nextDisplayName = edits.display_name?.trim() || null;
    if (nextDisplayName) {
      const { data: existingDisplayName, error: displayNameError } = await supabase
        .from("profiles")
        .select("id")
        .ilike("display_name", nextDisplayName)
        .neq("id", user.id)
        .maybeSingle();
      if (displayNameError) {
        setUserErrors((current) => ({
          ...current,
          [user.id]: displayNameError.message,
        }));
        return false;
      }
      if (existingDisplayName) {
        setUserErrors((current) => ({
          ...current,
          [user.id]: "Nickname already exists.",
        }));
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
      setUserErrors((current) => ({
        ...current,
        [user.id]: error.message,
      }));
      return false;
    }
    cancelUserEdit(user.id);
    setActiveEditingUserId("");
    if (shouldReload) {
      await loadUsers();
    }
    return true;
  }

  function beginGameAccountEdit(account: GameAccountRow): void {
    setActiveEditingUserId(account.user_id);
    setActiveGameAccountId(account.id);
    setGameAccountEdits((current) => {
      const existing = current[account.id];
      return {
        ...current,
        [account.id]: {
          game_username: existing?.game_username ?? account.game_username,
        },
      };
    });
  }

  function updateGameAccountEdit(
    accountId: string,
    field: keyof GameAccountEditState,
    value: string,
  ): void {
    setGameAccountEdits((current) => ({
      ...current,
      [accountId]: {
        ...current[accountId],
        [field]: value,
      },
    }));
    setUserStatus("");
  }

  function cancelGameAccountEdit(accountId: string): void {
    setGameAccountEdits((current) => {
      const next = { ...current };
      delete next[accountId];
      return next;
    });
    setActiveGameAccountId((current) => (current === accountId ? "" : current));
  }

  async function handleSaveGameAccountEdit(
    account: GameAccountRow,
    shouldReload: boolean = true,
  ): Promise<boolean> {
    const editState = gameAccountEdits[account.id];
    if (!editState) {
      return true;
    }
    const nextUsername = (editState.game_username ?? account.game_username).trim();
    if (!nextUsername) {
      setUserStatus("Game username is required.");
      return false;
    }
    setUserStatus("Updating game account...");
    const { error } = await supabase
      .from("game_accounts")
      .update({
        game_username: nextUsername,
      })
      .eq("id", account.id);
    if (error) {
      setUserStatus(`Failed to update game account: ${error.message}`);
      return false;
    }
    updateGameAccountState(account.id, nextUsername);
    cancelGameAccountEdit(account.id);
    setActiveGameAccountId("");
    setUserStatus("Game account updated.");
    if (shouldReload) {
      await loadUsers();
    }
    return true;
  }

  async function handleDeleteGameAccount(account: GameAccountRow): Promise<void> {
    const confirmDelete = window.confirm(
      `Delete game account ${account.game_username}? This cannot be undone.`,
    );
    if (!confirmDelete) {
      return;
    }
    setUserStatus("Deleting game account...");
    const { error } = await supabase.from("game_accounts").delete().eq("id", account.id);
    if (error) {
      setUserStatus(`Failed to delete game account: ${error.message}`);
      return;
    }
    setUserStatus("Game account deleted.");
    await loadUsers();
  }

  useEffect(() => {
    async function initializeAdmin(): Promise<void> {
      const { data, error } = await supabase
        .from("clans")
        .select("id,name,description,is_unassigned")
        .order("name");
      if (error) {
        setStatus(`Failed to load clans: ${error.message}`);
        return;
      }
      const clanRows = data ?? [];
      setClans(clanRows);
      const unassignedClan = clanRows.find((clan) => clan.is_unassigned);
      setUnassignedClanId(unassignedClan?.id ?? "");
      if (!selectedClanId && clanRows.length > 0) {
        const storedClanId = window.localStorage.getItem("tc.currentClanId") ?? "";
        const matchedClan = storedClanId ? clanRows.find((clan) => clan.id === storedClanId) : undefined;
        setSelectedClanId(matchedClan?.id ?? clanRows[0].id);
      }
      const { data: defaultClan } = await supabase
        .from("clans")
        .select("id")
        .eq("is_default", true)
        .maybeSingle();
      setDefaultClanId(defaultClan?.id ?? "");
      const { data: authData } = await supabase.auth.getUser();
      setCurrentUserId(authData.user?.id ?? "");
    }
    void initializeAdmin();
  }, [selectedClanId, supabase]);

  useEffect(() => {
    const rawTab = searchParams.get("tab");
    const nextSection = resolveSection(rawTab);
    setActiveSection(nextSection);
    if (rawTab === "rules") {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "validation");
      router.replace(`/admin?${params.toString()}`);
    }
  }, [router, searchParams]);

  useEffect(() => {
    if (status) {
      pushToast(status);
    }
  }, [pushToast, status]);

  useEffect(() => {
    async function loadClanData(): Promise<void> {
      await loadRules();
      if (!selectedClanId) {
        setMemberships([]);
        setProfilesById({});
        return;
      }
      if (selectedClanId === unassignedClanId) {
        const { error: unassignedError } = await supabase.rpc("ensure_unassigned_memberships");
        if (unassignedError) {
          setStatus(`Failed to sync unassigned accounts: ${unassignedError.message}`);
        }
      }
      const { data: membershipData, error: membershipError } = await supabase
        .from("game_account_clan_memberships")
        .select("id,clan_id,game_account_id,is_active,rank,game_accounts(id,user_id,game_username)")
        .eq("clan_id", selectedClanId)
        .order("game_account_id");
      if (membershipError) {
        setStatus(`Failed to load memberships: ${membershipError.message}`);
        return;
      }
      const membershipRows = membershipData ?? [];
      setMemberships(membershipRows);
      const userIds = membershipRows
        .map((row) => row.game_accounts?.user_id)
        .filter((value): value is string => Boolean(value));
      if (userIds.length === 0) {
        setProfilesById({});
      } else {
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
      }
    }
    void loadClanData();
  }, [selectedClanId, supabase, unassignedClanId]);

  useEffect(() => {
    async function loadUserSection(): Promise<void> {
      if (activeSection !== "users") {
        return;
      }
      const query = supabase
        .from("profiles")
        .select("id,email,display_name,username,user_db,is_admin")
        .order("email")
        .limit(25);
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
      const userIds = rows.map((row) => row.id);
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
        .select("id,user_id,game_username")
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
      const accountIds = (gameAccountData ?? []).map((account) => account.id);
      if (accountIds.length === 0) {
        setUserMembershipsByAccountId({});
        return;
      }
      if (unassignedClanId) {
        const { error: unassignedError } = await supabase.rpc("ensure_unassigned_memberships");
        if (unassignedError) {
          setUserStatus(`Failed to sync unassigned accounts: ${unassignedError.message}`);
        }
      }
      const { data: membershipData, error: membershipError } = await supabase
        .from("game_account_clan_memberships")
        .select("id,clan_id,game_account_id,is_active,rank,game_accounts(id,user_id,game_username)")
        .in("game_account_id", accountIds);
      if (membershipError) {
        setUserStatus(`Failed to load memberships: ${membershipError.message}`);
        return;
      }
      const membershipMap = (membershipData ?? []).reduce<Record<string, MembershipRow>>((acc, membership) => {
        acc[membership.game_account_id] = membership;
        return acc;
      }, {});
      setUserMembershipsByAccountId(membershipMap);
    }
    void loadUserSection();
  }, [activeSection, supabase, unassignedClanId, userSearch]);

  useEffect(() => {
    setAuditPage(1);
  }, [selectedClanId]);

  useEffect(() => {
    if (!auditClanFilter) {
      setAuditClanFilter("all");
    }
  }, [auditClanFilter, selectedClanId]);

  useEffect(() => {
    async function loadAuditSection(): Promise<void> {
      if (!selectedClanId) {
        setAuditLogs([]);
        setAuditActorsById({});
        setAuditPage(1);
        setAuditTotalCount(0);
        return;
      }
      const fromIndex = (auditPage - 1) * auditPageSize;
      const toIndex = fromIndex + auditPageSize - 1;
      let query = supabase
        .from("audit_logs")
        .select("id,clan_id,actor_id,action,entity,entity_id,diff,created_at", { count: "exact" });
      const clanFilterValue =
        auditClanFilter && auditClanFilter !== "all" ? auditClanFilter : selectedClanId;
      if (clanFilterValue) {
        query = query.eq("clan_id", clanFilterValue);
      }
      if (auditActionFilter !== "all") {
        query = query.eq("action", auditActionFilter);
      }
      if (auditEntityFilter !== "all") {
        query = query.eq("entity", auditEntityFilter);
      }
      if (auditActorFilter !== "all") {
        query = query.eq("actor_id", auditActorFilter);
      }
      if (auditSearch.trim()) {
        const pattern = `%${auditSearch.trim()}%`;
        query = query.or(`action.ilike.${pattern},entity.ilike.${pattern},entity_id.ilike.${pattern}`);
      }
      const { data, error, count } = await query.order("created_at", { ascending: false }).range(fromIndex, toIndex);
      if (error) {
        setStatus(`Failed to load audit logs: ${error.message}`);
        return;
      }
      const rows = data ?? [];
      setAuditTotalCount(count ?? 0);
      setAuditLogs(rows);
      const actorIds = Array.from(new Set(rows.map((row) => row.actor_id)));
      if (actorIds.length === 0) {
        setAuditActorsById({});
        return;
      }
      const { data: actorData, error: actorError } = await supabase
        .from("profiles")
        .select("id,email,display_name")
        .in("id", actorIds);
      if (actorError) {
        setStatus(`Failed to load audit actors: ${actorError.message}`);
        return;
      }
      const actorMap = (actorData ?? []).reduce<Record<string, ProfileRow>>((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {});
      setAuditActorsById(actorMap);
    }
    void loadAuditSection();
  }, [
    auditActionFilter,
    auditActorFilter,
    auditClanFilter,
    auditEntityFilter,
    auditPage,
    auditPageSize,
    auditSearch,
    selectedClanId,
    supabase,
  ]);

  useEffect(() => {
    setAuditPage(1);
  }, [auditActionFilter, auditActorFilter, auditClanFilter, auditEntityFilter, auditSearch]);

  useEffect(() => {
    if (clans.length === 0) {
      return;
    }
    if (defaultClanId && clans.some((clan) => clan.id === defaultClanId)) {
      setSelectedClanId(defaultClanId);
    }
  }, [clans, defaultClanId]);

  useEffect(() => {
    if (!validationSelectAllRef.current) {
      return;
    }
    validationSelectAllRef.current.indeterminate = areSomeValidationRowsSelected;
  }, [areSomeValidationRowsSelected]);

  useEffect(() => {
    if (!correctionSelectAllRef.current) {
      return;
    }
    correctionSelectAllRef.current.indeterminate = areSomeCorrectionRowsSelected;
  }, [areSomeCorrectionRowsSelected]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredValidationRules.length / validationPageSize));
    if (validationPage > totalPages) {
      setValidationPage(1);
    }
  }, [filteredValidationRules.length, validationPageSize, validationPage]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredCorrectionRules.length / correctionPageSize));
    if (correctionPage > totalPages) {
      setCorrectionPage(1);
    }
  }, [filteredCorrectionRules.length, correctionPageSize, correctionPage]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredScoringRules.length / scoringPageSize));
    if (scoringPage > totalPages) {
      setScoringPage(1);
    }
  }, [filteredScoringRules.length, scoringPageSize, scoringPage]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(auditTotalCount / auditPageSize));
    if (auditPage > totalPages) {
      setAuditPage(1);
    }
  }, [auditPage, auditPageSize, auditTotalCount]);

  async function handleSaveClan(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!clanModalName.trim()) {
      setStatus("Clan name is required.");
      return;
    }
    if (clanModalMode === "edit" && !selectedClanId) {
      setStatus("Select a clan to edit.");
      return;
    }
    setStatus(clanModalMode === "edit" ? "Updating clan..." : "Creating clan...");
    if (clanModalMode === "edit") {
      const { data, error } = await supabase
        .from("clans")
        .update({ name: clanModalName.trim(), description: clanModalDescription.trim() || null })
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
        .insert({ name: clanModalName.trim(), description: clanModalDescription.trim() || null })
        .select("id")
        .single();
      if (error) {
        setStatus(`Failed to create clan: ${error.message}`);
        return;
      }
      if (data?.id) {
        setSelectedClanId(data.id);
      }
      setStatus("Clan created.");
    }
    setIsClanModalOpen(false);
    setClanModalName("");
    setClanModalDescription("");
    await loadClans();
  }

  function openCreateClanModal(): void {
    setClanModalMode("create");
    setClanModalName("");
    setClanModalDescription("");
    setIsClanModalOpen(true);
  }

  function openEditClanModal(): void {
    if (!selectedClan) {
      setStatus("Select a clan to edit.");
      return;
    }
    setClanModalMode("edit");
    setClanModalName(selectedClan.name);
    setClanModalDescription(selectedClan.description ?? "");
    setIsClanModalOpen(true);
  }

  function closeClanModal(): void {
    setIsClanModalOpen(false);
  }

  function openClanDeleteConfirm(): void {
    if (!selectedClan || !selectedClanId) {
      setStatus("Select a clan to delete.");
      return;
    }
    if (selectedClanId === unassignedClanId) {
      setStatus("Unassigned clan cannot be deleted.");
      return;
    }
    setIsClanDeleteConfirmOpen(true);
  }

  function closeClanDeleteConfirm(): void {
    setIsClanDeleteConfirmOpen(false);
  }

  function openClanDeleteInput(): void {
    setIsClanDeleteConfirmOpen(false);
    setClanDeleteInput("");
    setIsClanDeleteInputOpen(true);
  }

  function closeClanDeleteInput(): void {
    setIsClanDeleteInputOpen(false);
    setClanDeleteInput("");
  }

  async function handleDeleteClan(): Promise<void> {
    if (!selectedClan || !selectedClanId) {
      setStatus("Select a clan to delete.");
      return;
    }
    const expectedPhrase = `DELETE ${selectedClan.name}`;
    if (clanDeleteInput.trim() !== expectedPhrase) {
      setStatus("Deletion phrase does not match.");
      return;
    }
    const { error } = await supabase.from("clans").delete().eq("id", selectedClanId);
    if (error) {
      setStatus(`Failed to delete clan: ${error.message}`);
      return;
    }
    closeClanDeleteInput();
    setStatus("Clan deleted.");
    await loadClans();
  }

  function updateMembershipEdit(membershipId: string, field: keyof MembershipEditState, value: string): void {
    setMembershipEdits((current) => {
      const baseMembership =
        memberships.find((entry) => entry.id === membershipId) ??
        Object.values(userMembershipsByAccountId).find((entry) => entry.id === membershipId);
      const existing = current[membershipId] ?? {
        is_active: baseMembership?.is_active ?? true,
        rank: baseMembership?.rank ?? "",
        clan_id: baseMembership?.clan_id ?? selectedClanId,
      };
      const nextValue = field === "is_active" ? value === "true" : value;
      return {
        ...current,
        [membershipId]: { ...existing, [field]: nextValue },
      };
    });
    setMembershipErrors((current) => {
      if (!current[membershipId]) {
        return current;
      }
      const updated = { ...current };
      delete updated[membershipId];
      return updated;
    });
    const membership = memberships.find((entry) => entry.id === membershipId);
    if (membership?.game_accounts?.id) {
      cancelGameAccountEdit(membership.game_accounts.id);
      return;
    }
    const fallbackMembership = Object.values(userMembershipsByAccountId).find((entry) => entry.id === membershipId);
    if (fallbackMembership?.game_accounts?.id) {
      cancelGameAccountEdit(fallbackMembership.game_accounts.id);
    }
  }

  function cancelMembershipEdits(membershipId: string): void {
    setMembershipEdits((current) => {
      if (!current[membershipId]) {
        return current;
      }
      const updated = { ...current };
      delete updated[membershipId];
      return updated;
    });
    setMembershipErrors((current) => {
      if (!current[membershipId]) {
        return current;
      }
      const updated = { ...current };
      delete updated[membershipId];
      return updated;
    });
    const membership = memberships.find((entry) => entry.id === membershipId);
    if (membership?.game_accounts?.id) {
      cancelGameAccountEdit(membership.game_accounts.id);
      return;
    }
    const fallbackMembership = Object.values(userMembershipsByAccountId).find((entry) => entry.id === membershipId);
    if (fallbackMembership?.game_accounts?.id) {
      cancelGameAccountEdit(fallbackMembership.game_accounts.id);
    }
  }

  function cancelAllMembershipEdits(): void {
    setMembershipEdits({});
    setMembershipErrors({});
    setStatus("All membership changes cleared.");
  }

  function isMembershipFieldChanged(
    membership: MembershipRow,
    field: keyof MembershipEditState,
  ): boolean {
    const edits = membershipEdits[membership.id];
    if (!edits || edits[field] === undefined) {
      return false;
    }
    const nextValue = edits[field];
    if (field === "is_active") {
      return Boolean(nextValue) !== membership.is_active;
    }
    if (field === "rank") {
      return String(nextValue ?? "") !== String(membership.rank ?? "");
    }
    if (field === "clan_id") {
      return String(nextValue ?? "") !== membership.clan_id;
    }
    return false;
  }

  function getMembershipEditValue(membership: MembershipRow): MembershipEditState {
    return {
      is_active: membershipEdits[membership.id]?.is_active ?? membership.is_active,
      rank: membershipEdits[membership.id]?.rank ?? membership.rank ?? "",
      clan_id: membershipEdits[membership.id]?.clan_id ?? membership.clan_id,
    };
  }

  function validateMembershipEdit(membership: MembershipRow): string | null {
    const edits = getMembershipEditValue(membership);
    if (!edits.clan_id?.trim()) {
      return "Clan is required.";
    }
    return null;
  }

  async function handleSaveMembershipEdit(membership: MembershipRow, shouldReload: boolean = true): Promise<void> {
    const edits = membershipEdits[membership.id];
    const hasGameAccountEdit = Boolean(membership.game_accounts?.id && gameAccountEdits[membership.game_accounts.id]);
    if (!edits && !hasGameAccountEdit) {
      setStatus("No changes to save.");
      return;
    }
    if (edits) {
      const validationError = validateMembershipEdit(membership);
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
      const shouldReloadUsers = shouldReload && activeSection === "users";
      await handleSaveGameAccountEdit(
        {
          id: membership.game_accounts.id,
          user_id: membership.game_accounts.user_id ?? "",
          game_username: membership.game_accounts.game_username,
        },
        shouldReloadUsers,
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
            clan_id: {
              from: membership.clan_id,
              to: membershipPayload.clan_id,
            },
            is_active: {
              from: membership.is_active,
              to: membershipPayload.is_active,
            },
            rank: {
              from: membership.rank ?? null,
              to: membershipPayload.rank ?? null,
            },
          },
        },
      ]);
    }
    if (membershipPayload) {
      setUserMembershipsByAccountId((current) => {
        const existing = current[membership.game_account_id];
        if (!existing) {
          return current;
        }
        return {
          ...current,
          [membership.game_account_id]: {
            ...existing,
            clan_id: membershipPayload.clan_id,
            is_active: membershipPayload.is_active,
            rank: membershipPayload.rank ?? null,
          },
        };
      });
    }
    setMembershipEdits((current) => {
      const updated = { ...current };
      delete updated[membership.id];
      return updated;
    });
    setStatus("Membership updated.");
    if (shouldReload) {
      await loadMemberships(selectedClanId);
    }
  }

  async function handleSaveAllMembershipEdits(): Promise<void> {
    const editEntries = Object.keys(membershipEdits);
    if (editEntries.length === 0) {
      setStatus("No changes to save.");
      return;
    }
    const confirmSave = window.confirm(`Save ${editEntries.length} membership change(s)?`);
    if (!confirmSave) {
      return;
    }
    setStatus("Saving membership changes...");
    let hasValidationError = false;
    for (const membershipId of editEntries) {
      const membership = memberships.find((entry) => entry.id === membershipId);
      if (!membership) {
        continue;
      }
      const validationError = validateMembershipEdit(membership);
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
    if (!gameAccount) {
      return membership.game_account_id;
    }
    const editedUsername = gameAccountEdits[gameAccount.id]?.game_username;
    if (editedUsername && editedUsername.trim()) {
      return editedUsername;
    }
    if (gameAccount.game_username && gameAccount.game_username.trim()) {
      return gameAccount.game_username;
    }
    const userId = gameAccount.user_id;
    const profile = userId ? profilesById[userId] : undefined;
    return profile?.email ?? gameAccount.id;
  }

  function getAuditActorLabel(actorId: string): string {
    const profile = auditActorsById[actorId];
    if (!profile) {
      return actorId;
    }
    if (profile.display_name && profile.display_name.trim()) {
      return `${profile.display_name} (${profile.email})`;
    }
    return profile.email;
  }

  function getAuditDiffSummary(diff: Record<string, unknown> | null): string {
    if (!diff) {
      return "No details";
    }
    const keys = Object.keys(diff);
    if (keys.length === 0) {
      return "No details";
    }
    return keys.slice(0, 3).join(", ");
  }

  function formatAuditTimestamp(isoValue: string): string {
    return formatGermanDateTime(isoValue);
  }

  function toggleValidationSelect(ruleId: string): void {
    setValidationSelectedIds((current) =>
      current.includes(ruleId) ? current.filter((id) => id !== ruleId) : [...current, ruleId],
    );
  }

  function toggleValidationSelectAll(): void {
    if (pagedValidationRules.length === 0) {
      return;
    }
    if (areAllValidationRowsSelected) {
      setValidationSelectedIds([]);
      return;
    }
    setValidationSelectedIds(pagedValidationRules.map((rule) => rule.id));
  }

  function toggleValidationSort(nextKey: "field" | "status" | "match_value"): void {
    if (validationSortKey !== nextKey) {
      setValidationSortKey(nextKey);
      setValidationSortDirection("asc");
      return;
    }
    setValidationSortDirection((current) => (current === "asc" ? "desc" : "asc"));
  }

  function renderValidationSortButton(label: string, key: "field" | "status" | "match_value"): JSX.Element {
    const isActive = validationSortKey === key;
    return (
      <button className="table-sort-button" type="button" onClick={() => toggleValidationSort(key)}>
        <span>{label}</span>
        {isActive ? (
          <svg
            aria-hidden="true"
            className={`table-sort-indicator ${validationSortDirection === "desc" ? "is-desc" : ""}`.trim()}
            width="10"
            height="10"
            viewBox="0 0 12 12"
            fill="none"
          >
            <path d="M3 7L6 4L9 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        ) : null}
      </button>
    );
  }

  function openValidationDeleteConfirm(): void {
    if (validationSelectedIds.length === 0) {
      setStatus("Select validation rules to delete.");
      return;
    }
    setIsValidationDeleteConfirmOpen(true);
  }

  function closeValidationDeleteConfirm(): void {
    setIsValidationDeleteConfirmOpen(false);
  }

  function openValidationDeleteInput(): void {
    setIsValidationDeleteConfirmOpen(false);
    setIsValidationDeleteInputOpen(true);
    setValidationDeleteInput("");
  }

  function closeValidationDeleteInput(): void {
    setIsValidationDeleteInputOpen(false);
    setValidationDeleteInput("");
  }

  function toggleCorrectionSelect(ruleId: string): void {
    setCorrectionSelectedIds((current) =>
      current.includes(ruleId) ? current.filter((id) => id !== ruleId) : [...current, ruleId],
    );
  }

  function toggleCorrectionSelectAll(): void {
    if (pagedCorrectionRules.length === 0) {
      return;
    }
    if (areAllCorrectionRowsSelected) {
      setCorrectionSelectedIds([]);
      return;
    }
    setCorrectionSelectedIds(pagedCorrectionRules.map((rule) => rule.id));
  }

  function toggleCorrectionSort(nextKey: "field" | "match_value" | "replacement_value" | "status"): void {
    if (correctionSortKey !== nextKey) {
      setCorrectionSortKey(nextKey);
      setCorrectionSortDirection("asc");
      return;
    }
    setCorrectionSortDirection((current) => (current === "asc" ? "desc" : "asc"));
  }

  function renderCorrectionSortButton(
    label: string,
    key: "field" | "match_value" | "replacement_value" | "status",
  ): JSX.Element {
    const isActive = correctionSortKey === key;
    return (
      <button className="table-sort-button" type="button" onClick={() => toggleCorrectionSort(key)}>
        <span>{label}</span>
        {isActive ? (
          <svg
            aria-hidden="true"
            className={`table-sort-indicator ${correctionSortDirection === "desc" ? "is-desc" : ""}`.trim()}
            width="10"
            height="10"
            viewBox="0 0 12 12"
            fill="none"
          >
            <path d="M3 7L6 4L9 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        ) : null}
      </button>
    );
  }

  function openCorrectionDeleteConfirm(): void {
    if (correctionSelectedIds.length === 0) {
      setStatus("Select correction rules to delete.");
      return;
    }
    setIsCorrectionDeleteConfirmOpen(true);
  }

  function closeCorrectionDeleteConfirm(): void {
    setIsCorrectionDeleteConfirmOpen(false);
  }

  function openCorrectionDeleteInput(): void {
    setIsCorrectionDeleteConfirmOpen(false);
    setIsCorrectionDeleteInputOpen(true);
    setCorrectionDeleteInput("");
  }

  function closeCorrectionDeleteInput(): void {
    setIsCorrectionDeleteInputOpen(false);
    setCorrectionDeleteInput("");
  }

  async function handleSaveValidationRow(): Promise<void> {
    if (!validationMatch.trim()) {
      setStatus("Match value is required.");
      return;
    }
    const payload = {
      field: validationField.trim() || validationListField,
      match_value: validationMatch.trim(),
      status: validationStatus.trim(),
    };
    const isNew = validationEditingId === NEW_VALIDATION_ID;
    const { error } = isNew
      ? await supabase.from("validation_rules").insert(payload)
      : await supabase.from("validation_rules").update(payload).eq("id", validationEditingId);
    if (error) {
      setStatus(`Failed to add validation rule: ${error.message}`);
      return;
    }
    setValidationField("");
    setValidationMatch("");
    setValidationEditingId("");
    setStatus(isNew ? "Validation rule added." : "Validation rule updated.");
    await loadRules();
  }

  async function handleDeleteValidationRule(ruleId: string): Promise<void> {
    const confirmDelete = window.confirm("Delete this validation rule?");
    if (!confirmDelete) {
      return;
    }
    const { error } = await supabase.from("validation_rules").delete().eq("id", ruleId);
    if (error) {
      setStatus(`Failed to delete validation rule: ${error.message}`);
      return;
    }
    setStatus("Validation rule deleted.");
    await loadRules();
  }

  async function handleDeleteSelectedValidationRules(): Promise<void> {
    if (validationSelectedIds.length === 0) {
      setStatus("Select validation rules to delete.");
      return;
    }
    const confirmationPhrase = "DELETE RULES";
    if (validationDeleteInput.trim().toUpperCase() !== confirmationPhrase) {
      setStatus("Confirmation phrase does not match.");
      return;
    }
    setIsValidationDeleteInputOpen(false);
    const { error } = await supabase.from("validation_rules").delete().in("id", validationSelectedIds);
    if (error) {
      setStatus(`Failed to delete validation rules: ${error.message}`);
      return;
    }
    setStatus("Validation rules deleted.");
    setValidationSelectedIds([]);
    setValidationDeleteInput("");
    await loadRules();
  }

  function handleEditValidationRule(rule: RuleRow): void {
    setValidationField(rule.field ?? "");
    setValidationMatch(rule.match_value ?? "");
    setValidationStatus(rule.status ?? "valid");
    setValidationEditingId(rule.id);
  }

  function handleCreateValidationRow(): void {
    setValidationField(validationListField);
    setValidationMatch("");
    setValidationStatus("valid");
    setValidationEditingId(NEW_VALIDATION_ID);
  }

  function handleCancelValidationEdit(): void {
    setValidationEditingId("");
    setValidationMatch("");
    setValidationStatus("valid");
  }

  function normalizeValidationValue(value: string): string {
    return value.trim().toLowerCase();
  }

  function normalizeImportedStatus(value: string): string {
    const normalized = value.trim().toLowerCase();
    if (normalized === "active") {
      return "valid";
    }
    if (normalized === "inactive") {
      return "invalid";
    }
    return normalized;
  }

  function parseValidationListText(
    text: string,
    expectedField: string,
  ): { entries: RuleRow[]; errors: string[] } {
    const allowedStatuses = new Set(["valid", "invalid", "active", "inactive"]);
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const errors: string[] = [];
    const entries: RuleRow[] = [];
    const seenValues = new Set<string>();
    const startIndex =
      lines.length > 0 && lines[0].toLowerCase().startsWith("value") ? 1 : 0;
    for (let index = startIndex; index < lines.length; index += 1) {
      const parts = lines[index].split(/[;,]/).map((part) => part.trim());
      if (parts.length < 1) {
        continue;
      }
      const matchValue = parts[0];
      const rawStatus = parts.length > 1 ? parts[1] : "active";
      const status = normalizeImportedStatus(rawStatus);
      if (!matchValue) {
        errors.push(`Line ${index + 1}: Missing value.`);
        continue;
      }
      if (!allowedStatuses.has(status)) {
        errors.push(`Line ${index + 1}: Invalid status ${rawStatus}.`);
        continue;
      }
      const normalized = normalizeValidationValue(matchValue);
      if (seenValues.has(normalized)) {
        continue;
      }
      seenValues.add(normalized);
      entries.push({ id: "", field: expectedField, match_value: matchValue, status });
    }
    return { entries, errors };
  }

  function buildValidationCsv(rules: readonly RuleRow[]): string {
    const header = "Value,Status";
    const lines = rules.map((rule) => `${rule.match_value ?? ""},${rule.status ?? ""}`);
    return [header, ...lines].join("\n");
  }

  function downloadValidationCsv(filename: string, content: string): void {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleImportValidationList(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const text = await file.text();
    const { entries, errors } = parseValidationListText(text, validationListField);
    setValidationImportFileName(file.name);
    setValidationImportEntries(entries);
    setValidationImportErrors(errors);
    setValidationImportSelected([]);
    event.target.value = "";
  }
  async function handleApplyValidationImport(): Promise<void> {
    if (validationImportErrors.length > 0) {
      setValidationImportStatus(validationImportErrors.slice(0, 3).join(" "));
      return;
    }
    if (validationImportEntries.length === 0) {
      setValidationImportStatus("No valid entries found in file.");
      return;
    }
    if (validationImportMode === "replace") {
      setIsValidationReplaceConfirmOpen(true);
      return;
    }
    await executeValidationImport();
  }

  async function executeValidationImport(): Promise<void> {
    if (validationImportMode === "replace") {
      const { error: deleteError } = await supabase
        .from("validation_rules")
        .delete()
        .eq("field", validationListField);
      if (deleteError) {
        setValidationImportStatus(`Failed to clear list: ${deleteError.message}`);
        return;
      }
    }
    const existingValues = new Set(
      validationRules
        .filter((rule) => rule.field === validationListField)
        .map((rule) => normalizeValidationValue(rule.match_value ?? "")),
    );
    const payload = validationImportEntries
      .filter((entry) => {
        if (!validationIgnoreDuplicates) {
          return true;
        }
        const normalized = normalizeValidationValue(entry.match_value ?? "");
        return !existingValues.has(normalized);
      })
      .map((entry) => ({
        field: entry.field?.trim(),
        match_value: entry.match_value?.trim(),
        status: entry.status?.trim(),
      }));
    const uniquePayload = Array.from(
      new Map(payload.map((entry) => [`${entry.match_value}-${entry.status}`, entry])).values(),
    );
    const { error: insertError } = await supabase.from("validation_rules").insert(uniquePayload);
    if (insertError) {
      setValidationImportStatus(`Failed to import list: ${insertError.message}`);
      return;
    }
    setValidationImportStatus(`Imported ${uniquePayload.length} entries.`);
    setIsValidationImportOpen(false);
    setValidationImportEntries([]);
    setValidationImportSelected([]);
    setValidationImportFileName("");
    setValidationImportErrors([]);
    await loadRules();
  }

  function handleCloseValidationImport(): void {
    setIsValidationImportOpen(false);
    setValidationImportEntries([]);
    setValidationImportSelected([]);
    setValidationImportFileName("");
    setValidationImportErrors([]);
  }

  async function handleConfirmReplaceImport(): Promise<void> {
    setIsValidationReplaceConfirmOpen(false);
    await executeValidationImport();
  }

  function toggleValidationImportSelected(index: number): void {
    setValidationImportSelected((current) =>
      current.includes(index) ? current.filter((value) => value !== index) : [...current, index],
    );
  }

  function handleRemoveSelectedImportEntries(): void {
    if (validationImportSelected.length === 0) {
      return;
    }
    const selectedSet = new Set(validationImportSelected);
    const nextEntries = validationImportEntries.filter((_entry, index) => !selectedSet.has(index));
    setValidationImportEntries(nextEntries);
    setValidationImportSelected([]);
  }

  function handleUpdateImportEntry(index: number, field: "match_value" | "status", value: string): void {
    setValidationImportEntries((current) =>
      current.map((entry, entryIndex) => {
        if (entryIndex !== index) {
          return entry;
        }
        return { ...entry, [field]: value };
      }),
    );
  }

  function handleExportValidationList(): void {
    const listRules = validationRules.filter((rule) => rule.field === validationListField);
    const csv = buildValidationCsv(listRules);
    downloadValidationCsv(`validation-list-${validationListField}.csv`, csv);
  }

  function handleBackupValidationList(): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const listRules = validationRules.filter((rule) => rule.field === validationListField);
    const csv = buildValidationCsv(listRules);
    downloadValidationCsv(`validation-backup-${validationListField}-${timestamp}.csv`, csv);
  }

  function normalizeCorrectionValue(value: string): string {
    return value.trim().toLowerCase();
  }

  function normalizeCorrectionStatus(value: string): string {
    return value.trim().toLowerCase();
  }

  function parseCorrectionListText(
    text: string,
    expectedField: string,
  ): { entries: RuleRow[]; errors: string[] } {
    const allowedStatuses = new Set(["active", "inactive"]);
    const allowedFields = new Set(correctionFieldOptions);
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const errors: string[] = [];
    const entries: RuleRow[] = [];
    const seenValues = new Set<string>();
    const startIndex =
      lines.length > 0 && (lines[0].toLowerCase().startsWith("match") || lines[0].toLowerCase().startsWith("value"))
        ? 1
        : 0;
    for (let index = startIndex; index < lines.length; index += 1) {
      const parts = lines[index].split(/[;,]/).map((part) => part.trim());
      if (parts.length < 2) {
        errors.push(`Line ${index + 1}: Match and replacement values are required.`);
        continue;
      }
      const matchValue = parts[0];
      const replacementValue = parts[1];
      if (!matchValue || !replacementValue) {
        errors.push(`Line ${index + 1}: Match and replacement values are required.`);
        continue;
      }
      let field = expectedField;
      let status = "active";
      const thirdValue = parts[2];
      const fourthValue = parts[3];
      if (thirdValue) {
        const normalizedThird = normalizeCorrectionStatus(thirdValue);
        if (allowedStatuses.has(normalizedThird)) {
          status = normalizedThird;
        } else {
          field = normalizedThird;
        }
      }
      if (fourthValue) {
        const normalizedFourth = normalizeCorrectionStatus(fourthValue);
        if (!allowedStatuses.has(normalizedFourth)) {
          errors.push(`Line ${index + 1}: Invalid status ${fourthValue}.`);
          continue;
        }
        status = normalizedFourth;
      }
      if (!allowedFields.has(field)) {
        errors.push(`Line ${index + 1}: Invalid field ${field}.`);
        continue;
      }
      if (field !== expectedField) {
        errors.push(`Line ${index + 1}: Field must be ${expectedField}.`);
        continue;
      }
      if (!allowedStatuses.has(status)) {
        errors.push(`Line ${index + 1}: Invalid status ${status}.`);
        continue;
      }
      const normalizedKey = `${field}:${normalizeCorrectionValue(matchValue)}`;
      if (seenValues.has(normalizedKey)) {
        continue;
      }
      seenValues.add(normalizedKey);
      entries.push({
        id: "",
        field,
        match_value: matchValue,
        replacement_value: replacementValue,
        status,
      });
    }
    return { entries, errors };
  }

  function buildCorrectionCsv(rules: readonly RuleRow[]): string {
    const header = "Match,Replacement,Field,Status";
    const lines = rules.map(
      (rule) => `${rule.match_value ?? ""},${rule.replacement_value ?? ""},${rule.field ?? ""},${rule.status ?? ""}`,
    );
    return [header, ...lines].join("\n");
  }

  function downloadCorrectionCsv(filename: string, content: string): void {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleImportCorrectionList(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!correctionListField) {
      setCorrectionImportStatus("Select a field before importing.");
      return;
    }
    const text = await file.text();
    const { entries, errors } = parseCorrectionListText(text, correctionListField);
    setCorrectionImportEntries(entries);
    setCorrectionImportErrors(errors);
    setCorrectionImportFileName(file.name);
    setCorrectionImportStatus("");
    setCorrectionImportSelected([]);
    event.target.value = "";
  }

  async function handleApplyCorrectionImport(): Promise<void> {
    if (correctionImportErrors.length > 0) {
      setCorrectionImportStatus(correctionImportErrors.slice(0, 3).join(" "));
      return;
    }
    if (correctionImportEntries.length === 0) {
      setCorrectionImportStatus("No valid entries found in file.");
      return;
    }
    if (correctionImportMode === "replace") {
      setIsCorrectionReplaceConfirmOpen(true);
      return;
    }
    await executeCorrectionImport();
  }

  async function executeCorrectionImport(): Promise<void> {
    if (correctionImportMode === "replace") {
      const { error: deleteError } = await supabase
        .from("correction_rules")
        .delete()
        .eq("field", correctionListField);
      if (deleteError) {
        setCorrectionImportStatus(`Failed to clear list: ${deleteError.message}`);
        return;
      }
    }
    const existingValues = new Set(
      correctionRules
        .filter((rule) => rule.field === correctionListField)
        .map((rule) => normalizeCorrectionValue(rule.match_value ?? "")),
    );
    const payload = correctionImportEntries
      .filter((entry) => {
        if (!correctionIgnoreDuplicates) {
          return true;
        }
        const normalized = normalizeCorrectionValue(entry.match_value ?? "");
        return !existingValues.has(normalized);
      })
      .map((entry) => ({
        field: entry.field?.trim(),
        match_value: entry.match_value?.trim(),
        replacement_value: entry.replacement_value?.trim(),
        status: entry.status?.trim(),
      }));
    const uniquePayload = Array.from(
      new Map(payload.map((entry) => [`${entry.field}-${entry.match_value}`, entry])).values(),
    );
    const { error: insertError } = await supabase.from("correction_rules").insert(uniquePayload);
    if (insertError) {
      setCorrectionImportStatus(`Failed to import list: ${insertError.message}`);
      return;
    }
    setCorrectionImportStatus(`Imported ${uniquePayload.length} entries.`);
    setIsCorrectionImportOpen(false);
    setCorrectionImportEntries([]);
    setCorrectionImportSelected([]);
    setCorrectionImportFileName("");
    setCorrectionImportErrors([]);
    await loadRules();
  }

  function handleCloseCorrectionImport(): void {
    setIsCorrectionImportOpen(false);
    setCorrectionImportEntries([]);
    setCorrectionImportSelected([]);
    setCorrectionImportFileName("");
    setCorrectionImportErrors([]);
  }

  async function handleConfirmCorrectionReplaceImport(): Promise<void> {
    setIsCorrectionReplaceConfirmOpen(false);
    await executeCorrectionImport();
  }

  function toggleCorrectionImportSelected(index: number): void {
    setCorrectionImportSelected((current) =>
      current.includes(index) ? current.filter((value) => value !== index) : [...current, index],
    );
  }

  function handleRemoveSelectedCorrectionImportEntries(): void {
    if (correctionImportSelected.length === 0) {
      return;
    }
    const selectedSet = new Set(correctionImportSelected);
    const nextEntries = correctionImportEntries.filter((_entry, index) => !selectedSet.has(index));
    setCorrectionImportEntries(nextEntries);
    setCorrectionImportSelected([]);
  }

  function handleUpdateCorrectionImportEntry(
    index: number,
    field: "match_value" | "replacement_value" | "status",
    value: string,
  ): void {
    setCorrectionImportEntries((current) =>
      current.map((entry, entryIndex) => {
        if (entryIndex !== index) {
          return entry;
        }
        return { ...entry, [field]: value };
      }),
    );
  }

  function handleExportCorrectionList(): void {
    const listRules = correctionRules.filter((rule) => rule.field === correctionListField);
    const csv = buildCorrectionCsv(listRules);
    downloadCorrectionCsv(`corrections-${correctionListField}.csv`, csv);
  }

  function handleBackupCorrectionList(): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const listRules = correctionRules.filter((rule) => rule.field === correctionListField);
    const csv = buildCorrectionCsv(listRules);
    downloadCorrectionCsv(`corrections-backup-${correctionListField}-${timestamp}.csv`, csv);
  }

  async function handleSaveCorrectionRow(): Promise<void> {
    if (!correctionMatch.trim() || !correctionReplacement.trim()) {
      setStatus("Match and replacement values are required.");
      return;
    }
    const isNew = correctionEditingId === NEW_CORRECTION_ID;
    if (correctionEditingId && !isNew) {
      const confirmUpdate = window.confirm("Update this correction rule?");
      if (!confirmUpdate) {
        return;
      }
    }
    const payload = {
      field: correctionField.trim() || correctionListField,
      match_value: correctionMatch.trim(),
      replacement_value: correctionReplacement.trim(),
      status: correctionStatus.trim(),
    };
    const { error } = correctionEditingId && !isNew
      ? await supabase.from("correction_rules").update(payload).eq("id", correctionEditingId)
      : await supabase.from("correction_rules").insert(payload);
    if (error) {
      setStatus(`Failed to add correction rule: ${error.message}`);
      return;
    }
    setCorrectionField("");
    setCorrectionMatch("");
    setCorrectionReplacement("");
    setCorrectionStatus("active");
    setCorrectionEditingId("");
    setStatus(isNew ? "Correction rule added." : "Correction rule updated.");
    await loadRules();
  }

  async function handleDeleteCorrectionRule(ruleId: string): Promise<void> {
    const confirmDelete = window.confirm("Delete this correction rule?");
    if (!confirmDelete) {
      return;
    }
    const { error } = await supabase.from("correction_rules").delete().eq("id", ruleId);
    if (error) {
      setStatus(`Failed to delete correction rule: ${error.message}`);
      return;
    }
    setStatus("Correction rule deleted.");
    await loadRules();
  }

  async function handleDeleteSelectedCorrectionRules(): Promise<void> {
    if (correctionSelectedIds.length === 0) {
      setStatus("Select correction rules to delete.");
      return;
    }
    const confirmationPhrase = "DELETE RULES";
    if (correctionDeleteInput.trim().toUpperCase() !== confirmationPhrase) {
      setStatus("Confirmation phrase does not match.");
      return;
    }
    setIsCorrectionDeleteInputOpen(false);
    const { error } = await supabase.from("correction_rules").delete().in("id", correctionSelectedIds);
    if (error) {
      setStatus(`Failed to delete correction rules: ${error.message}`);
      return;
    }
    setStatus("Correction rules deleted.");
    setCorrectionSelectedIds([]);
    setCorrectionDeleteInput("");
    await loadRules();
  }

  function handleEditCorrectionRule(rule: RuleRow): void {
    setCorrectionField(rule.field ?? "");
    setCorrectionMatch(rule.match_value ?? "");
    setCorrectionReplacement(rule.replacement_value ?? "");
    setCorrectionStatus(rule.status ?? "active");
    setCorrectionEditingId(rule.id);
  }

  function handleCreateCorrectionRow(): void {
    setCorrectionField(correctionListField);
    setCorrectionMatch("");
    setCorrectionReplacement("");
    setCorrectionStatus("active");
    setCorrectionEditingId(NEW_CORRECTION_ID);
  }

  function handleCancelCorrectionEdit(): void {
    setCorrectionEditingId("");
    setCorrectionMatch("");
    setCorrectionReplacement("");
    setCorrectionStatus("active");
  }

  async function handleAddScoringRule(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!selectedClanId) {
      setStatus("Select a clan first.");
      return;
    }
    if (scoringEditingId) {
      const confirmUpdate = window.confirm("Update this scoring rule?");
      if (!confirmUpdate) {
        return;
      }
    }
    const scoreValue = Number(scoringScore);
    const orderValue = Number(scoringOrder);
    if (Number.isNaN(scoreValue) || Number.isNaN(orderValue)) {
      setStatus("Score and order must be numbers.");
      return;
    }
    const payload = {
      clan_id: selectedClanId,
      chest_match: scoringChest.trim(),
      source_match: scoringSource.trim(),
      min_level: scoringMinLevel ? Number(scoringMinLevel) : null,
      max_level: scoringMaxLevel ? Number(scoringMaxLevel) : null,
      score: scoreValue,
      rule_order: orderValue,
    };
    const { error } = scoringEditingId
      ? await supabase.from("scoring_rules").update(payload).eq("id", scoringEditingId)
      : await supabase.from("scoring_rules").insert(payload);
    if (error) {
      setStatus(`Failed to add scoring rule: ${error.message}`);
      return;
    }
    setScoringChest("");
    setScoringSource("");
    setScoringMinLevel("");
    setScoringMaxLevel("");
    setScoringScore("");
    setScoringOrder("1");
    setScoringEditingId("");
    setStatus("Scoring rule added.");
    await loadRules();
  }

  async function handleDeleteScoringRule(ruleId: string): Promise<void> {
    const confirmDelete = window.confirm("Delete this scoring rule?");
    if (!confirmDelete) {
      return;
    }
    const { error } = await supabase.from("scoring_rules").delete().eq("id", ruleId);
    if (error) {
      setStatus(`Failed to delete scoring rule: ${error.message}`);
      return;
    }
    setStatus("Scoring rule deleted.");
    await loadRules();
  }

  function handleEditScoringRule(rule: RuleRow): void {
    setScoringChest(rule.chest_match ?? "");
    setScoringSource(rule.source_match ?? "");
    setScoringMinLevel(rule.min_level !== null && rule.min_level !== undefined ? String(rule.min_level) : "");
    setScoringMaxLevel(rule.max_level !== null && rule.max_level !== undefined ? String(rule.max_level) : "");
    setScoringScore(rule.score !== undefined ? String(rule.score) : "");
    setScoringOrder(rule.rule_order !== undefined ? String(rule.rule_order) : "1");
    setScoringEditingId(rule.id);
  }

  return (
    <div className="grid">
      <section className="card" style={{ gridColumn: "span 12" }}>
        <div className="card-header">
          <div>
            <div className="card-title">Admin Sections</div>
            <div className="card-subtitle">Manage clans, validation, corrections, and audit logs</div>
          </div>
        </div>
        <div className="tabs">
          <button
            className={`tab ${activeSection === "clans" ? "active" : ""}`}
            type="button"
            onClick={() => updateActiveSection("clans")}
          >
            Clan Management
          </button>
          <button
            className={`tab ${activeSection === "users" ? "active" : ""}`}
            type="button"
            onClick={() => updateActiveSection("users")}
          >
            Users
          </button>
          <button
            className={`tab ${activeSection === "validation" ? "active" : ""}`}
            type="button"
            onClick={() => updateActiveSection("validation")}
          >
            Validation
          </button>
          <button
            className={`tab ${activeSection === "corrections" ? "active" : ""}`}
            type="button"
            onClick={() => updateActiveSection("corrections")}
          >
            Corrections
          </button>
          <button
            className={`tab ${activeSection === "logs" ? "active" : ""}`}
            type="button"
            onClick={() => updateActiveSection("logs")}
          >
            Audit Logs
          </button>
          <button className="tab" type="button" onClick={() => handleNavigateAdmin("/admin/data-import")}>
            Data Import
          </button>
          <button className="tab" type="button" onClick={() => handleNavigateAdmin("/admin/data-table")}>
            Chest Database
          </button>
        </div>
      </section>
      {activeSection === "clans" ? (
      <section className="card" style={{ gridColumn: "span 12" }}>
        <div className="card-header">
          <div>
            <div className="card-title">Clan Management</div>
            <div className="card-subtitle">{selectedClan ? selectedClan.name : "Select a clan"}</div>
          </div>
          <IconButton
            ariaLabel="Delete clan"
            onClick={openClanDeleteConfirm}
            disabled={!selectedClanId || selectedClanId === unassignedClanId}
            variant="danger"
          >
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 2.5L13.5 12.5H2.5L8 2.5Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path d="M8 6V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M8 11.2H8.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </IconButton>
        </div>
        <div className="admin-clan-row">
          <label htmlFor="selectedClan">Clan</label>
          <RadixSelect
            id="selectedClan"
            ariaLabel="Clan"
            value={clanSelectValue}
            onValueChange={(value) => setSelectedClanId(value === clanSelectNone ? "" : value)}
            options={clanSelectOptions}
            renderOptionContent={(option) => {
              if (option.value === clanSelectNone) {
                return option.label;
              }
              return (
                <span className="select-item-content">
                  <span>{option.label}</span>
                  {defaultClanId && option.value === defaultClanId ? (
                    <span className="badge select-badge">Default</span>
                  ) : null}
                </span>
              );
            }}
          />
          <div className="list inline" style={{ alignItems: "center", flexWrap: "wrap" }}>
            <span className="text-muted">Clan actions</span>
            <div className="list inline">
              <IconButton ariaLabel="Create clan" onClick={openCreateClanModal} variant="primary">
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3.5V12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M3.5 8H12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </IconButton>
              <IconButton ariaLabel="Edit clan" onClick={openEditClanModal} disabled={!selectedClanId}>
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
              <IconButton ariaLabel="Assign game accounts" onClick={openAssignAccountsModal} disabled={!selectedClanId}>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M5 6.5C6.1 6.5 7 5.6 7 4.5C7 3.4 6.1 2.5 5 2.5C3.9 2.5 3 3.4 3 4.5C3 5.6 3.9 6.5 5 6.5Z" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M1.5 12.5C1.5 10.6 3.1 9 5 9C6.9 9 8.5 10.6 8.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M11 5V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M8.5 8H13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </IconButton>
              <IconButton
                ariaLabel="Set default clan"
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
                      if (error) {
                        setStatus(`Failed to set default: ${error.message}`);
                        return;
                      }
                      setDefaultClanId(selectedClanId);
                      setStatus("Default clan saved.");
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
                  ariaLabel="Clear default clan"
                  onClick={() => {
                    void supabase
                      .from("clans")
                      .update({ is_default: false })
                      .eq("id", selectedClanId)
                      .then(({ error }) => {
                        if (error) {
                          setStatus(`Failed to clear default: ${error.message}`);
                          return;
                        }
                        setDefaultClanId("");
                        setStatus("Default clan cleared.");
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
            label="Search"
            value={memberSearch}
            onChange={setMemberSearch}
            placeholder="Game account, username, email, or user id"
          />
          <LabeledSelect
            id="memberRankFilter"
            label="Rank"
            value={memberRankFilter}
            onValueChange={(value) => setMemberRankFilter(value)}
            options={[
              { value: "all", label: "All" },
              { value: "", label: "None" },
              ...rankOptions.map((rank) => ({ value: rank, label: formatLabel(rank) })),
            ]}
          />
          <LabeledSelect
            id="memberStatusFilter"
            label="Status"
            value={memberStatusFilter}
            onValueChange={(value) => setMemberStatusFilter(value)}
            options={[
              { value: "all", label: "All" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
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
            Clear filters
          </button>
          <button
            className="button"
            type="button"
            onClick={handleSaveAllMembershipEdits}
            disabled={Object.keys(membershipEdits).length === 0}
          >
            Save All
          </button>
          <button
            className="button"
            type="button"
            onClick={cancelAllMembershipEdits}
            disabled={Object.keys(membershipEdits).length === 0}
          >
            Cancel All
          </button>
          <span className="text-muted">
            {filteredMemberships.length} / {memberships.length}
          </span>
        </div>
        {memberships.length === 0 ? (
          <div className="list">
            <div className="list-item">
              <span>No game accounts yet</span>
              <span className="badge">Assign some</span>
            </div>
          </div>
        ) : filteredMemberships.length === 0 ? (
          <div className="list">
            <div className="list-item">
              <span>No game accounts match the filters</span>
              <span className="badge">Adjust search</span>
            </div>
          </div>
        ) : (
          <TableScroll>
            <div className="table members">
            <header>
              <span>#</span>
              <span>{renderMemberSortButton("Game Account", "game")}</span>
              <span>{renderMemberSortButton("User", "user")}</span>
              <span>{renderMemberSortButton("Clan", "clan")}</span>
              <span>{renderMemberSortButton("Rank", "rank")}</span>
              <span>{renderMemberSortButton("Status", "status")}</span>
              <span>Actions</span>
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
                        onChange={(event) =>
                          updateGameAccountEdit(membership.game_accounts?.id ?? "", "game_username", event.target.value)
                        }
                        placeholder="Game username"
                      />
                    ) : (
                      <button
                        className="editable-button editable-field"
                        type="button"
                        onClick={() =>
                          beginGameAccountEdit({
                            id: membership.game_accounts?.id ?? "",
                            user_id: membership.game_accounts?.user_id ?? "",
                            game_username: membership.game_accounts?.game_username ?? "",
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
                      ? profilesById[membership.game_accounts.user_id]?.email ?? "-"
                      : "-"}
                  </div>
                  <div className="text-muted">
                    {membership.game_accounts?.user_id
                      ? profilesById[membership.game_accounts.user_id]?.display_name ??
                        profilesById[membership.game_accounts.user_id]?.username ??
                        "-"
                      : "-"}
                  </div>
                </div>
                <RadixSelect
                  ariaLabel="Clan"
                  value={getMembershipEditValue(membership).clan_id ?? membership.clan_id}
                  onValueChange={(value) => updateMembershipEdit(membership.id, "clan_id", value)}
                  options={clans.map((clan) => ({ value: clan.id, label: clan.name }))}
                  triggerClassName={`select-trigger${isMembershipFieldChanged(membership, "clan_id") ? " is-edited" : ""}`}
                />
                <RadixSelect
                  ariaLabel="Rank"
                  value={getMembershipEditValue(membership).rank ?? ""}
                  onValueChange={(value) => updateMembershipEdit(membership.id, "rank", value)}
                  options={[
                    { value: "", label: "None" },
                    ...rankOptions.map((rank) => ({ value: rank, label: formatLabel(rank) })),
                  ]}
                  triggerClassName={`select-trigger${isMembershipFieldChanged(membership, "rank") ? " is-edited" : ""}`}
                />
                <RadixSelect
                  ariaLabel="Status"
                  value={getMembershipEditValue(membership).is_active ? "true" : "false"}
                  onValueChange={(value) => updateMembershipEdit(membership.id, "is_active", value)}
                  options={[
                    { value: "true", label: "Active" },
                    { value: "false", label: "Inactive" },
                  ]}
                  triggerClassName={`select-trigger${isMembershipFieldChanged(membership, "is_active") ? " is-edited" : ""}`}
                  triggerDataRole="status-select"
                />
                <div className="list inline">
                  <IconButton ariaLabel="Save changes" onClick={() => handleSaveMembershipEdit(membership)}>
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M4 8.5L7 11.5L12 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </IconButton>
                  <IconButton ariaLabel="Cancel changes" onClick={() => cancelMembershipEdits(membership.id)}>
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M4.5 4.5L11.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M11.5 4.5L4.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </IconButton>
                  {membership.game_accounts?.id ? (
                    <IconButton
                      ariaLabel="Delete game account"
                      onClick={() =>
                        openGameAccountDeleteConfirm({
                          id: membership.game_accounts?.id ?? "",
                          user_id: membership.game_accounts?.user_id ?? "",
                          game_username: membership.game_accounts?.game_username ?? "",
                        })
                      }
                      variant="danger"
                    >
                      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M3.5 5.5H12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        <path d="M6 5.5V4C6 3.4 6.4 3 7 3H9C9.6 3 10 3.4 10 4V5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        <path d="M5.2 5.5L5.6 12C5.6 12.6 6.1 13 6.7 13H9.3C9.9 13 10.4 12.6 10.4 12L10.8 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
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
      </section>
      ) : null}
      {activeSection === "users" ? (
      <section className="card" style={{ gridColumn: "span 12" }}>
        <div className="card-header">
          <div>
            <div className="card-title">Users</div>
            <div className="card-subtitle">Manage users and game accounts</div>
          </div>
          <span className="badge">{filteredUserRows.length}</span>
        </div>
        <div className="list inline admin-members-filters filter-bar" style={{ alignItems: "center", flexWrap: "wrap" }}>
          <SearchInput
            id="userSearch"
            label="Search"
            value={userSearch}
            onChange={setUserSearch}
            placeholder="Email, username, or nickname"
          />
          <LabeledSelect
            id="userRoleFilter"
            label="Role"
            value={userRoleFilter}
            onValueChange={(value) => setUserRoleFilter(value)}
            options={[
              { value: "all", label: "All" },
              ...roleOptions.map((role) => ({ value: role, label: formatLabel(role) })),
            ]}
          />
          <LabeledSelect
            id="userAdminFilter"
            label="Admin"
            value={userAdminFilter}
            onValueChange={(value) => setUserAdminFilter(value)}
            options={[
              { value: "all", label: "All" },
              { value: "admin", label: "Admin" },
              { value: "member", label: "Non-admin" },
            ]}
          />
          <button
            className="button"
            type="button"
            onClick={() => {
              setUserSearch("");
              setUserRoleFilter("all");
              setUserAdminFilter("all");
            }}
          >
            Clear filters
          </button>
          <button
            className="button"
            type="button"
            onClick={handleSaveAllUserEdits}
            disabled={
              Object.keys(userEdits).length === 0 &&
              Object.keys(gameAccountEdits).length === 0 &&
              Object.keys(membershipEdits).length === 0
            }
          >
            Save All
          </button>
          <button
            className="button"
            type="button"
            onClick={cancelAllUserEdits}
            disabled={
              Object.keys(userEdits).length === 0 &&
              Object.keys(gameAccountEdits).length === 0 &&
              Object.keys(membershipEdits).length === 0
            }
          >
            Cancel All
          </button>
          <span className="text-muted">
            {filteredUserRows.length} / {userRows.length}
          </span>
          <button className="button primary" type="button" onClick={openCreateUserModal}>
            Create User
          </button>
        </div>
        {userStatus ? <div className="alert info">{userStatus}</div> : null}
        {userRows.length === 0 ? (
          <div className="list">
            <div className="list-item">
              <span>No users found</span>
              <span className="badge">Adjust search</span>
            </div>
          </div>
        ) : filteredUserRows.length === 0 ? (
          <div className="list">
            <div className="list-item">
              <span>No users match the filters</span>
              <span className="badge">Adjust search</span>
            </div>
          </div>
        ) : (
          <TableScroll>
            <div className="table users">
            <header>
              <span>#</span>
              <span>{renderUserSortButton("Username", "username")}</span>
              <span>{renderUserSortButton("Email", "email")}</span>
              <span>{renderUserSortButton("Nickname", "nickname")}</span>
              <span>{renderUserSortButton("Role", "role")}</span>
              <span>{renderUserSortButton("Admin", "admin")}</span>
              <span>{renderUserSortButton("Game Accounts", "accounts")}</span>
              <span>Actions</span>
            </header>
            {sortedUserRows.map((user, index) => {
              const isExpanded = expandedUserIds.includes(user.id);
              const accounts = gameAccountsByUserId[user.id] ?? [];
              const sortedAccounts = [...accounts].sort((left, right) => {
                const leftValue = getAccountSortValue(left);
                const rightValue = getAccountSortValue(right);
                return compareRuleValues(leftValue, rightValue, memberSortDirection);
              });
              const edits = getUserEditValue(user);
              const isEditing = activeEditingUserId === user.id;
              return (
                <div key={user.id}>
                  <div
                    className="row"
                    role="button"
                    tabIndex={0}
                    onClick={() => handleUserRowClick(user.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleUserRowClick(user.id);
                      }
                    }}
                  >
                    <span className="text-muted">{index + 1}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
                          className={`editable-field ${isUserFieldChanged(user, "username") ? "is-edited" : ""}`.trim()}
                          value={edits.username ?? ""}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => updateUserEdit(user.id, "username", event.target.value)}
                          style={{ flex: 1 }}
                        />
                      ) : (
                        <button
                          className="editable-button editable-field"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
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
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => updateUserEdit(user.id, "display_name", event.target.value)}
                      />
                    ) : (
                      <button
                        className="editable-button editable-field"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          beginUserEdit(user);
                        }}
                      >
                        {edits.display_name || "-"}
                      </button>
                    )}
                    <div onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
                      <RadixSelect
                        ariaLabel="Role"
                        value={edits.role ?? getUserRole(user.id)}
                        onValueChange={(value) => updateUserEdit(user.id, "role", value)}
                        options={roleOptions.map((role) => ({ value: role, label: formatLabel(role) }))}
                        triggerClassName={`select-trigger${isUserFieldChanged(user, "role") ? " is-edited" : ""}`}
                      />
                    </div>
                    <div>{user.is_admin ? "Yes" : "No"}</div>
                    <div className="text-muted" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span className="badge" aria-label={`${accounts.length} game accounts`}>
                        {accounts.length}
                      </span>
                    </div>
                    {(() => {
                      const actionCount = isEditing ? 6 : 4;
                      return (
                        <div
                          className={`list inline user-actions action-icons ${actionCount > 4 ? "action-icons-wrap" : ""}`.trim()}
                        >
                      <IconButton
                        ariaLabel={user.is_admin ? "Revoke admin" : "Grant admin"}
                        title={
                          user.is_admin && user.id === currentUserId
                            ? "You cannot revoke your own admin access."
                            : user.is_admin && userRows.filter((row) => Boolean(row.is_admin)).length <= 1
                              ? "At least one admin is required."
                              : user.is_admin
                                ? "Revoke admin"
                                : "Grant admin"
                        }
                        onClick={() => handleToggleAdmin(user)}
                        disabled={
                          !currentUserId ||
                          (Boolean(user.is_admin) && user.id === currentUserId) ||
                          (Boolean(user.is_admin) && userRows.filter((row) => Boolean(row.is_admin)).length <= 1)
                        }
                      >
                        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M8 2.5L12.5 4.5V8.5C12.5 10.8 10.9 12.9 8 13.5C5.1 12.9 3.5 10.8 3.5 8.5V4.5L8 2.5Z"
                            stroke="currentColor"
                            strokeWidth="1.3"
                            strokeLinejoin="round"
                          />
                          {user.is_admin ? (
                            <path
                              d="M5.5 8.2L7.2 9.8L10.4 6.6"
                              stroke="currentColor"
                              strokeWidth="1.3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          ) : (
                            <path
                              d="M6.2 6.2H9.8M8 4.4V8"
                              stroke="currentColor"
                              strokeWidth="1.3"
                              strokeLinecap="round"
                            />
                          )}
                        </svg>
                      </IconButton>
                      <IconButton
                        ariaLabel="Resend invite"
                        onClick={() => handleResendInvite(user.email)}
                      >
                        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M2.5 3.5H13.5V12.5H2.5V3.5Z"
                            stroke="currentColor"
                            strokeWidth="1.3"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M2.8 4.2L8 8.2L13.2 4.2"
                            stroke="currentColor"
                            strokeWidth="1.3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </IconButton>
                      <IconButton ariaLabel="Add game account" onClick={() => openCreateGameAccountModal(user)}>
                        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M4.2 6.5H11.8"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                          />
                          <path
                            d="M6 9.5H10"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                          />
                          <path
                            d="M3 8C3 5.8 4.8 4 7 4H9C11.2 4 13 5.8 13 8C13 10.2 11.2 12 9 12H7C4.8 12 3 10.2 3 8Z"
                            stroke="currentColor"
                            strokeWidth="1.2"
                          />
                          <path
                            d="M12.5 3.5V5.5M11.5 4.5H13.5"
                            stroke="currentColor"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                          />
                        </svg>
                      </IconButton>
                      {isEditing ? (
                        <>
                          <IconButton ariaLabel="Save changes" onClick={() => handleSaveUserEdit(user)}>
                            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path d="M4 8.5L7 11.5L12 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </IconButton>
                          <IconButton ariaLabel="Cancel changes" onClick={() => cancelUserEdit(user.id)}>
                            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path d="M4.5 4.5L11.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                              <path d="M11.5 4.5L4.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          </IconButton>
                        </>
                      ) : null}
                      <IconButton ariaLabel="Delete user" onClick={() => openUserDeleteConfirm(user)} variant="danger">
                        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M3.5 5.5H12.5"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                          />
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
                    </div>
                      );
                    })()}
                  </div>
                  {isExpanded ? (
                    <div className="row subrow">
                      <div style={{ gridColumn: "1 / -1" }}>
                        {accounts.length === 0 ? (
                          <div className="text-muted">No game accounts yet.</div>
                        ) : (
                          <TableScroll>
                            <div className="table members">
                            <header>
                              <span>#</span>
                              <span>{renderMemberSortButton("Game Account", "game")}</span>
                              <span>{renderMemberSortButton("User", "user")}</span>
                              <span>{renderMemberSortButton("Clan", "clan")}</span>
                              <span>{renderMemberSortButton("Rank", "rank")}</span>
                              <span>{renderMemberSortButton("Status", "status")}</span>
                              <span>Actions</span>
                            </header>
                            {sortedAccounts.map((account, index) => {
                              const membership = userMembershipsByAccountId[account.id];
                              if (!membership) {
                                return (
                                  <div className="row" key={account.id}>
                                    <span className="text-muted">{index + 1}</span>
                                    <div>
                                      <div>{account.game_username}</div>
                                    </div>
                                    <div>
                                      <div>{user.email}</div>
                                      <div className="text-muted">{user.display_name ?? user.username ?? "-"}</div>
                                    </div>
                                    <div className="text-muted">-</div>
                                    <div className="text-muted">-</div>
                                  <div className="text-muted">Missing membership</div>
                                  <div />
                                  </div>
                                );
                              }
                              return (
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
                                          onChange={(event) =>
                                            updateGameAccountEdit(membership.game_accounts?.id ?? "", "game_username", event.target.value)
                                          }
                                          placeholder="Game username"
                                        />
                                      ) : (
                                        <button
                                          className="editable-button editable-field"
                                          type="button"
                                          onClick={() =>
                                            beginGameAccountEdit({
                                              id: membership.game_accounts?.id ?? "",
                                              user_id: membership.game_accounts?.user_id ?? "",
                                              game_username: membership.game_accounts?.game_username ?? "",
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
                                    <div>{user.email}</div>
                                    <div className="text-muted">{user.display_name ?? user.username ?? "-"}</div>
                                  </div>
                                  <RadixSelect
                                    ariaLabel="Clan"
                                    value={getMembershipEditValue(membership).clan_id ?? membership.clan_id}
                                    onValueChange={(value) => updateMembershipEdit(membership.id, "clan_id", value)}
                                    options={clans.map((clan) => ({ value: clan.id, label: clan.name }))}
                                    triggerClassName={`select-trigger${isMembershipFieldChanged(membership, "clan_id") ? " is-edited" : ""}`}
                                  />
                                  <RadixSelect
                                    ariaLabel="Rank"
                                    value={getMembershipEditValue(membership).rank ?? ""}
                                    onValueChange={(value) => updateMembershipEdit(membership.id, "rank", value)}
                                    options={[
                                      { value: "", label: "None" },
                                      ...rankOptions.map((rank) => ({ value: rank, label: formatLabel(rank) })),
                                    ]}
                                    triggerClassName={`select-trigger${isMembershipFieldChanged(membership, "rank") ? " is-edited" : ""}`}
                                  />
                                  <RadixSelect
                                    ariaLabel="Status"
                                    value={getMembershipEditValue(membership).is_active ? "true" : "false"}
                                    onValueChange={(value) => updateMembershipEdit(membership.id, "is_active", value)}
                                    options={[
                                      { value: "true", label: "Active" },
                                      { value: "false", label: "Inactive" },
                                    ]}
                                    triggerClassName={`select-trigger${isMembershipFieldChanged(membership, "is_active") ? " is-edited" : ""}`}
                                    triggerDataRole="status-select"
                                  />
                <div className="list inline action-icons">
                                    <IconButton ariaLabel="Save changes" onClick={() => handleSaveMembershipEdit(membership)}>
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
                                      ariaLabel="Cancel changes"
                                      onClick={() => cancelMembershipEdits(membership.id)}
                                    >
                                      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <path
                                          d="M4.5 4.5L11.5 11.5"
                                          stroke="currentColor"
                                          strokeWidth="1.5"
                                          strokeLinecap="round"
                                        />
                                        <path
                                          d="M11.5 4.5L4.5 11.5"
                                          stroke="currentColor"
                                          strokeWidth="1.5"
                                          strokeLinecap="round"
                                        />
                                      </svg>
                                    </IconButton>
                  {membership.game_accounts?.id ? (
                    <IconButton
                      ariaLabel="Delete game account"
                      onClick={() =>
                        openGameAccountDeleteConfirm({
                          id: membership.game_accounts?.id ?? "",
                          user_id: membership.game_accounts?.user_id ?? "",
                          game_username: membership.game_accounts?.game_username ?? "",
                        })
                      }
                      variant="danger"
                    >
                      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M3.5 5.5H12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        <path d="M6 5.5V4C6 3.4 6.4 3 7 3H9C9.6 3 10 3.4 10 4V5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        <path d="M5.2 5.5L5.6 12C5.6 12.6 6.1 13 6.7 13H9.3C9.9 13 10.4 12.6 10.4 12L10.8 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                    </IconButton>
                  ) : null}
                                    {membershipErrors[membership.id] ? (
                                      <span className="text-muted">{membershipErrors[membership.id]}</span>
                                    ) : null}
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
                      <div style={{ gridColumn: "1 / -1" }}>
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
      </section>
      ) : null}
      {activeSection === "validation" ? (
      <section className="card" style={{ gridColumn: "span 12" }}>
        <div className="card-header">
          <div>
            <div className="card-title">Validation Rules</div>
            <div className="card-subtitle">Exact match validation</div>
          </div>
        </div>
        <div className="rule-bar">
          <div className="tabs">
            {ruleFieldOptions.map((field) => (
              <button
                key={field}
                className={`tab ${validationListField === field ? "active" : ""}`}
                type="button"
                onClick={() => {
                  setValidationListField(field);
                  setValidationField(field);
                  handleCancelValidationEdit();
                  setValidationPage(1);
                }}
              >
                {formatLabel(field)}
              </button>
            ))}
          </div>
          <div className="list inline action-icons">
            <IconButton ariaLabel="Add rule" onClick={handleCreateValidationRow}>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3.5V12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M3.5 8H12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </IconButton>
            <IconButton ariaLabel="Backup Rules List" onClick={handleBackupValidationList}>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 4.5H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M4.5 4.5V12C4.5 12.6 5 13 5.6 13H10.4C11 13 11.5 12.6 11.5 12V4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M6.5 7.5H9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </IconButton>
            <span className="rule-bar-separator" aria-hidden="true" />
            <IconButton ariaLabel="Import Rules List" onClick={() => setIsValidationImportOpen(true)}>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 11.5H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M8 3.5V10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M5.5 8L8 10.5L10.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </IconButton>
            <IconButton ariaLabel="Export Rules List" onClick={handleExportValidationList}>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 12.5H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M8 12V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M5.5 6.5L8 4L10.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </IconButton>
            <span className="rule-bar-separator" aria-hidden="true" />
            <IconButton
              ariaLabel="Delete selected rules"
              onClick={openValidationDeleteConfirm}
              variant="danger"
              disabled={validationSelectedIds.length === 0}
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3.5 5.5H12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                <path d="M6 5.5V4C6 3.4 6.4 3 7 3H9C9.6 3 10 3.4 10 4V5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                <path d="M5.2 5.5L5.6 12C5.6 12.6 6.1 13 6.7 13H9.3C9.9 13 10.4 12.6 10.4 12L10.8 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </IconButton>
          </div>
        </div>
        {validationImportStatus ? <div className="alert info">{validationImportStatus}</div> : null}
        <div className="list inline admin-members-filters filter-bar" style={{ alignItems: "center", flexWrap: "wrap" }}>
          <SearchInput
            id="validationSearch"
            label="Search"
            value={validationSearch}
            onChange={(value) => {
              setValidationSearch(value);
              setValidationPage(1);
            }}
            placeholder="Value or status"
          />
          <LabeledSelect
            id="validationStatusFilter"
            label="Status"
            value={validationStatusFilter}
            onValueChange={(value) => {
              setValidationStatusFilter(value);
              setValidationPage(1);
            }}
            options={[
              { value: "all", label: "All" },
              { value: "valid", label: "valid" },
              { value: "invalid", label: "invalid" },
            ]}
          />
          <LabeledSelect
            id="validationSort"
            label="Sort"
            value={validationSortKey}
            onValueChange={(value) => {
              setValidationSortKey(value as "field" | "status" | "match_value");
              setValidationPage(1);
            }}
            options={validationSortOptions.map((option) => ({ value: option.value, label: option.label }))}
          />
          <RadixSelect
            ariaLabel="Validation sort direction"
            value={validationSortDirection}
            onValueChange={(value) => {
              setValidationSortDirection(value as "asc" | "desc");
              setValidationPage(1);
            }}
            options={[
              { value: "asc", label: "Asc" },
              { value: "desc", label: "Desc" },
            ]}
          />
          <button
            className="button"
            type="button"
            onClick={() => {
              setValidationSearch("");
              setValidationStatusFilter("all");
              setValidationSortKey("field");
              setValidationSortDirection("asc");
              setValidationPageSize(50);
              setValidationPage(1);
            }}
          >
            Reset
          </button>
          <span className="text-muted">
            {formatLabel(validationListField)} rules: {activeValidationCounts.total} ({activeValidationCounts.active} active)
            {validationSelectedIds.length > 0 ? ` • ${validationSelectedIds.length} selected` : ""}
          </span>
        </div>
        {filteredValidationRules.length > 0 ? (
          <div className="pagination-bar table-pagination">
            <div className="pagination-page-size">
              <label htmlFor="validationPageSize" className="text-muted">
                Page size
              </label>
              <RadixSelect
                id="validationPageSize"
                ariaLabel="Page size"
                value={String(validationPageSize)}
                onValueChange={(value) => {
                  setValidationPageSize(Number(value));
                  setValidationPage(1);
                }}
                options={[
                  { value: "25", label: "25" },
                  { value: "50", label: "50" },
                  { value: "100", label: "100" },
                  { value: "250", label: "250" },
                ]}
              />
            </div>
            <span className="text-muted">
              Showing {filteredValidationRules.length === 0 ? 0 : (validationPage - 1) * validationPageSize + 1}–
              {Math.min(validationPage * validationPageSize, filteredValidationRules.length)} of {filteredValidationRules.length}
            </span>
            <div className="pagination-actions">
              <div className="pagination-page-indicator">
                <label htmlFor="validationPageJump" className="text-muted">
                  Page
                </label>
                <input
                  id="validationPageJump"
                  className="pagination-page-input"
                  type="number"
                  min={1}
                  max={validationTotalPages}
                  value={validationPage}
                  onChange={(event) => {
                    const nextPage = clampPageValue(event.target.value, validationTotalPages);
                    if (nextPage !== null) {
                      setValidationPage(nextPage);
                    }
                  }}
                />
                <span className="text-muted">/ {validationTotalPages}</span>
              </div>
              <IconButton
                ariaLabel="Previous page"
                onClick={() => setValidationPage((current) => Math.max(1, current - 1))}
                disabled={validationPage === 1}
              >
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M10 3L6 8L10 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </IconButton>
              <IconButton
                ariaLabel="Next page"
                onClick={() => setValidationPage((current) => current + 1)}
                disabled={validationPage >= validationTotalPages}
              >
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 3L10 8L6 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </IconButton>
            </div>
          </div>
        ) : null}
        <TableScroll>
          <div className="table validation-list">
          <header>
            <span>#</span>
            <span>
              <input
                type="checkbox"
                ref={validationSelectAllRef}
                checked={areAllValidationRowsSelected}
                onChange={toggleValidationSelectAll}
                aria-label="Select all rules on this page"
              />
            </span>
            <span>{renderValidationSortButton("Value", "match_value")}</span>
            <span>{renderValidationSortButton("Status", "status")}</span>
            <span>Actions</span>
          </header>
          {[
            ...(validationEditingId === NEW_VALIDATION_ID
              ? [
                  {
                    id: NEW_VALIDATION_ID,
                    field: validationField,
                    match_value: validationMatch,
                    status: validationStatus,
                  },
                ]
              : []),
            ...pagedValidationRules,
          ].length === 0 ? (
            <div className="row">
              <span />
              <span />
              <span>No validation entries</span>
              <span />
              <span />
            </div>
          ) : filteredValidationRules.length === 0 && validationEditingId !== NEW_VALIDATION_ID ? (
            <div className="row">
              <span />
              <span />
              <span>No entries match the filters</span>
              <span />
              <span />
            </div>
          ) : (
            [
              ...(validationEditingId === NEW_VALIDATION_ID
                ? [
                    {
                      id: NEW_VALIDATION_ID,
                      field: validationField,
                      match_value: validationMatch,
                      status: validationStatus,
                    },
                  ]
                : []),
              ...pagedValidationRules,
            ].map((rule, index) => {
              const isEditing = validationEditingId === rule.id;
              const isSelectable = rule.id !== NEW_VALIDATION_ID;
              const isSelected = isSelectable && validationSelectedSet.has(rule.id);
              const rowNumber = (validationPage - 1) * validationPageSize + index + 1;
              return (
                <div className={`row ${isSelected ? "selected" : ""}`.trim()} key={rule.id}>
                  <span className="text-muted">{rowNumber}</span>
                  <span>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={isSelectable ? () => toggleValidationSelect(rule.id) : undefined}
                      disabled={!isSelectable}
                      aria-label="Select rule"
                    />
                  </span>
                  {isEditing ? (
                    <input
                      value={validationMatch}
                      onChange={(event) => setValidationMatch(event.target.value)}
                    />
                  ) : (
                    <span>{rule.match_value}</span>
                  )}
                  {isEditing ? (
                    <RadixSelect
                      ariaLabel="Status"
                      value={validationStatus}
                      onValueChange={(value) => setValidationStatus(value)}
                      options={[
                        { value: "valid", label: "valid" },
                        { value: "invalid", label: "invalid" },
                      ]}
                    />
                  ) : (
                    <span className="badge">{rule.status ?? "active"}</span>
                  )}
                  <div className="list inline action-icons">
                    {isEditing ? (
                      <>
                        <IconButton ariaLabel="Save changes" onClick={handleSaveValidationRow}>
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
                        <IconButton ariaLabel="Cancel changes" onClick={handleCancelValidationEdit}>
                          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M4.5 4.5L11.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            <path d="M11.5 4.5L4.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </IconButton>
                      </>
                    ) : (
                      <>
                        <IconButton ariaLabel="Edit rule" onClick={() => handleEditValidationRule(rule)}>
                          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M3 11.5L11.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            <path d="M3 13H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </IconButton>
                        <IconButton ariaLabel="Delete rule" onClick={() => handleDeleteValidationRule(rule.id)} variant="danger">
                          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M3.5 5.5H12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                            <path d="M6 5.5V4C6 3.4 6.4 3 7 3H9C9.6 3 10 3.4 10 4V5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                            <path d="M5.2 5.5L5.6 12C5.6 12.6 6.1 13 6.7 13H9.3C9.9 13 10.4 12.6 10.4 12L10.8 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                          </svg>
                        </IconButton>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
          </div>
        </TableScroll>
      </section>
      ) : null}
      {activeSection === "corrections" ? (
      <section className="card" style={{ gridColumn: "span 12" }}>
        <div className="card-header">
          <div>
            <div className="card-title">Correction Rules</div>
            <div className="card-subtitle">Automatic value replacement</div>
          </div>
        </div>
        <div className="rule-bar">
          <div className="tabs">
            {correctionFieldOptions.map((field) => (
              <button
                key={field}
                className={`tab ${correctionListField === field ? "active" : ""}`}
                type="button"
                onClick={() => {
                  setCorrectionListField(field);
                  setCorrectionField(field);
                  handleCancelCorrectionEdit();
                  setCorrectionPage(1);
                }}
              >
                {field === "all" ? "All" : formatLabel(field)}
              </button>
            ))}
          </div>
          <div className="list inline action-icons">
            <IconButton ariaLabel="Add rule" onClick={handleCreateCorrectionRow}>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3.5V12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M3.5 8H12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </IconButton>
            <IconButton ariaLabel="Backup Rules List" onClick={handleBackupCorrectionList}>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 4.5H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M4.5 4.5V12C4.5 12.6 5 13 5.6 13H10.4C11 13 11.5 12.6 11.5 12V4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M6.5 7.5H9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </IconButton>
            <span className="rule-bar-separator" aria-hidden="true" />
            <IconButton ariaLabel="Import Rules List" onClick={() => setIsCorrectionImportOpen(true)}>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 11.5H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M8 3.5V10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M5.5 8L8 10.5L10.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </IconButton>
            <IconButton ariaLabel="Export Rules List" onClick={handleExportCorrectionList}>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 12.5H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M8 12V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M5.5 6.5L8 4L10.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </IconButton>
            <span className="rule-bar-separator" aria-hidden="true" />
            <IconButton
              ariaLabel="Delete selected rules"
              onClick={openCorrectionDeleteConfirm}
              variant="danger"
              disabled={correctionSelectedIds.length === 0}
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3.5 5.5H12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                <path d="M6 5.5V4C6 3.4 6.4 3 7 3H9C9.6 3 10 3.4 10 4V5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                <path d="M5.2 5.5L5.6 12C5.6 12.6 6.1 13 6.7 13H9.3C9.9 13 10.4 12.6 10.4 12L10.8 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </IconButton>
          </div>
        </div>
        {correctionImportStatus ? <div className="alert info">{correctionImportStatus}</div> : null}
        <div className="list inline admin-members-filters filter-bar" style={{ alignItems: "center", flexWrap: "wrap" }}>
          <SearchInput
            id="correctionSearch"
            label="Search"
            value={correctionSearch}
            onChange={(value) => {
              setCorrectionSearch(value);
              setCorrectionPage(1);
            }}
            placeholder="Match or replacement"
          />
          <LabeledSelect
            id="correctionStatusFilter"
            label="Status"
            value={correctionStatusFilter}
            onValueChange={(value) => {
              setCorrectionStatusFilter(value);
              setCorrectionPage(1);
            }}
            options={[
              { value: "all", label: "All" },
              { value: "active", label: "active" },
              { value: "inactive", label: "inactive" },
            ]}
          />
          <LabeledSelect
            id="correctionSort"
            label="Sort"
            value={correctionSortKey}
            onValueChange={(value) => {
              setCorrectionSortKey(value as "field" | "match_value" | "replacement_value" | "status");
              setCorrectionPage(1);
            }}
            options={correctionSortOptions.map((option) => ({ value: option.value, label: option.label }))}
          />
          <RadixSelect
            ariaLabel="Correction sort direction"
            value={correctionSortDirection}
            onValueChange={(value) => {
              setCorrectionSortDirection(value as "asc" | "desc");
              setCorrectionPage(1);
            }}
            options={[
              { value: "asc", label: "Asc" },
              { value: "desc", label: "Desc" },
            ]}
          />
          <button
            className="button"
            type="button"
            onClick={() => {
              setCorrectionSearch("");
              setCorrectionStatusFilter("all");
              setCorrectionSortKey("field");
              setCorrectionSortDirection("asc");
              setCorrectionPageSize(50);
              setCorrectionPage(1);
            }}
          >
            Reset
          </button>
          <span className="text-muted">
            {correctionListField === "all" ? "All" : formatLabel(correctionListField)} corrections:{" "}
            {activeCorrectionCounts.total} ({activeCorrectionCounts.active} active)
            {correctionSelectedIds.length > 0 ? ` • ${correctionSelectedIds.length} selected` : ""}
          </span>
        </div>
        {filteredCorrectionRules.length > 0 ? (
          <div className="pagination-bar table-pagination">
            <div className="pagination-page-size">
              <label htmlFor="correctionPageSize" className="text-muted">
                Page size
              </label>
              <RadixSelect
                id="correctionPageSize"
                ariaLabel="Page size"
                value={String(correctionPageSize)}
                onValueChange={(value) => {
                  setCorrectionPageSize(Number(value));
                  setCorrectionPage(1);
                }}
                options={[
                  { value: "25", label: "25" },
                  { value: "50", label: "50" },
                  { value: "100", label: "100" },
                  { value: "250", label: "250" },
                ]}
              />
            </div>
            <span className="text-muted">
              Showing {filteredCorrectionRules.length === 0 ? 0 : (correctionPage - 1) * correctionPageSize + 1}–
              {Math.min(correctionPage * correctionPageSize, filteredCorrectionRules.length)} of {filteredCorrectionRules.length}
            </span>
            <div className="pagination-actions">
              <div className="pagination-page-indicator">
                <label htmlFor="correctionPageJump" className="text-muted">
                  Page
                </label>
                <input
                  id="correctionPageJump"
                  className="pagination-page-input"
                  type="number"
                  min={1}
                  max={correctionTotalPages}
                  value={correctionPage}
                  onChange={(event) => {
                    const nextPage = clampPageValue(event.target.value, correctionTotalPages);
                    if (nextPage !== null) {
                      setCorrectionPage(nextPage);
                    }
                  }}
                />
                <span className="text-muted">/ {correctionTotalPages}</span>
              </div>
              <IconButton
                ariaLabel="Previous page"
                onClick={() => setCorrectionPage((current) => Math.max(1, current - 1))}
                disabled={correctionPage === 1}
              >
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M10 3L6 8L10 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </IconButton>
              <IconButton
                ariaLabel="Next page"
                onClick={() => setCorrectionPage((current) => current + 1)}
                disabled={correctionPage >= correctionTotalPages}
              >
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 3L10 8L6 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </IconButton>
            </div>
          </div>
        ) : null}
        <TableScroll>
          <div className="table correction-list">
          <header>
            <span>#</span>
            <span>
              <input
                type="checkbox"
                ref={correctionSelectAllRef}
                checked={areAllCorrectionRowsSelected}
                onChange={toggleCorrectionSelectAll}
                aria-label="Select all rules on this page"
              />
            </span>
            <span>{renderCorrectionSortButton("Match", "match_value")}</span>
            <span>{renderCorrectionSortButton("Replacement", "replacement_value")}</span>
            <span>{renderCorrectionSortButton("Status", "status")}</span>
            <span>Actions</span>
          </header>
          {[
            ...(correctionEditingId === NEW_CORRECTION_ID
              ? [
                  {
                    id: NEW_CORRECTION_ID,
                    field: correctionField,
                    match_value: correctionMatch,
                    replacement_value: correctionReplacement,
                    status: correctionStatus,
                  },
                ]
              : []),
            ...pagedCorrectionRules,
          ].length === 0 ? (
            <div className="row">
              <span />
              <span />
              <span>No correction entries</span>
              <span />
              <span />
              <span />
            </div>
          ) : filteredCorrectionRules.length === 0 && correctionEditingId !== NEW_CORRECTION_ID ? (
            <div className="row">
              <span />
              <span />
              <span>No entries match the filters</span>
              <span />
              <span />
              <span />
            </div>
          ) : (
            [
              ...(correctionEditingId === NEW_CORRECTION_ID
                ? [
                    {
                      id: NEW_CORRECTION_ID,
                      field: correctionField,
                      match_value: correctionMatch,
                      replacement_value: correctionReplacement,
                      status: correctionStatus,
                    },
                  ]
                : []),
              ...pagedCorrectionRules,
            ].map((rule, index) => {
              const isEditing = correctionEditingId === rule.id;
              const isSelectable = rule.id !== NEW_CORRECTION_ID;
              const isSelected = isSelectable && correctionSelectedSet.has(rule.id);
              const rowNumber = (correctionPage - 1) * correctionPageSize + index + 1;
              return (
                <div className={`row ${isSelected ? "selected" : ""}`.trim()} key={rule.id}>
                  <span className="text-muted">{rowNumber}</span>
                  <span>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={isSelectable ? () => toggleCorrectionSelect(rule.id) : undefined}
                      disabled={!isSelectable}
                      aria-label="Select rule"
                    />
                  </span>
                  {isEditing ? (
                    <input
                      value={correctionMatch}
                      onChange={(event) => setCorrectionMatch(event.target.value)}
                    />
                  ) : (
                    <span>{rule.match_value}</span>
                  )}
                  {isEditing ? (
                    <input
                      value={correctionReplacement}
                      onChange={(event) => setCorrectionReplacement(event.target.value)}
                    />
                  ) : (
                    <span>{rule.replacement_value}</span>
                  )}
                  {isEditing ? (
                    <RadixSelect
                      ariaLabel="Status"
                      value={correctionStatus}
                      onValueChange={(value) => setCorrectionStatus(value)}
                      options={[
                        { value: "active", label: "active" },
                        { value: "inactive", label: "inactive" },
                      ]}
                    />
                  ) : (
                    <span className="badge">{rule.status}</span>
                  )}
                  <div className="list inline action-icons">
                    {isEditing ? (
                      <>
                        <IconButton ariaLabel="Save changes" onClick={handleSaveCorrectionRow}>
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
                        <IconButton ariaLabel="Cancel changes" onClick={handleCancelCorrectionEdit}>
                          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M4.5 4.5L11.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            <path d="M11.5 4.5L4.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </IconButton>
                      </>
                    ) : (
                      <>
                        <IconButton ariaLabel="Edit rule" onClick={() => handleEditCorrectionRule(rule)}>
                          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M3 11.5L11.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            <path d="M3 13H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </IconButton>
                        <IconButton ariaLabel="Delete rule" onClick={() => handleDeleteCorrectionRule(rule.id)} variant="danger">
                          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M3.5 5.5H12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                            <path d="M6 5.5V4C6 3.4 6.4 3 7 3H9C9.6 3 10 3.4 10 4V5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                            <path d="M5.2 5.5L5.6 12C5.6 12.6 6.1 13 6.7 13H9.3C9.9 13 10.4 12.6 10.4 12L10.8 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                          </svg>
                        </IconButton>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
          </div>
        </TableScroll>
      </section>
      ) : null}
      {activeSection === "logs" ? (
      <section className="card" style={{ gridColumn: "span 12" }}>
        <div className="card-header">
          <div>
            <div className="card-title">Audit Logs</div>
            <div className="card-subtitle">Latest clan activity</div>
          </div>
          <span className="badge">{auditTotalCount} total</span>
        </div>
        <div className="list inline admin-members-filters filter-bar" style={{ alignItems: "center", flexWrap: "wrap" }}>
          <SearchInput
            id="auditSearch"
            label="Search"
            value={auditSearch}
            onChange={setAuditSearch}
            placeholder="Action, entity, or id"
          />
          <LabeledSelect
            id="auditClanFilter"
            label="Clan"
            value={auditClanFilter || "all"}
            onValueChange={(value) => setAuditClanFilter(value)}
            options={[
              { value: "all", label: "All" },
              ...clans.map((clan) => ({ value: clan.id, label: clan.name })),
            ]}
          />
          <LabeledSelect
            id="auditActionFilter"
            label="Action"
            value={auditActionFilter}
            onValueChange={(value) => setAuditActionFilter(value)}
            options={[
              { value: "all", label: "All" },
              ...auditActionOptions.map((option) => ({ value: option, label: option })),
            ]}
          />
          <LabeledSelect
            id="auditEntityFilter"
            label="Entity"
            value={auditEntityFilter}
            onValueChange={(value) => setAuditEntityFilter(value)}
            options={[
              { value: "all", label: "All" },
              ...auditEntityOptions.map((option) => ({ value: option, label: option })),
            ]}
          />
          <LabeledSelect
            id="auditActorFilter"
            label="Actor"
            value={auditActorFilter}
            onValueChange={(value) => setAuditActorFilter(value)}
            options={[
              { value: "all", label: "All" },
              ...auditActorOptions.map((actorId) => ({
                value: actorId,
                label: getAuditActorLabel(actorId),
              })),
            ]}
          />
          <button
            className="button"
            type="button"
            onClick={() => {
              setAuditSearch("");
              setAuditClanFilter("all");
              setAuditActionFilter("all");
              setAuditEntityFilter("all");
              setAuditActorFilter("all");
              setAuditPage(1);
            }}
          >
            Reset
          </button>
          <span className="text-muted">
            {auditLogs.length} shown
          </span>
        </div>
        {auditTotalCount > 0 ? (
          <div className="pagination-bar table-pagination">
            <div className="pagination-page-size">
              <label htmlFor="auditPageSize" className="text-muted">
                Page size
              </label>
              <RadixSelect
                id="auditPageSize"
                ariaLabel="Page size"
                value={String(auditPageSize)}
                onValueChange={(value) => {
                  setAuditPageSize(Number(value));
                  setAuditPage(1);
                }}
                options={[
                  { value: "25", label: "25" },
                  { value: "50", label: "50" },
                  { value: "100", label: "100" },
                  { value: "250", label: "250" },
                ]}
              />
            </div>
            <span className="text-muted">
              Showing {auditTotalCount === 0 ? 0 : (auditPage - 1) * auditPageSize + 1}–
              {Math.min(auditPage * auditPageSize, auditTotalCount)} of {auditTotalCount}
            </span>
            <div className="pagination-actions">
              <div className="pagination-page-indicator">
                <label htmlFor="auditPageJump" className="text-muted">
                  Page
                </label>
                <input
                  id="auditPageJump"
                  className="pagination-page-input"
                  type="number"
                  min={1}
                  max={auditTotalPages}
                  value={auditPage}
                  onChange={(event) => {
                    const nextPage = clampPageValue(event.target.value, auditTotalPages);
                    if (nextPage !== null) {
                      setAuditPage(nextPage);
                    }
                  }}
                />
                <span className="text-muted">/ {auditTotalPages}</span>
              </div>
              <IconButton
                ariaLabel="Previous page"
                onClick={() => setAuditPage((current) => Math.max(1, current - 1))}
                disabled={auditPage === 1}
              >
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M10 3L6 8L10 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </IconButton>
              <IconButton
                ariaLabel="Next page"
                onClick={() => setAuditPage((current) => current + 1)}
                disabled={auditPage >= auditTotalPages}
              >
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 3L10 8L6 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </IconButton>
            </div>
          </div>
        ) : null}
        <div className="list">
          {auditLogs.length === 0 ? (
            <div className="list-item">
              <span>No audit entries yet</span>
              <span className="badge">Make a change</span>
            </div>
          ) : (
            auditLogs.map((entry) => (
              <div className="list-item" key={entry.id}>
                <div>
                  <div>
                    {entry.action} • {entry.entity}
                  </div>
                  <div className="text-muted">
                    {getAuditActorLabel(entry.actor_id)} • {formatAuditTimestamp(entry.created_at)}
                  </div>
                </div>
                <div className="list">
                  <span className="badge">{getAuditDiffSummary(entry.diff)}</span>
                  <span className="text-muted">{entry.entity_id.slice(0, 8)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
      ) : null}
      {isCorrectionDeleteConfirmOpen ? (
        <div className="modal-backdrop">
          <div className="modal card danger">
            <div className="card-header">
              <div>
                <div className="danger-label">Danger Zone</div>
                <div className="card-title">Delete selected rules</div>
                <div className="card-subtitle">This action cannot be undone.</div>
              </div>
            </div>
            <div className="list">
              <div className="alert danger">
                This will permanently delete the selected correction rules.
              </div>
            </div>
            <div className="list inline">
              <button className="button danger" type="button" onClick={openCorrectionDeleteInput}>
                Continue
              </button>
              <button className="button" type="button" onClick={closeCorrectionDeleteConfirm}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {isCorrectionDeleteInputOpen ? (
        <div className="modal-backdrop">
          <div className="modal card danger">
            <div className="card-header">
              <div>
                <div className="danger-label">Danger Zone</div>
                <div className="card-title">Confirm deletion</div>
                <div className="card-subtitle">This action cannot be undone.</div>
              </div>
            </div>
            <div className="alert danger">
              Deleting these rules will remove them permanently. Make sure you intend to proceed.
            </div>
            <div className="form-group">
              <label htmlFor="correctionDeleteInput">Confirmation phrase</label>
              <input
                id="correctionDeleteInput"
                value={correctionDeleteInput}
                onChange={(event) => setCorrectionDeleteInput(event.target.value)}
                placeholder="DELETE RULES"
              />
            </div>
            <div className="list inline">
              <button className="button danger" type="button" onClick={handleDeleteSelectedCorrectionRules}>
                Delete Rules
              </button>
              <button className="button" type="button" onClick={closeCorrectionDeleteInput}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {isCorrectionImportOpen ? (
        <div className="modal-backdrop">
          <div className="modal card wide">
            <div className="card-header">
              <div>
                <div className="card-title">Import correction list</div>
                <div className="card-subtitle">Upload Match,Replacement,Field,Status</div>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>File</label>
                <input
                  id="correctionImportFile"
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleImportCorrectionList}
                  style={{ display: "none" }}
                />
                <div className="list inline" style={{ alignItems: "center" }}>
                  <label className="button" htmlFor="correctionImportFile">
                    Choose file
                  </label>
                  <span className="text-muted">{correctionImportFileName || "No file selected"}</span>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="correctionImportMode">Mode</label>
                <RadixSelect
                  id="correctionImportMode"
                  ariaLabel="Import mode"
                  value={correctionImportMode}
                  onValueChange={(value) => setCorrectionImportMode(value as "append" | "replace")}
                  triggerClassName="select-trigger compact"
                  options={[
                    { value: "append", label: "Append" },
                    { value: "replace", label: "Replace" },
                  ]}
                />
              </div>
              <div className="form-group">
                <label htmlFor="correctionIgnoreDuplicates">Ignore duplicates</label>
                <div className="list inline" style={{ alignItems: "center" }}>
                  <input
                    id="correctionIgnoreDuplicates"
                    type="checkbox"
                    checked={correctionIgnoreDuplicates}
                    onChange={(event) => setCorrectionIgnoreDuplicates(event.target.checked)}
                  />
                </div>
              </div>
            </div>
            {correctionImportErrors.length > 0 ? (
              <div className="alert danger">{correctionImportErrors.slice(0, 3).join(" ")}</div>
            ) : null}
            <div className="list-item">
              <span>Imported entries</span>
              <span className="badge">{correctionImportEntries.length}</span>
            </div>
            {correctionImportSelected.length > 0 ? (
              <div className="list-item">
                <span>Selected entries</span>
                <span className="badge">{correctionImportSelected.length}</span>
              </div>
            ) : null}
            <div className="validation-import-table">
              <div className="table correction-import-list">
                <header>
                  <span>#</span>
                  <span>Select</span>
                  <span>Match</span>
                  <span>Replacement</span>
                  <span>Status</span>
                  <span>Field</span>
                </header>
                {correctionImportEntries.length === 0 ? (
                  <div className="row">
                    <span>No entries loaded</span>
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                ) : (
                  correctionImportEntries.map((entry, index) => (
                    <div className="row" key={`${entry.field}-${entry.match_value}-${entry.replacement_value}-${index}`}>
                      <span className="text-muted">{index + 1}</span>
                      <input
                        type="checkbox"
                        checked={correctionImportSelected.includes(index)}
                        onChange={() => toggleCorrectionImportSelected(index)}
                      />
                      <input
                        value={entry.match_value ?? ""}
                        onChange={(event) => handleUpdateCorrectionImportEntry(index, "match_value", event.target.value)}
                      />
                      <input
                        value={entry.replacement_value ?? ""}
                        onChange={(event) =>
                          handleUpdateCorrectionImportEntry(index, "replacement_value", event.target.value)
                        }
                      />
                      <RadixSelect
                        ariaLabel="Status"
                        value={entry.status ?? "active"}
                        onValueChange={(value) => handleUpdateCorrectionImportEntry(index, "status", value)}
                        triggerClassName="select-trigger compact"
                        options={[
                          { value: "active", label: "active" },
                          { value: "inactive", label: "inactive" },
                        ]}
                      />
                      <span>{entry.field === "all" ? "All" : formatLabel(entry.field ?? "")}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="list inline" style={{ justifyContent: "space-between", flexWrap: "wrap", marginTop: "16px" }}>
              <button
                className="button danger"
                type="button"
                onClick={handleRemoveSelectedCorrectionImportEntries}
                disabled={correctionImportSelected.length === 0}
              >
                Delete selected
              </button>
              <div className="list inline">
                <button className="button" type="button" onClick={handleCloseCorrectionImport}>
                  Cancel
                </button>
                <button className="button primary" type="button" onClick={handleApplyCorrectionImport}>
                  Apply import
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {isCorrectionReplaceConfirmOpen ? (
        <div className="modal-backdrop">
          <div className="modal card danger">
            <div className="card-header">
              <div>
                <div className="danger-label">Danger Zone</div>
                <div className="card-title">Replace correction list</div>
                <div className="card-subtitle">This action cannot be undone.</div>
              </div>
            </div>
            <div className="alert danger">
              This will delete all existing correction rules for this field before importing.
            </div>
            <div className="list inline">
              <button className="button danger" type="button" onClick={handleConfirmCorrectionReplaceImport}>
                Continue
              </button>
              <button className="button" type="button" onClick={() => setIsCorrectionReplaceConfirmOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {isValidationDeleteConfirmOpen ? (
        <div className="modal-backdrop">
          <div className="modal card danger">
            <div className="card-header">
              <div>
                <div className="danger-label">Danger Zone</div>
                <div className="card-title">Delete selected rules</div>
                <div className="card-subtitle">This action cannot be undone.</div>
              </div>
            </div>
            <div className="list">
              <div className="alert danger">
                This will permanently delete the selected validation rules.
              </div>
            </div>
            <div className="list inline">
              <button className="button danger" type="button" onClick={openValidationDeleteInput}>
                Continue
              </button>
              <button className="button" type="button" onClick={closeValidationDeleteConfirm}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {isValidationDeleteInputOpen ? (
        <div className="modal-backdrop">
          <div className="modal card danger">
            <div className="card-header">
              <div>
                <div className="danger-label">Danger Zone</div>
                <div className="card-title">Confirm deletion</div>
                <div className="card-subtitle">This action cannot be undone.</div>
              </div>
            </div>
            <div className="alert danger">
              Deleting these rules will remove them permanently. Make sure you intend to proceed.
            </div>
            <div className="form-group">
              <label htmlFor="validationDeleteInput">Confirmation phrase</label>
              <input
                id="validationDeleteInput"
                value={validationDeleteInput}
                onChange={(event) => setValidationDeleteInput(event.target.value)}
                placeholder="DELETE RULES"
              />
            </div>
            <div className="list inline">
              <button className="button danger" type="button" onClick={handleDeleteSelectedValidationRules}>
                Delete Rules
              </button>
              <button className="button" type="button" onClick={closeValidationDeleteInput}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {isValidationImportOpen ? (
        <div className="modal-backdrop">
          <div className="modal card wide">
            <div className="card-header">
              <div>
                <div className="card-title">Import validation list</div>
                <div className="card-subtitle">Upload one value per line or Value,Status</div>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>File</label>
                <input
                  id="validationImportFile"
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleImportValidationList}
                  style={{ display: "none" }}
                />
                <div className="list inline" style={{ alignItems: "center" }}>
                  <label className="button" htmlFor="validationImportFile">
                    Choose file
                  </label>
                  <span className="text-muted">{validationImportFileName || "No file selected"}</span>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="validationImportMode">Mode</label>
                <RadixSelect
                  id="validationImportMode"
                  ariaLabel="Import mode"
                  value={validationImportMode}
                  onValueChange={(value) => setValidationImportMode(value as "append" | "replace")}
                  triggerClassName="select-trigger compact"
                  options={[
                    { value: "append", label: "Append" },
                    { value: "replace", label: "Replace" },
                  ]}
                />
              </div>
              <div className="form-group">
                <label htmlFor="validationIgnoreDuplicates">Ignore duplicates</label>
                <div className="list inline" style={{ alignItems: "center" }}>
                  <input
                    id="validationIgnoreDuplicates"
                    type="checkbox"
                    checked={validationIgnoreDuplicates}
                    onChange={(event) => setValidationIgnoreDuplicates(event.target.checked)}
                  />
                </div>
              </div>
            </div>
            {validationImportErrors.length > 0 ? (
              <div className="alert danger">{validationImportErrors.slice(0, 3).join(" ")}</div>
            ) : null}
            <div className="list-item">
              <span>Imported entries</span>
              <span className="badge">{validationImportEntries.length}</span>
            </div>
            {validationImportSelected.length > 0 ? (
              <div className="list-item">
                <span>Selected entries</span>
                <span className="badge">{validationImportSelected.length}</span>
              </div>
            ) : null}
            <div className="validation-import-table">
              <div className="table validation-import-list">
                <header>
                  <span>#</span>
                  <span>Select</span>
                  <span>Value</span>
                  <span>Status</span>
                  <span>Field</span>
                </header>
                {validationImportEntries.length === 0 ? (
                  <div className="row">
                    <span>No entries loaded</span>
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                ) : (
                  validationImportEntries.map((entry, index) => (
                    <div className="row" key={`${entry.field}-${entry.match_value}-${index}`}>
                      <span className="text-muted">{index + 1}</span>
                      <input
                        type="checkbox"
                        checked={validationImportSelected.includes(index)}
                        onChange={() => toggleValidationImportSelected(index)}
                      />
                      <input
                        value={entry.match_value ?? ""}
                        onChange={(event) => handleUpdateImportEntry(index, "match_value", event.target.value)}
                      />
                      <RadixSelect
                        ariaLabel="Status"
                        value={entry.status ?? "valid"}
                        onValueChange={(value) => handleUpdateImportEntry(index, "status", value)}
                        triggerClassName="select-trigger compact"
                        options={[
                          { value: "valid", label: "valid" },
                          { value: "invalid", label: "invalid" },
                        ]}
                      />
                      <span>{formatLabel(entry.field ?? "")}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="list inline" style={{ justifyContent: "space-between", flexWrap: "wrap", marginTop: "16px" }}>
              <button
                className="button danger"
                type="button"
                onClick={handleRemoveSelectedImportEntries}
                disabled={validationImportSelected.length === 0}
              >
                Delete selected
              </button>
              <div className="list inline">
                <button className="button primary" type="button" onClick={handleApplyValidationImport}>
                  Import
                </button>
                <button className="button" type="button" onClick={handleCloseValidationImport}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {isValidationReplaceConfirmOpen ? (
        <div className="modal-backdrop">
          <div className="modal card danger">
            <div className="card-header">
              <div>
                <div className="danger-label">Danger Zone</div>
                <div className="card-title">Replace validation list</div>
                <div className="card-subtitle">This will remove the current list before importing.</div>
              </div>
            </div>
            <div className="alert danger">
              Replace will delete all entries in the {formatLabel(validationListField)} list.
            </div>
            <div className="list inline">
              <button className="button danger" type="button" onClick={handleConfirmReplaceImport}>
                Replace List
              </button>
              <button className="button" type="button" onClick={() => setIsValidationReplaceConfirmOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {isClanModalOpen ? (
        <div className="modal-backdrop">
          <div className="modal card">
            <div className="card-header">
              <div>
                <div className="card-title">{clanModalMode === "edit" ? "Edit Clan" : "Create Clan"}</div>
                <div className="card-subtitle">Name and description</div>
              </div>
            </div>
            <form onSubmit={handleSaveClan}>
              <div className="form-group">
                <label htmlFor="clanModalName">Clan name</label>
                <input
                  id="clanModalName"
                  value={clanModalName}
                  onChange={(event) => setClanModalName(event.target.value)}
                  placeholder="The Chillers"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="clanModalDescription">Description</label>
                <input
                  id="clanModalDescription"
                  value={clanModalDescription}
                  onChange={(event) => setClanModalDescription(event.target.value)}
                  placeholder="Primary clan hub"
                />
              </div>
              <div className="list">
                <button className="button primary" type="submit">
                  {clanModalMode === "edit" ? "Save Changes" : "Create Clan"}
                </button>
                <button className="button" type="button" onClick={closeClanModal}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {isClanDeleteConfirmOpen ? (
        <div className="modal-backdrop">
          <div className="modal card danger">
            <div className="card-header">
              <div>
                <div className="danger-label">Danger Zone</div>
                <div className="card-title">Delete Clan</div>
                <div className="card-subtitle">This action cannot be undone.</div>
              </div>
            </div>
            <div className="list">
              <div className="alert danger">
                This will permanently delete <strong>{selectedClan?.name}</strong> and all related data.
              </div>
            </div>
            <div className="list inline">
              <button className="button danger" type="button" onClick={openClanDeleteInput}>
                Continue
              </button>
              <button className="button" type="button" onClick={closeClanDeleteConfirm}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {isClanDeleteInputOpen ? (
        <div className="modal-backdrop">
          <div className="modal card danger">
            <div className="card-header">
              <div>
                <div className="danger-label">Danger Zone</div>
                <div className="card-title">Confirm deletion</div>
                <div className="card-subtitle">This action cannot be undone.</div>
              </div>
            </div>
            <div className="alert danger">
              Deleting a clan removes all associated data. Make sure you intend to proceed.
            </div>
            <div className="form-group">
              <label htmlFor="clanDeleteInput">Confirmation phrase</label>
              <input
                id="clanDeleteInput"
                value={clanDeleteInput}
                onChange={(event) => setClanDeleteInput(event.target.value)}
                placeholder={`DELETE ${selectedClan?.name ?? ""}`}
              />
            </div>
            <div className="list inline">
              <button className="button danger" type="button" onClick={handleDeleteClan}>
                Delete Clan
              </button>
              <button className="button" type="button" onClick={closeClanDeleteInput}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {isUserDeleteConfirmOpen ? (
        <div className="modal-backdrop">
          <div className="modal card danger">
            <div className="card-header">
              <div>
                <div className="danger-label">Danger Zone</div>
                <div className="card-title">Delete User</div>
                <div className="card-subtitle">This action cannot be undone.</div>
              </div>
            </div>
            <div className="list">
              <div className="alert danger">
                This will permanently delete <strong>{userToDelete?.username ?? userToDelete?.email}</strong> and all related data.
              </div>
            </div>
            <div className="list inline">
              <button className="button danger" type="button" onClick={openUserDeleteInput}>
                Continue
              </button>
              <button className="button" type="button" onClick={closeUserDeleteConfirm}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {isUserDeleteInputOpen ? (
        <div className="modal-backdrop">
          <div className="modal card danger">
            <div className="card-header">
              <div>
                <div className="danger-label">Danger Zone</div>
                <div className="card-title">Confirm deletion</div>
                <div className="card-subtitle">This action cannot be undone.</div>
              </div>
            </div>
            <div className="alert danger">
              Deleting a user removes their profile, roles, and game accounts. Make sure you intend to proceed.
            </div>
            <div className="form-group">
              <label htmlFor="userDeleteInput">Confirmation phrase</label>
              <input
                id="userDeleteInput"
                value={userDeleteInput}
                onChange={(event) => setUserDeleteInput(event.target.value)}
                placeholder={`DELETE ${userToDelete?.username ?? userToDelete?.email ?? ""}`}
              />
            </div>
            <div className="list inline">
              <button className="button danger" type="button" onClick={handleDeleteUser}>
                Delete User
              </button>
              <button className="button" type="button" onClick={closeUserDeleteInput}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {isCreateUserModalOpen ? (
        <div className="modal-backdrop">
          <div className="modal card">
            <div className="card-header">
              <div>
                <div className="card-title">Create User</div>
                <div className="card-subtitle">An email invite will be sent to confirm registration.</div>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="createUserEmail">Email</label>
              <input
                id="createUserEmail"
                value={createUserEmail}
                onChange={(event) => setCreateUserEmail(event.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div className="form-group">
              <label htmlFor="createUserUsername">Username</label>
              <input
                id="createUserUsername"
                value={createUserUsername}
                onChange={(event) => setCreateUserUsername(event.target.value)}
                placeholder="username"
              />
            </div>
            <div className="form-group">
              <label htmlFor="createUserDisplayName">Nickname (optional)</label>
              <input
                id="createUserDisplayName"
                value={createUserDisplayName}
                onChange={(event) => setCreateUserDisplayName(event.target.value)}
                placeholder="Nickname"
              />
            </div>
            {createUserStatus ? <div className="alert info">{createUserStatus}</div> : null}
            <div className="list inline">
              <button className="button primary" type="button" onClick={handleCreateUser}>
                Send Invite
              </button>
              <button className="button" type="button" onClick={closeCreateUserModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {isCreateGameAccountModalOpen ? (
        <div className="modal-backdrop">
          <div className="modal card">
            <div className="card-header">
              <div>
                <div className="card-title">Add Game Account</div>
                <div className="card-subtitle">
                  {createGameAccountUser?.email ?? "Select a user"}
                </div>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="createGameAccountUsername">Game username</label>
              <input
                id="createGameAccountUsername"
                value={createGameAccountUsername}
                onChange={(event) => setCreateGameAccountUsername(event.target.value)}
                placeholder="Game username"
              />
            </div>
            <div className="form-group">
              <label htmlFor="createGameAccountClan">Clan</label>
              <RadixSelect
                id="createGameAccountClan"
                ariaLabel="Clan"
                value={createGameAccountClanId}
                onValueChange={(value) => setCreateGameAccountClanId(value)}
                options={clans.map((clan) => ({ value: clan.id, label: clan.name }))}
              />
            </div>
            <div className="form-group">
              <label htmlFor="createGameAccountRank">Rank</label>
              <RadixSelect
                id="createGameAccountRank"
                ariaLabel="Rank"
                value={createGameAccountRank}
                onValueChange={(value) => setCreateGameAccountRank(value)}
                options={rankOptions.map((rank) => ({ value: rank, label: formatLabel(rank) }))}
              />
            </div>
            <div className="form-group">
              <label htmlFor="createGameAccountStatus">Status</label>
              <RadixSelect
                id="createGameAccountStatus"
                ariaLabel="Status"
                value={createGameAccountStatus}
                onValueChange={(value) => setCreateGameAccountStatus(value)}
                options={[
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]}
              />
            </div>
            {createGameAccountMessage ? <div className="alert info">{createGameAccountMessage}</div> : null}
            <div className="list inline">
              <button className="button primary" type="button" onClick={handleCreateGameAccount}>
                Add Game Account
              </button>
              <button className="button" type="button" onClick={closeCreateGameAccountModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {isAssignAccountsModalOpen ? (
        <div className="modal-backdrop">
          <div className="modal card">
            <div className="card-header">
              <div>
                <div className="card-title">Assign Game Accounts</div>
                <div className="card-subtitle">
                  {selectedClan ? `Assign to ${selectedClan.name}` : "Select a clan"}
                </div>
              </div>
            </div>
            <div className="list inline admin-members-filters filter-bar" style={{ alignItems: "center" }}>
              <div className="form-group" style={{ minWidth: 240 }}>
                <SearchInput
                  id="assignSearch"
                  label="Search"
                  value={assignSearch}
                  onChange={setAssignSearch}
                  placeholder="Search accounts or users"
                />
              </div>
              <div className="form-group">
                <label htmlFor="assignFilter">Show</label>
                <RadixSelect
                  id="assignFilter"
                  ariaLabel="Show"
                  value={assignFilter}
                  onValueChange={(value) => setAssignFilter(value as "unassigned" | "current" | "other" | "all")}
                  options={[
                    { value: "unassigned", label: "Unassigned" },
                    { value: "current", label: "Current clan" },
                    { value: "other", label: "Other clans" },
                    { value: "all", label: "All" },
                  ]}
                />
              </div>
              <span className="text-muted">
                {assignSelectedIds.length} selected
              </span>
            </div>
            {assignStatus ? <div className="alert info">{assignStatus}</div> : null}
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
                    clans.find((clan) => clan.id === account.clan_id)?.name ??
                    (account.clan_id ? "Unknown clan" : "Unassigned");
                  const isSelected = assignSelectedIds.includes(account.id);
                  return (
                    <label key={account.id} className="list-item" style={{ cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleAssignSelection(account.id)}
                      />
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
              <button className="button primary" type="button" onClick={handleAssignAccounts}>
                Assign Selected
              </button>
              <button className="button" type="button" onClick={closeAssignAccountsModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {isGameAccountDeleteConfirmOpen ? (
        <div className="modal-backdrop">
          <div className="modal card danger">
            <div className="card-header">
              <div>
                <div className="danger-label">Danger Zone</div>
                <div className="card-title">Delete Game Account</div>
                <div className="card-subtitle">This action cannot be undone.</div>
              </div>
            </div>
            <div className="list">
              <div className="alert danger">
                This will permanently delete <strong>{gameAccountToDelete?.game_username}</strong> and all related data.
              </div>
            </div>
            <div className="list inline">
              <button className="button danger" type="button" onClick={openGameAccountDeleteInput}>
                Continue
              </button>
              <button className="button" type="button" onClick={closeGameAccountDeleteConfirm}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {isGameAccountDeleteInputOpen ? (
        <div className="modal-backdrop">
          <div className="modal card danger">
            <div className="card-header">
              <div>
                <div className="danger-label">Danger Zone</div>
                <div className="card-title">Confirm deletion</div>
                <div className="card-subtitle">This action cannot be undone.</div>
              </div>
            </div>
            <div className="alert danger">
              Deleting a game account removes its memberships and data. Make sure you intend to proceed.
            </div>
            <div className="form-group">
              <label htmlFor="gameAccountDeleteInput">Confirmation phrase</label>
              <input
                id="gameAccountDeleteInput"
                value={gameAccountDeleteInput}
                onChange={(event) => setGameAccountDeleteInput(event.target.value)}
                placeholder={`DELETE ${gameAccountToDelete?.game_username ?? ""}`}
              />
            </div>
            <div className="list inline">
              <button className="button danger" type="button" onClick={handleConfirmDeleteGameAccount}>
                Delete Game Account
              </button>
              <button className="button" type="button" onClick={closeGameAccountDeleteInput}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {status ? (
        <div className="alert info" style={{ gridColumn: "span 12" }}>
          {status}
        </div>
      ) : null}
    </div>
  );
}

export default AdminClient;
