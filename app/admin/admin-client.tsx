"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";
import { useToast } from "../components/toast-provider";

interface ClanRow {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
}

interface GameAccountRow {
  readonly id: string;
  readonly user_id: string;
  readonly game_username: string;
  readonly display_name: string | null;
}

interface MembershipRow {
  readonly id: string;
  readonly clan_id: string;
  readonly game_account_id: string;
  readonly role: string;
  readonly is_active: boolean;
  readonly rank: string | null;
  readonly game_accounts: GameAccountRow | null;
}

interface MembershipEditState {
  readonly role?: string;
  readonly is_active?: boolean;
  readonly rank?: string | null;
  readonly clan_id?: string;
  readonly display_name?: string;
  readonly game_username?: string;
}

interface ProfileRow {
  readonly id: string;
  readonly email: string;
  readonly display_name: string | null;
  readonly username: string | null;
  readonly username_display: string | null;
}

interface UserRow {
  readonly id: string;
  readonly email: string;
  readonly display_name: string | null;
  readonly username: string | null;
  readonly username_display: string | null;
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
const ruleFieldOptions: readonly string[] = ["source", "chest", "player", "clan"];
const validationSortOptions: readonly { value: "field" | "status" | "match_value"; label: string }[] = [
  { value: "field", label: "Field" },
  { value: "status", label: "Status" },
  { value: "match_value", label: "Match value" },
];
const correctionSortOptions: readonly { value: "field" | "match_value" | "replacement_value"; label: string }[] = [
  { value: "field", label: "Field" },
  { value: "match_value", label: "Match value" },
  { value: "replacement_value", label: "Replacement" },
];
const scoringSortOptions: readonly { value: "rule_order" | "score" | "chest_match" | "source_match"; label: string }[] =
  [
    { value: "rule_order", label: "Order" },
    { value: "score", label: "Score" },
    { value: "chest_match", label: "Chest" },
    { value: "source_match", label: "Source" },
  ];

/**
 * Admin UI for clan and membership management.
 */
function AdminClient(): JSX.Element {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pushToast } = useToast();
  const [clans, setClans] = useState<readonly ClanRow[]>([]);
  const [memberships, setMemberships] = useState<readonly MembershipRow[]>([]);
  const [selectedClanId, setSelectedClanId] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [memberUsername, setMemberUsername] = useState<string>("");
  const [memberEmail, setMemberEmail] = useState<string>("");
  const [memberGameUsername, setMemberGameUsername] = useState<string>("");
  const [memberDisplayName, setMemberDisplayName] = useState<string>("");
  const [memberRole, setMemberRole] = useState<string>("member");
  const [memberActive, setMemberActive] = useState<boolean>(true);
  const [memberRank, setMemberRank] = useState<string>("");
  const [memberModalStatus, setMemberModalStatus] = useState<string>("");
  const [membershipEditingId, setMembershipEditingId] = useState<string>("");
  const [membershipEdits, setMembershipEdits] = useState<Record<string, MembershipEditState>>({});
  const [membershipErrors, setMembershipErrors] = useState<Record<string, string>>({});
  const [isMemberModalOpen, setIsMemberModalOpen] = useState<boolean>(false);
  const [profilesById, setProfilesById] = useState<Record<string, ProfileRow>>({});
  const [memberSearch, setMemberSearch] = useState<string>("");
  const [memberRoleFilter, setMemberRoleFilter] = useState<string>("all");
  const [memberStatusFilter, setMemberStatusFilter] = useState<string>("all");
  const [validationRules, setValidationRules] = useState<readonly RuleRow[]>([]);
  const [correctionRules, setCorrectionRules] = useState<readonly RuleRow[]>([]);
  const [scoringRules, setScoringRules] = useState<readonly RuleRow[]>([]);
  const [validationSearch, setValidationSearch] = useState<string>("");
  const [validationFieldFilter, setValidationFieldFilter] = useState<string>("all");
  const [validationStatusFilter, setValidationStatusFilter] = useState<string>("all");
  const [validationSortKey, setValidationSortKey] = useState<"field" | "status" | "match_value">("field");
  const [validationSortDirection, setValidationSortDirection] = useState<"asc" | "desc">("asc");
  const [correctionSearch, setCorrectionSearch] = useState<string>("");
  const [correctionFieldFilter, setCorrectionFieldFilter] = useState<string>("all");
  const [correctionSortKey, setCorrectionSortKey] =
    useState<"field" | "match_value" | "replacement_value">("field");
  const [correctionSortDirection, setCorrectionSortDirection] = useState<"asc" | "desc">("asc");
  const [scoringSearch, setScoringSearch] = useState<string>("");
  const [scoringSortKey, setScoringSortKey] =
    useState<"rule_order" | "score" | "chest_match" | "source_match">("rule_order");
  const [scoringSortDirection, setScoringSortDirection] = useState<"asc" | "desc">("asc");
  const [validationPage, setValidationPage] = useState<number>(1);
  const [correctionPage, setCorrectionPage] = useState<number>(1);
  const [scoringPage, setScoringPage] = useState<number>(1);
  const [validationPageSize, setValidationPageSize] = useState<number>(5);
  const [correctionPageSize, setCorrectionPageSize] = useState<number>(5);
  const [scoringPageSize, setScoringPageSize] = useState<number>(5);
  const [auditLogs, setAuditLogs] = useState<readonly AuditLogRow[]>([]);
  const [auditActorsById, setAuditActorsById] = useState<Record<string, ProfileRow>>({});
  const [auditPage, setAuditPage] = useState<number>(1);
  const [auditPageSize, setAuditPageSize] = useState<number>(10);
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
  const [correctionEditingId, setCorrectionEditingId] = useState<string>("");
  const [scoringChest, setScoringChest] = useState<string>("");
  const [scoringSource, setScoringSource] = useState<string>("");
  const [scoringMinLevel, setScoringMinLevel] = useState<string>("");
  const [scoringMaxLevel, setScoringMaxLevel] = useState<string>("");
  const [scoringScore, setScoringScore] = useState<string>("");
  const [scoringOrder, setScoringOrder] = useState<string>("1");
  const [scoringEditingId, setScoringEditingId] = useState<string>("");
  const [activeSection, setActiveSection] = useState<"clans" | "rules" | "logs" | "users">("clans");
  const [isClanModalOpen, setIsClanModalOpen] = useState<boolean>(false);
  const [clanModalMode, setClanModalMode] = useState<"create" | "edit">("create");
  const [clanModalName, setClanModalName] = useState<string>("");
  const [clanModalDescription, setClanModalDescription] = useState<string>("");
  const [defaultClanId, setDefaultClanId] = useState<string>("");
  const [userSearch, setUserSearch] = useState<string>("");
  const [userRows, setUserRows] = useState<readonly UserRow[]>([]);
  const [gameAccountsByUserId, setGameAccountsByUserId] = useState<Record<string, GameAccountRow[]>>({});
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [newGameUsername, setNewGameUsername] = useState<string>("");
  const [newGameDisplayName, setNewGameDisplayName] = useState<string>("");
  const [userStatus, setUserStatus] = useState<string>("");
  const [createUserEmail, setCreateUserEmail] = useState<string>("");
  const [createUserUsername, setCreateUserUsername] = useState<string>("");
  const [createUserDisplayName, setCreateUserDisplayName] = useState<string>("");
  const [createUserStatus, setCreateUserStatus] = useState<string>("");

  const selectedClan = useMemo(
    () => clans.find((clan) => clan.id === selectedClanId),
    [clans, selectedClanId],
  );

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

  const filteredValidationRules = useMemo(() => {
    const normalizedSearch = validationSearch.trim().toLowerCase();
    return validationRules.filter((rule) => {
      if (validationFieldFilter !== "all" && rule.field !== validationFieldFilter) {
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
  }, [validationFieldFilter, validationRules, validationSearch, validationStatusFilter]);

  const sortedValidationRules = useMemo(() => {
    const sorted = [...filteredValidationRules];
    sorted.sort((left, right) => {
      const leftValue = left[validationSortKey];
      const rightValue = right[validationSortKey];
      return compareRuleValues(leftValue, rightValue, validationSortDirection);
    });
    return sorted;
  }, [filteredValidationRules, validationSortDirection, validationSortKey]);

  const filteredCorrectionRules = useMemo(() => {
    const normalizedSearch = correctionSearch.trim().toLowerCase();
    return correctionRules.filter((rule) => {
      if (correctionFieldFilter !== "all" && rule.field !== correctionFieldFilter) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      const searchText = [rule.field, rule.match_value, rule.replacement_value]
        .filter((value): value is string => Boolean(value))
        .join(" ")
        .toLowerCase();
      return searchText.includes(normalizedSearch);
    });
  }, [correctionFieldFilter, correctionRules, correctionSearch]);

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
  const pagedCorrectionRules = useMemo(
    () => paginateRules(sortedCorrectionRules, correctionPage, correctionPageSize),
    [sortedCorrectionRules, correctionPageSize, correctionPage],
  );
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
      if (memberRoleFilter !== "all" && membership.role !== memberRoleFilter) {
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
      const userId = membership.game_accounts?.user_id ?? "";
      const profile = userId ? profilesById[userId] : undefined;
      const searchText = [
        membership.game_accounts?.display_name,
        membership.game_accounts?.game_username,
        profile?.display_name,
        profile?.username_display,
        profile?.username,
        profile?.email,
        userId,
      ]
        .filter((value): value is string => Boolean(value))
        .join(" ")
        .toLowerCase();
      return searchText.includes(normalizedSearch);
    });
  }, [memberRoleFilter, memberSearch, memberStatusFilter, memberships, profilesById]);

  function resolveSection(value: string | null): "clans" | "rules" | "logs" | "users" {
    if (value === "rules" || value === "logs" || value === "users") {
      return value;
    }
    return "clans";
  }

  function updateActiveSection(nextSection: "clans" | "rules" | "logs" | "users"): void {
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
    const { data, error } = await supabase.from("clans").select("id,name,description").order("name");
    if (error) {
      setStatus(`Failed to load clans: ${error.message}`);
      return;
    }
    setClans(data ?? []);
    if (!selectedClanId && data && data.length > 0) {
      const storedClanId = window.localStorage.getItem("tc.currentClanId") ?? "";
      const matchedClan = storedClanId ? data.find((clan) => clan.id === storedClanId) : undefined;
      setSelectedClanId(matchedClan?.id ?? data[0].id);
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
    const { data, error } = await supabase
      .from("game_account_clan_memberships")
      .select("id,clan_id,game_account_id,role,is_active,rank,game_accounts(id,user_id,game_username,display_name)")
      .eq("clan_id", clanId)
      .order("role");
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
      .select("id,email,display_name,username,username_display")
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
  }

  async function loadRules(clanId: string): Promise<void> {
    if (!clanId) {
      setValidationRules([]);
      setCorrectionRules([]);
      setScoringRules([]);
      setValidationPage(1);
      setCorrectionPage(1);
      setScoringPage(1);
      return;
    }
    const { data: validationData } = await supabase
      .from("validation_rules")
      .select("id,field,match_value,status")
      .eq("clan_id", clanId)
      .order("field");
    setValidationRules(validationData ?? []);
    const { data: correctionData } = await supabase
      .from("correction_rules")
      .select("id,field,match_value,replacement_value")
      .eq("clan_id", clanId)
      .order("field");
    setCorrectionRules(correctionData ?? []);
    const { data: scoringData } = await supabase
      .from("scoring_rules")
      .select("id,chest_match,source_match,min_level,max_level,score,rule_order")
      .eq("clan_id", clanId)
      .order("rule_order");
    setScoringRules(scoringData ?? []);
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

  async function loadUsers(): Promise<void> {
    const query = supabase
      .from("profiles")
      .select("id,email,display_name,username,username_display")
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
      return;
    }
    const { data: gameAccountData, error: gameAccountError } = await supabase
      .from("game_accounts")
      .select("id,user_id,game_username,display_name")
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
  }

  async function handleAddGameAccount(): Promise<void> {
    if (!selectedUserId) {
      setUserStatus("Select a user first.");
      return;
    }
    if (!newGameUsername.trim()) {
      setUserStatus("Game username is required.");
      return;
    }
    const displayNameValue = newGameDisplayName.trim() || newGameUsername.trim();
    setUserStatus("Adding game account...");
    const { error } = await supabase
      .from("game_accounts")
      .upsert(
        {
          user_id: selectedUserId,
          game_username: newGameUsername.trim(),
          display_name: displayNameValue,
        },
        { onConflict: "user_id,game_username" },
      );
    if (error) {
      setUserStatus(`Failed to add game account: ${error.message}`);
      return;
    }
    setNewGameUsername("");
    setNewGameDisplayName("");
    setUserStatus("Game account added.");
    await loadUsers();
  }

  async function handleCreateUser(): Promise<void> {
    if (!createUserEmail.trim()) {
      setCreateUserStatus("Email is required.");
      return;
    }
    setCreateUserStatus("Creating user...");
    const response = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: createUserEmail.trim(),
        username: createUserUsername.trim() || undefined,
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
    await loadUsers();
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

  useEffect(() => {
    void loadClans();
    void loadDefaultClan();
  }, []);

  useEffect(() => {
    const nextSection = resolveSection(searchParams.get("tab"));
    setActiveSection(nextSection);
  }, [searchParams]);

  useEffect(() => {
    if (status) {
      pushToast(status);
    }
  }, [pushToast, status]);

  useEffect(() => {
    void loadMemberships(selectedClanId);
    void loadRules(selectedClanId);
  }, [selectedClanId]);

  useEffect(() => {
    if (activeSection !== "users") {
      return;
    }
    void loadUsers();
  }, [activeSection, userSearch]);

  useEffect(() => {
    setAuditPage(1);
  }, [selectedClanId]);

  useEffect(() => {
    if (!auditClanFilter) {
      setAuditClanFilter("all");
    }
  }, [auditClanFilter, selectedClanId]);

  useEffect(() => {
    void loadAuditLogs(selectedClanId, auditPage, auditPageSize);
  }, [
    auditActionFilter,
    auditActorFilter,
    auditClanFilter,
    auditEntityFilter,
    auditPage,
    auditPageSize,
    auditSearch,
    selectedClanId,
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

  async function handleAddMember(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!selectedClanId) {
      setMemberModalStatus("Select a clan first.");
      return;
    }
    const identifier = memberUsername.trim() || memberEmail.trim();
    if (!identifier) {
      setMemberModalStatus("Username or email is required.");
      return;
    }
    if (!memberGameUsername.trim()) {
      setMemberModalStatus("Game username is required.");
      return;
    }
    let resolvedUserId = "";
    if (identifier) {
      const response = await fetch("/api/admin/user-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          clanId: selectedClanId,
          email: memberEmail.trim() || undefined,
          username: memberUsername.trim() || undefined,
        }),
      });
      const payload = (await response.json()) as { id?: string; error?: string };
      if (!response.ok) {
        setMemberModalStatus(payload.error ?? "Failed to find user.");
        return;
      }
      resolvedUserId = payload.id ?? "";
    }
    if (!resolvedUserId) {
      setMemberModalStatus("Failed to resolve user.");
      return;
    }
    setMemberModalStatus("Adding member...");
    const displayNameValue = memberDisplayName.trim() || memberGameUsername.trim() || null;
    const { data: gameAccountData, error: gameAccountError } = await supabase
      .from("game_accounts")
      .upsert(
        {
          user_id: resolvedUserId,
          game_username: memberGameUsername.trim(),
          display_name: displayNameValue,
        },
        { onConflict: "user_id,game_username" },
      )
      .select("id")
      .single();
    if (gameAccountError) {
      setMemberModalStatus(`Failed to create game account: ${gameAccountError.message}`);
      return;
    }
    const membershipPayload = {
      clan_id: selectedClanId,
      game_account_id: gameAccountData?.id ?? "",
      role: memberRole,
      is_active: memberActive,
      rank: memberRank.trim() || null,
    };
    const { data: membershipData, error: membershipError } = await supabase
      .from("game_account_clan_memberships")
      .upsert(membershipPayload, { onConflict: "game_account_id,clan_id" })
      .select("id")
      .single();
    if (membershipError) {
      setMemberModalStatus(`Failed to add member: ${membershipError.message}`);
      return;
    }
    const membershipId = membershipData?.id ?? "";
    const actorId = await getCurrentUserId();
    if (actorId && membershipId) {
      await insertAuditLogs([
        {
          clan_id: selectedClanId,
          actor_id: actorId,
          action: "upsert",
          entity: "game_account_clan_memberships",
          entity_id: membershipId,
          diff: {
            game_account_id: membershipPayload.game_account_id,
            role: membershipPayload.role,
            is_active: membershipPayload.is_active,
            rank: membershipPayload.rank,
          },
        },
      ]);
    }
    setMemberUsername("");
    setMemberEmail("");
    setMemberGameUsername("");
    setMemberDisplayName("");
    setMembershipEditingId("");
    setMemberModalStatus("Member updated.");
    setIsMemberModalOpen(false);
    await loadMemberships(selectedClanId);
  }

  async function handleDeleteMembership(membershipId: string): Promise<void> {
    const confirmDelete = window.confirm("Remove this member from the clan?");
    if (!confirmDelete) {
      return;
    }
    const actorId = await getCurrentUserId();
    if (!actorId) {
      setStatus("You must be logged in to remove members.");
      return;
    }
    const membership = memberships.find((entry) => entry.id === membershipId);
    const { error } = await supabase.from("game_account_clan_memberships").delete().eq("id", membershipId);
    if (error) {
      setStatus(`Failed to delete membership: ${error.message}`);
      return;
    }
    if (membership) {
      await insertAuditLogs([
        {
          clan_id: membership.clan_id,
          actor_id: actorId,
          action: "delete",
          entity: "game_account_clan_memberships",
          entity_id: membershipId,
          diff: {
            game_account_id: membership.game_account_id,
            role: membership.role,
            is_active: membership.is_active,
          },
        },
      ]);
    }
    setStatus("Membership removed.");
    await loadMemberships(selectedClanId);
  }

  function handleEditMembership(membership: MembershipRow): void {
    setMembershipEditingId(membership.id);
    setMemberUsername("");
    setMemberEmail("");
    setMemberRole(membership.role);
    setMemberActive(membership.is_active);
  }

  function updateMembershipEdit(membershipId: string, field: keyof MembershipEditState, value: string): void {
    setMembershipEdits((current) => {
      const baseMembership = memberships.find((entry) => entry.id === membershipId);
      const baseUserId = baseMembership?.game_accounts?.user_id;
      const baseProfile = baseUserId ? profilesById[baseUserId] : undefined;
      const existing = current[membershipId] ?? {
        role: baseMembership?.role ?? "member",
        is_active: baseMembership?.is_active ?? true,
        rank: baseMembership?.rank ?? "",
        clan_id: baseMembership?.clan_id ?? selectedClanId,
        display_name: baseMembership?.game_accounts?.display_name ?? "",
        game_username: baseMembership?.game_accounts?.game_username ?? "",
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
  }

  function isMembershipFieldChanged(
    membership: MembershipRow,
    field: keyof MembershipEditState,
  ): boolean {
    const edits = membershipEdits[membership.id];
    if (!edits || edits[field] === undefined) {
      return false;
    }
    const baseGameAccount = membership.game_accounts;
    const nextValue = edits[field];
    if (field === "role") {
      return String(nextValue ?? "") !== membership.role;
    }
    if (field === "is_active") {
      return Boolean(nextValue) !== membership.is_active;
    }
    if (field === "rank") {
      return String(nextValue ?? "") !== String(membership.rank ?? "");
    }
    if (field === "clan_id") {
      return String(nextValue ?? "") !== membership.clan_id;
    }
    if (field === "game_username") {
      const baseValue = baseGameAccount?.game_username ?? "";
      return String(nextValue ?? "") !== baseValue;
    }
    if (field === "display_name") {
      const baseValue = baseGameAccount?.display_name ?? "";
      return String(nextValue ?? "") !== baseValue;
    }
    return false;
  }

  function getMembershipEditValue(membership: MembershipRow): MembershipEditState {
    const baseGameAccount = membership.game_accounts;
    return {
      role: membershipEdits[membership.id]?.role ?? membership.role,
      is_active: membershipEdits[membership.id]?.is_active ?? membership.is_active,
      rank: membershipEdits[membership.id]?.rank ?? membership.rank ?? "",
      clan_id: membershipEdits[membership.id]?.clan_id ?? membership.clan_id,
      display_name: membershipEdits[membership.id]?.display_name ?? baseGameAccount?.display_name ?? "",
      game_username: membershipEdits[membership.id]?.game_username ?? baseGameAccount?.game_username ?? "",
    };
  }

  function validateMembershipEdit(membership: MembershipRow): string | null {
    const edits = getMembershipEditValue(membership);
    const nextGameUsername = edits.game_username?.trim() ?? "";
    if (!nextGameUsername) {
      return "Game username is required.";
    }
    if (!edits.role?.trim()) {
      return "Role is required.";
    }
    if (!edits.clan_id?.trim()) {
      return "Clan is required.";
    }
    return null;
  }

  async function handleSaveMembershipEdit(membership: MembershipRow, shouldReload: boolean = true): Promise<void> {
    const edits = membershipEdits[membership.id];
    if (!edits) {
      setStatus("No changes to save.");
      return;
    }
    const validationError = validateMembershipEdit(membership);
    if (validationError) {
      setMembershipErrors((current) => ({ ...current, [membership.id]: validationError }));
      return;
    }
    const actorId = await getCurrentUserId();
    if (!actorId) {
      setStatus("You must be logged in to update members.");
      return;
    }
    const nextEdits = getMembershipEditValue(membership);
    const membershipPayload = {
      clan_id: nextEdits.clan_id ?? membership.clan_id,
      game_account_id: membership.game_account_id,
      role: nextEdits.role ?? membership.role,
      is_active: nextEdits.is_active ?? membership.is_active,
      rank: nextEdits.rank ?? membership.rank,
    };
    const { error } = await supabase
      .from("game_account_clan_memberships")
      .update(membershipPayload)
      .eq("id", membership.id);
    if (error) {
      setStatus(`Failed to update member: ${error.message}`);
      return;
    }
    if (membership.game_accounts?.id) {
      const gameAccountPayload = {
        display_name: nextEdits.display_name ?? membership.game_accounts.display_name ?? null,
        game_username: nextEdits.game_username ?? membership.game_accounts.game_username,
      };
      await supabase.from("game_accounts").update(gameAccountPayload).eq("id", membership.game_accounts.id);
    }
    await insertAuditLogs([
      {
        clan_id: membership.clan_id,
        actor_id: actorId,
        action: "update",
        entity: "game_account_clan_memberships",
        entity_id: membership.id,
        diff: {
          game_account_id: membership.game_account_id,
          role: {
            from: membership.role,
            to: membershipPayload.role,
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
    setMembershipEdits((current) => {
      const updated = { ...current };
      delete updated[membership.id];
      return updated;
    });
    setStatus("Member updated.");
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
    const confirmSave = window.confirm(`Save ${editEntries.length} member change(s)?`);
    if (!confirmSave) {
      return;
    }
    setStatus("Saving member changes...");
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
      setStatus("Some member updates need fixes before saving.");
      return;
    }
    await loadMemberships(selectedClanId);
    setStatus("All member changes saved.");
  }

  function handleOpenMemberModal(): void {
    if (!selectedClanId) {
      setStatus("Select a clan first.");
      return;
    }
    setMembershipEditingId("");
    setMemberUsername("");
    setMemberEmail("");
    setMemberGameUsername("");
    setMemberDisplayName("");
    setMemberRole("member");
    setMemberActive(true);
    setMemberRank("");
    setMemberModalStatus("");
    setIsMemberModalOpen(true);
  }

  function handleCloseMemberModal(): void {
    setIsMemberModalOpen(false);
    setMemberModalStatus("");
  }

  function getMembershipLabel(membership: MembershipRow): string {
    const gameAccount = membership.game_accounts;
    if (!gameAccount) {
      return membership.game_account_id;
    }
    if (gameAccount.display_name && gameAccount.display_name.trim()) {
      return gameAccount.display_name;
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
    if (!isoValue) {
      return "";
    }
    const parsed = new Date(isoValue);
    if (Number.isNaN(parsed.getTime())) {
      return isoValue;
    }
    return parsed.toLocaleString();
  }

  async function handleAddValidationRule(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!selectedClanId) {
      setStatus("Select a clan first.");
      return;
    }
    if (validationEditingId) {
      const confirmUpdate = window.confirm("Update this validation rule?");
      if (!confirmUpdate) {
        return;
      }
    }
    const payload = {
      clan_id: selectedClanId,
      field: validationField.trim(),
      match_value: validationMatch.trim(),
      status: validationStatus.trim(),
    };
    const { error } = validationEditingId
      ? await supabase.from("validation_rules").update(payload).eq("id", validationEditingId)
      : await supabase.from("validation_rules").insert(payload);
    if (error) {
      setStatus(`Failed to add validation rule: ${error.message}`);
      return;
    }
    setValidationField("");
    setValidationMatch("");
    setValidationEditingId("");
    setStatus("Validation rule added.");
    await loadRules(selectedClanId);
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
    await loadRules(selectedClanId);
  }

  function handleEditValidationRule(rule: RuleRow): void {
    setValidationField(rule.field ?? "");
    setValidationMatch(rule.match_value ?? "");
    setValidationStatus(rule.status ?? "valid");
    setValidationEditingId(rule.id);
  }

  async function handleAddCorrectionRule(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!selectedClanId) {
      setStatus("Select a clan first.");
      return;
    }
    if (correctionEditingId) {
      const confirmUpdate = window.confirm("Update this correction rule?");
      if (!confirmUpdate) {
        return;
      }
    }
    const payload = {
      clan_id: selectedClanId,
      field: correctionField.trim(),
      match_value: correctionMatch.trim(),
      replacement_value: correctionReplacement.trim(),
    };
    const { error } = correctionEditingId
      ? await supabase.from("correction_rules").update(payload).eq("id", correctionEditingId)
      : await supabase.from("correction_rules").insert(payload);
    if (error) {
      setStatus(`Failed to add correction rule: ${error.message}`);
      return;
    }
    setCorrectionField("");
    setCorrectionMatch("");
    setCorrectionReplacement("");
    setCorrectionEditingId("");
    setStatus("Correction rule added.");
    await loadRules(selectedClanId);
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
    await loadRules(selectedClanId);
  }

  function handleEditCorrectionRule(rule: RuleRow): void {
    setCorrectionField(rule.field ?? "");
    setCorrectionMatch(rule.match_value ?? "");
    setCorrectionReplacement(rule.replacement_value ?? "");
    setCorrectionEditingId(rule.id);
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
    await loadRules(selectedClanId);
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
    await loadRules(selectedClanId);
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
            <div className="card-subtitle">Manage clans, rules, and audit logs</div>
          </div>
        </div>
        <div className="tabs">
          <button
            className={`tab ${activeSection === "clans" ? "active" : ""}`}
            type="button"
            onClick={() => updateActiveSection("clans")}
          >
            Clans & Members
          </button>
          <button
            className={`tab ${activeSection === "users" ? "active" : ""}`}
            type="button"
            onClick={() => updateActiveSection("users")}
          >
            Users
          </button>
          <button
            className={`tab ${activeSection === "rules" ? "active" : ""}`}
            type="button"
            onClick={() => updateActiveSection("rules")}
          >
            Rules
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
            Data Table
          </button>
        </div>
      </section>
      {activeSection === "clans" ? (
      <section className="card" style={{ gridColumn: "span 12" }}>
        <div className="card-header">
          <div>
            <div className="card-title">Clans & Members</div>
            <div className="card-subtitle">{selectedClan ? selectedClan.name : "Select a clan"}</div>
          </div>
        </div>
        <div className="admin-clan-row">
          <label htmlFor="selectedClan">Clan</label>
          <select
            id="selectedClan"
            value={selectedClanId}
            onChange={(event) => setSelectedClanId(event.target.value)}
          >
            <option value="">Select a clan</option>
            {clans.map((clan) => (
              <option key={clan.id} value={clan.id}>
                {clan.name}
              </option>
            ))}
          </select>
          <div className="list inline">
            <button className="button primary" type="button" onClick={openCreateClanModal}>
              Create Clan
            </button>
            <button className="button" type="button" onClick={openEditClanModal} disabled={!selectedClanId}>
              Edit Clan
            </button>
            <button className="button" type="button" onClick={handleOpenMemberModal} disabled={!selectedClanId}>
              Add Member
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
              Set Default
            </button>
            {selectedClanId && selectedClanId === defaultClanId ? <span className="badge">Default</span> : null}
            {selectedClanId && selectedClanId === defaultClanId ? (
              <button
                className="button"
                type="button"
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
                Clear Default
              </button>
            ) : null}
          </div>
        </div>
        <div className="list inline admin-members-filters" style={{ alignItems: "center", flexWrap: "wrap" }}>
          <label htmlFor="memberSearch" className="text-muted">
            Search
          </label>
          <input
            id="memberSearch"
            value={memberSearch}
            onChange={(event) => setMemberSearch(event.target.value)}
            placeholder="Name, username, email, or user id"
          />
          <label htmlFor="memberRoleFilter" className="text-muted">
            Role
          </label>
          <select
            id="memberRoleFilter"
            value={memberRoleFilter}
            onChange={(event) => setMemberRoleFilter(event.target.value)}
          >
            <option value="all">All</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <label htmlFor="memberStatusFilter" className="text-muted">
            Status
          </label>
          <select
            id="memberStatusFilter"
            value={memberStatusFilter}
            onChange={(event) => setMemberStatusFilter(event.target.value)}
          >
            <option value="all">All</option>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </select>
          <button
            className="button"
            type="button"
            onClick={() => {
              setMemberSearch("");
              setMemberRoleFilter("all");
              setMemberStatusFilter("all");
            }}
          >
            Clear filters
          </button>
          <span className="text-muted">
            {filteredMemberships.length} / {memberships.length}
          </span>
        </div>
        {memberships.length === 0 ? (
          <div className="list">
            <div className="list-item">
              <span>No members yet</span>
              <span className="badge">Add one</span>
            </div>
          </div>
        ) : filteredMemberships.length === 0 ? (
          <div className="list">
            <div className="list-item">
              <span>No members match the filters</span>
              <span className="badge">Adjust search</span>
            </div>
          </div>
        ) : (
          <div className="table members">
            <header>
              <span>Game Username</span>
              <span>Role</span>
              <span>User Email</span>
              <span>Display name</span>
              <span>Clan</span>
              <span>Rank</span>
              <span>Status</span>
              <span>Actions</span>
            </header>
            {filteredMemberships.map((membership) => (
              <div className="row" key={membership.id}>
                <input
                  className={isMembershipFieldChanged(membership, "game_username") ? "is-edited" : undefined}
                  value={getMembershipEditValue(membership).game_username ?? ""}
                  onChange={(event) => updateMembershipEdit(membership.id, "game_username", event.target.value)}
                  placeholder="Game username"
                />
                <select
                  className={isMembershipFieldChanged(membership, "role") ? "is-edited" : undefined}
                  value={getMembershipEditValue(membership).role}
                  onChange={(event) => updateMembershipEdit(membership.id, "role", event.target.value)}
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <span className="text-muted">
                  {membership.game_accounts?.user_id
                    ? profilesById[membership.game_accounts.user_id]?.email ?? "-"
                    : "-"}
                </span>
                <input
                  className={isMembershipFieldChanged(membership, "display_name") ? "is-edited" : undefined}
                  value={getMembershipEditValue(membership).display_name ?? ""}
                  onChange={(event) => updateMembershipEdit(membership.id, "display_name", event.target.value)}
                  placeholder="Display name"
                />
                <select
                  className={isMembershipFieldChanged(membership, "clan_id") ? "is-edited" : undefined}
                  value={getMembershipEditValue(membership).clan_id ?? membership.clan_id}
                  onChange={(event) => updateMembershipEdit(membership.id, "clan_id", event.target.value)}
                >
                  {clans.map((clan) => (
                    <option key={clan.id} value={clan.id}>
                      {clan.name}
                    </option>
                  ))}
                </select>
                <select
                  className={isMembershipFieldChanged(membership, "rank") ? "is-edited" : undefined}
                  value={getMembershipEditValue(membership).rank ?? ""}
                  onChange={(event) => updateMembershipEdit(membership.id, "rank", event.target.value)}
                >
                  <option value="">None</option>
                  {rankOptions.map((rank) => (
                    <option key={rank} value={rank}>
                      {rank}
                    </option>
                  ))}
                </select>
                <select
                  className={isMembershipFieldChanged(membership, "is_active") ? "is-edited" : undefined}
                  value={getMembershipEditValue(membership).is_active ? "true" : "false"}
                  onChange={(event) => updateMembershipEdit(membership.id, "is_active", event.target.value)}
                >
                  <option value="true">active</option>
                  <option value="false">inactive</option>
                </select>
                <div className="list inline">
                  <button className="button" type="button" onClick={() => handleSaveMembershipEdit(membership)}>
                    Save
                  </button>
                  <button className="button" type="button" onClick={() => cancelMembershipEdits(membership.id)}>
                    Cancel
                  </button>
                  {membershipErrors[membership.id] ? (
                    <span className="text-muted">{membershipErrors[membership.id]}</span>
                  ) : null}
                  <button
                    className="button danger"
                    type="button"
                    onClick={() => handleDeleteMembership(membership.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      ) : null}
      {activeSection === "users" ? (
      <section className="card" style={{ gridColumn: "span 12" }}>
        <div className="card-header">
          <div>
            <div className="card-title">Users & Game Accounts</div>
            <div className="card-subtitle">Manage users and their game accounts</div>
          </div>
          <span className="badge">{userRows.length}</span>
        </div>
        <div className="list inline" style={{ alignItems: "center", flexWrap: "wrap" }}>
          <label htmlFor="userSearch" className="text-muted">
            Search
          </label>
          <input
            id="userSearch"
            value={userSearch}
            onChange={(event) => setUserSearch(event.target.value)}
            placeholder="Email, username, or display name"
          />
        </div>
        <div className="list">
          {userRows.length === 0 ? (
            <div className="list-item">
              <span>No users found</span>
              <span className="badge">Adjust search</span>
            </div>
          ) : (
            userRows.map((user) => (
              <div className="list-item" key={user.id}>
                <div>
                  <div>{user.email}</div>
                  <div className="text-muted">
                    {user.display_name ?? user.username_display ?? user.username ?? user.id}
                  </div>
                </div>
                <div className="list">
                  <span className="badge">
                    {(gameAccountsByUserId[user.id] ?? []).length} game account(s)
                  </span>
                  <button
                    className="button"
                    type="button"
                    onClick={() => setSelectedUserId(user.id)}
                  >
                    Select
                  </button>
                  <button
                    className="button"
                    type="button"
                    onClick={() => handleResendInvite(user.email)}
                  >
                    Resend Invite
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="card-header">
          <div>
            <div className="card-title">Add Game Account</div>
            <div className="card-subtitle">Attach a new game account to a user</div>
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="selectedUser">Selected user</label>
          <select
            id="selectedUser"
            value={selectedUserId}
            onChange={(event) => setSelectedUserId(event.target.value)}
          >
            <option value="">Select a user</option>
            {userRows.map((user) => (
              <option key={user.id} value={user.id}>
                {user.email}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="newGameUsername">Game username</label>
          <input
            id="newGameUsername"
            value={newGameUsername}
            onChange={(event) => setNewGameUsername(event.target.value)}
            placeholder="In-game account name"
          />
        </div>
        <div className="form-group">
          <label htmlFor="newGameDisplayName">Display name</label>
          <input
            id="newGameDisplayName"
            value={newGameDisplayName}
            onChange={(event) => setNewGameDisplayName(event.target.value)}
            placeholder="Defaults to game username"
          />
        </div>
        <div className="list">
          {userStatus ? <div className="alert info">{userStatus}</div> : null}
          <button className="button primary" type="button" onClick={handleAddGameAccount}>
            Add Game Account
          </button>
        </div>
        <div className="list">
          {selectedUserId ? (
            (gameAccountsByUserId[selectedUserId] ?? []).map((account) => (
              <div className="list-item" key={account.id}>
                <div>
                  <div>{account.game_username}</div>
                  <div className="text-muted">{account.display_name ?? "-"}</div>
                </div>
                <span className="badge">Game Account</span>
              </div>
            ))
          ) : (
            <div className="list-item">
              <span>Select a user to view game accounts</span>
            </div>
          )}
        </div>
        <div className="card-header">
          <div>
            <div className="card-title">Create User</div>
            <div className="card-subtitle">Provision a new account</div>
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
          <label htmlFor="createUserUsername">Username (optional)</label>
          <input
            id="createUserUsername"
            value={createUserUsername}
            onChange={(event) => setCreateUserUsername(event.target.value)}
            placeholder="username"
          />
        </div>
        <div className="form-group">
          <label htmlFor="createUserDisplayName">Display name (optional)</label>
          <input
            id="createUserDisplayName"
            value={createUserDisplayName}
            onChange={(event) => setCreateUserDisplayName(event.target.value)}
            placeholder="Display name"
          />
        </div>
        <div className="list">
          {createUserStatus ? <div className="alert info">{createUserStatus}</div> : null}
          <button className="button primary" type="button" onClick={handleCreateUser}>
            Create User
          </button>
        </div>
      </section>
      ) : null}
      {activeSection === "rules" ? (
      <section className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Validation Rules</div>
            <div className="card-subtitle">Exact match validation</div>
          </div>
        </div>
        <form onSubmit={handleAddValidationRule}>
          <div className="form-group">
            <label htmlFor="validationField">Field</label>
            <select
              id="validationField"
              value={validationField || "source"}
              onChange={(event) => setValidationField(event.target.value)}
            >
              {ruleFieldOptions.map((field) => (
                <option key={field} value={field}>
                  {field}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="validationMatch">Match value</label>
            <input
              id="validationMatch"
              value={validationMatch}
              onChange={(event) => setValidationMatch(event.target.value)}
              placeholder="Level 25 Crypt"
            />
          </div>
          <div className="form-group">
            <label htmlFor="validationStatus">Status</label>
            <select
              id="validationStatus"
              value={validationStatus}
              onChange={(event) => setValidationStatus(event.target.value)}
            >
              <option value="valid">valid</option>
              <option value="invalid">invalid</option>
            </select>
          </div>
          <div className="list">
            <button className="button primary" type="submit">
              {validationEditingId ? "Update Validation Rule" : "Add Validation Rule"}
            </button>
            {validationEditingId ? (
              <button
                className="button"
                type="button"
                onClick={() => {
                  setValidationEditingId("");
                  setValidationField("source");
                  setValidationMatch("");
                  setValidationStatus("valid");
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
        <div className="list inline" style={{ alignItems: "center", flexWrap: "wrap" }}>
          <label htmlFor="validationSearch" className="text-muted">
            Search
          </label>
          <input
            id="validationSearch"
            value={validationSearch}
            onChange={(event) => {
              setValidationSearch(event.target.value);
              setValidationPage(1);
            }}
            placeholder="Field or match value"
          />
          <label htmlFor="validationFieldFilter" className="text-muted">
            Field
          </label>
          <select
            id="validationFieldFilter"
            value={validationFieldFilter}
            onChange={(event) => {
              setValidationFieldFilter(event.target.value);
              setValidationPage(1);
            }}
          >
            <option value="all">All</option>
            {ruleFieldOptions.map((field) => (
              <option key={field} value={field}>
                {field}
              </option>
            ))}
          </select>
          <label htmlFor="validationStatusFilter" className="text-muted">
            Status
          </label>
          <select
            id="validationStatusFilter"
            value={validationStatusFilter}
            onChange={(event) => {
              setValidationStatusFilter(event.target.value);
              setValidationPage(1);
            }}
          >
            <option value="all">All</option>
            <option value="valid">valid</option>
            <option value="invalid">invalid</option>
          </select>
          <label htmlFor="validationSort" className="text-muted">
            Sort
          </label>
          <select
            id="validationSort"
            value={validationSortKey}
            onChange={(event) => {
              setValidationSortKey(event.target.value as "field" | "status" | "match_value");
              setValidationPage(1);
            }}
          >
            {validationSortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Validation sort direction"
            value={validationSortDirection}
            onChange={(event) => {
              setValidationSortDirection(event.target.value as "asc" | "desc");
              setValidationPage(1);
            }}
          >
            <option value="asc">Asc</option>
            <option value="desc">Desc</option>
          </select>
          <button
            className="button"
            type="button"
            onClick={() => {
              setValidationSearch("");
              setValidationFieldFilter("all");
              setValidationStatusFilter("all");
              setValidationSortKey("field");
              setValidationSortDirection("asc");
              setValidationPageSize(5);
              setValidationPage(1);
            }}
          >
            Reset
          </button>
          <span className="text-muted">
            {filteredValidationRules.length} / {validationRules.length}
          </span>
        </div>
        <div className="list">
          {validationRules.length === 0 ? (
            <div className="list-item">
              <span>No validation rules</span>
              <span className="badge">Add one</span>
            </div>
          ) : filteredValidationRules.length === 0 ? (
            <div className="list-item">
              <span>No validation rules match the filters</span>
              <span className="badge">Adjust filters</span>
            </div>
          ) : (
            pagedValidationRules.map((rule) => (
              <div className="list-item" key={rule.id}>
                <span>{rule.field}: {rule.match_value}</span>
                <div className="list">
                  <span className="badge">{rule.status}</span>
                  <button className="button" type="button" onClick={() => handleEditValidationRule(rule)}>
                    Edit
                  </button>
                  <button className="button danger" type="button" onClick={() => handleDeleteValidationRule(rule.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        {filteredValidationRules.length > 0 ? (
          <div className="list inline" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
            <div className="list inline">
              <button
                className="button"
                type="button"
                disabled={validationPage === 1}
                onClick={() => setValidationPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </button>
              <button
                className="button"
                type="button"
                disabled={validationPage >= validationTotalPages}
                onClick={() => setValidationPage((current) => current + 1)}
              >
                Next
              </button>
            </div>
            <span className="text-muted">
              Page {validationPage} of {validationTotalPages}
            </span>
            <div className="list inline">
              <label htmlFor="validationPageSize" className="text-muted">
                Page size
              </label>
              <select
                id="validationPageSize"
                value={validationPageSize}
                onChange={(event) => {
                  setValidationPageSize(Number(event.target.value));
                  setValidationPage(1);
                }}
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
              </select>
            </div>
          </div>
        ) : null}
      </section>
      ) : null}
      {activeSection === "rules" ? (
      <section className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Correction Rules</div>
            <div className="card-subtitle">Exact match corrections</div>
          </div>
        </div>
        <form onSubmit={handleAddCorrectionRule}>
          <div className="form-group">
            <label htmlFor="correctionField">Field</label>
            <select
              id="correctionField"
              value={correctionField || "source"}
              onChange={(event) => setCorrectionField(event.target.value)}
            >
              {ruleFieldOptions.map((field) => (
                <option key={field} value={field}>
                  {field}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="correctionMatch">Match value</label>
            <input
              id="correctionMatch"
              value={correctionMatch}
              onChange={(event) => setCorrectionMatch(event.target.value)}
              placeholder="Level 20 epic Crypt"
            />
          </div>
          <div className="form-group">
            <label htmlFor="correctionReplacement">Replacement value</label>
            <input
              id="correctionReplacement"
              value={correctionReplacement}
              onChange={(event) => setCorrectionReplacement(event.target.value)}
              placeholder="Level 20 Epic Crypt"
            />
          </div>
          <div className="list">
            <button className="button primary" type="submit">
              {correctionEditingId ? "Update Correction Rule" : "Add Correction Rule"}
            </button>
            {correctionEditingId ? (
              <button
                className="button"
                type="button"
                onClick={() => {
                  setCorrectionEditingId("");
                  setCorrectionField("source");
                  setCorrectionMatch("");
                  setCorrectionReplacement("");
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
        <div className="list inline" style={{ alignItems: "center", flexWrap: "wrap" }}>
          <label htmlFor="correctionSearch" className="text-muted">
            Search
          </label>
          <input
            id="correctionSearch"
            value={correctionSearch}
            onChange={(event) => {
              setCorrectionSearch(event.target.value);
              setCorrectionPage(1);
            }}
            placeholder="Field, match, or replacement"
          />
          <label htmlFor="correctionFieldFilter" className="text-muted">
            Field
          </label>
          <select
            id="correctionFieldFilter"
            value={correctionFieldFilter}
            onChange={(event) => {
              setCorrectionFieldFilter(event.target.value);
              setCorrectionPage(1);
            }}
          >
            <option value="all">All</option>
            {ruleFieldOptions.map((field) => (
              <option key={field} value={field}>
                {field}
              </option>
            ))}
          </select>
          <label htmlFor="correctionSort" className="text-muted">
            Sort
          </label>
          <select
            id="correctionSort"
            value={correctionSortKey}
            onChange={(event) => {
              setCorrectionSortKey(event.target.value as "field" | "match_value" | "replacement_value");
              setCorrectionPage(1);
            }}
          >
            {correctionSortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Correction sort direction"
            value={correctionSortDirection}
            onChange={(event) => {
              setCorrectionSortDirection(event.target.value as "asc" | "desc");
              setCorrectionPage(1);
            }}
          >
            <option value="asc">Asc</option>
            <option value="desc">Desc</option>
          </select>
          <button
            className="button"
            type="button"
            onClick={() => {
              setCorrectionSearch("");
              setCorrectionFieldFilter("all");
              setCorrectionSortKey("field");
              setCorrectionSortDirection("asc");
              setCorrectionPageSize(5);
              setCorrectionPage(1);
            }}
          >
            Reset
          </button>
          <span className="text-muted">
            {filteredCorrectionRules.length} / {correctionRules.length}
          </span>
        </div>
        <div className="list">
          {correctionRules.length === 0 ? (
            <div className="list-item">
              <span>No correction rules</span>
              <span className="badge">Add one</span>
            </div>
          ) : filteredCorrectionRules.length === 0 ? (
            <div className="list-item">
              <span>No correction rules match the filters</span>
              <span className="badge">Adjust filters</span>
            </div>
          ) : (
            pagedCorrectionRules.map((rule) => (
              <div className="list-item" key={rule.id}>
                <span>{rule.field}: {rule.match_value}</span>
                <div className="list">
                  <span className="badge">→ {rule.replacement_value}</span>
                  <button className="button" type="button" onClick={() => handleEditCorrectionRule(rule)}>
                    Edit
                  </button>
                  <button className="button danger" type="button" onClick={() => handleDeleteCorrectionRule(rule.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        {filteredCorrectionRules.length > 0 ? (
          <div className="list inline" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
            <div className="list inline">
              <button
                className="button"
                type="button"
                disabled={correctionPage === 1}
                onClick={() => setCorrectionPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </button>
              <button
                className="button"
                type="button"
                disabled={correctionPage >= correctionTotalPages}
                onClick={() => setCorrectionPage((current) => current + 1)}
              >
                Next
              </button>
            </div>
            <span className="text-muted">
              Page {correctionPage} of {correctionTotalPages}
            </span>
            <div className="list inline">
              <label htmlFor="correctionPageSize" className="text-muted">
                Page size
              </label>
              <select
                id="correctionPageSize"
                value={correctionPageSize}
                onChange={(event) => {
                  setCorrectionPageSize(Number(event.target.value));
                  setCorrectionPage(1);
                }}
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
              </select>
            </div>
          </div>
        ) : null}
      </section>
      ) : null}
      {activeSection === "rules" ? (
      <section className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Scoring Rules</div>
            <div className="card-subtitle">Ordered scoring precedence</div>
          </div>
        </div>
        <form onSubmit={handleAddScoringRule}>
          <div className="form-group">
            <label htmlFor="scoringChest">Chest match</label>
            <input
              id="scoringChest"
              value={scoringChest}
              onChange={(event) => setScoringChest(event.target.value)}
              placeholder="Elegant Chest or *Chest*"
            />
          </div>
          <div className="form-group">
            <label htmlFor="scoringSource">Source match</label>
            <input
              id="scoringSource"
              value={scoringSource}
              onChange={(event) => setScoringSource(event.target.value)}
              placeholder="Level 25 Crypt or ~crypt"
            />
          </div>
          <div className="form-group">
            <label htmlFor="scoringMin">Min level</label>
            <input
              id="scoringMin"
              value={scoringMinLevel}
              onChange={(event) => setScoringMinLevel(event.target.value)}
              placeholder="20"
            />
          </div>
          <div className="form-group">
            <label htmlFor="scoringMax">Max level</label>
            <input
              id="scoringMax"
              value={scoringMaxLevel}
              onChange={(event) => setScoringMaxLevel(event.target.value)}
              placeholder="30"
            />
          </div>
          <div className="form-group">
            <label htmlFor="scoringScore">Score</label>
            <input
              id="scoringScore"
              value={scoringScore}
              onChange={(event) => setScoringScore(event.target.value)}
              placeholder="25"
            />
          </div>
          <div className="form-group">
            <label htmlFor="scoringOrder">Order</label>
            <input
              id="scoringOrder"
              value={scoringOrder}
              onChange={(event) => setScoringOrder(event.target.value)}
              placeholder="1"
            />
          </div>
          <div className="list">
            <button className="button primary" type="submit">
              {scoringEditingId ? "Update Scoring Rule" : "Add Scoring Rule"}
            </button>
            {scoringEditingId ? (
              <button
                className="button"
                type="button"
                onClick={() => {
                  setScoringEditingId("");
                  setScoringChest("");
                  setScoringSource("");
                  setScoringMinLevel("");
                  setScoringMaxLevel("");
                  setScoringScore("");
                  setScoringOrder("1");
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
        <div className="list inline" style={{ alignItems: "center", flexWrap: "wrap" }}>
          <label htmlFor="scoringSearch" className="text-muted">
            Search
          </label>
          <input
            id="scoringSearch"
            value={scoringSearch}
            onChange={(event) => {
              setScoringSearch(event.target.value);
              setScoringPage(1);
            }}
            placeholder="Chest, source, level, or score"
          />
          <label htmlFor="scoringSort" className="text-muted">
            Sort
          </label>
          <select
            id="scoringSort"
            value={scoringSortKey}
            onChange={(event) => {
              setScoringSortKey(event.target.value as "rule_order" | "score" | "chest_match" | "source_match");
              setScoringPage(1);
            }}
          >
            {scoringSortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Scoring sort direction"
            value={scoringSortDirection}
            onChange={(event) => {
              setScoringSortDirection(event.target.value as "asc" | "desc");
              setScoringPage(1);
            }}
          >
            <option value="asc">Asc</option>
            <option value="desc">Desc</option>
          </select>
          <button
            className="button"
            type="button"
            onClick={() => {
              setScoringSearch("");
              setScoringSortKey("rule_order");
              setScoringSortDirection("asc");
              setScoringPageSize(5);
              setScoringPage(1);
            }}
          >
            Reset
          </button>
          <span className="text-muted">
            {filteredScoringRules.length} / {scoringRules.length}
          </span>
        </div>
        <div className="list">
          {scoringRules.length === 0 ? (
            <div className="list-item">
              <span>No scoring rules</span>
              <span className="badge">Add one</span>
            </div>
          ) : filteredScoringRules.length === 0 ? (
            <div className="list-item">
              <span>No scoring rules match the filters</span>
              <span className="badge">Adjust filters</span>
            </div>
          ) : (
            pagedScoringRules.map((rule) => (
              <div className="list-item" key={rule.id}>
                <span>
                  {rule.chest_match} / {rule.source_match}
                </span>
                <div className="list">
                  <span className="badge">Score {rule.score}</span>
                  <button className="button" type="button" onClick={() => handleEditScoringRule(rule)}>
                    Edit
                  </button>
                  <button className="button danger" type="button" onClick={() => handleDeleteScoringRule(rule.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        {filteredScoringRules.length > 0 ? (
          <div className="list inline" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
            <div className="list inline">
              <button
                className="button"
                type="button"
                disabled={scoringPage === 1}
                onClick={() => setScoringPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </button>
              <button
                className="button"
                type="button"
                disabled={scoringPage >= scoringTotalPages}
                onClick={() => setScoringPage((current) => current + 1)}
              >
                Next
              </button>
            </div>
            <span className="text-muted">
              Page {scoringPage} of {scoringTotalPages}
            </span>
            <div className="list inline">
              <label htmlFor="scoringPageSize" className="text-muted">
                Page size
              </label>
              <select
                id="scoringPageSize"
                value={scoringPageSize}
                onChange={(event) => {
                  setScoringPageSize(Number(event.target.value));
                  setScoringPage(1);
                }}
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
              </select>
            </div>
          </div>
        ) : null}
      </section>
      ) : null}
      {activeSection === "logs" ? (
      <section className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Audit Logs</div>
            <div className="card-subtitle">Latest clan activity</div>
          </div>
          <span className="badge">{auditTotalCount} total</span>
        </div>
        <div className="list inline" style={{ alignItems: "center", flexWrap: "wrap" }}>
          <label htmlFor="auditSearch" className="text-muted">
            Search
          </label>
          <input
            id="auditSearch"
            value={auditSearch}
            onChange={(event) => setAuditSearch(event.target.value)}
            placeholder="Action, entity, or id"
          />
          <label htmlFor="auditClanFilter" className="text-muted">
            Clan
          </label>
          <select
            id="auditClanFilter"
            value={auditClanFilter || "all"}
            onChange={(event) => setAuditClanFilter(event.target.value)}
          >
            <option value="all">All</option>
            {clans.map((clan) => (
              <option key={clan.id} value={clan.id}>
                {clan.name}
              </option>
            ))}
          </select>
          <label htmlFor="auditActionFilter" className="text-muted">
            Action
          </label>
          <select
            id="auditActionFilter"
            value={auditActionFilter}
            onChange={(event) => setAuditActionFilter(event.target.value)}
          >
            <option value="all">All</option>
            {auditActionOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <label htmlFor="auditEntityFilter" className="text-muted">
            Entity
          </label>
          <select
            id="auditEntityFilter"
            value={auditEntityFilter}
            onChange={(event) => setAuditEntityFilter(event.target.value)}
          >
            <option value="all">All</option>
            {auditEntityOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <label htmlFor="auditActorFilter" className="text-muted">
            Actor
          </label>
          <select
            id="auditActorFilter"
            value={auditActorFilter}
            onChange={(event) => setAuditActorFilter(event.target.value)}
          >
            <option value="all">All</option>
            {auditActorOptions.map((actorId) => (
              <option key={actorId} value={actorId}>
                {getAuditActorLabel(actorId)}
              </option>
            ))}
          </select>
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
        {auditTotalCount > 0 ? (
          <div className="list inline" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
            <div className="list inline">
              <button
                className="button"
                type="button"
                disabled={auditPage === 1}
                onClick={() => setAuditPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </button>
              <button
                className="button"
                type="button"
                disabled={auditPage >= auditTotalPages}
                onClick={() => setAuditPage((current) => current + 1)}
              >
                Next
              </button>
            </div>
            <span className="text-muted">
              Page {auditPage} of {auditTotalPages}
            </span>
            <div className="list inline">
              <label htmlFor="auditPageSize" className="text-muted">
                Page size
              </label>
              <select
                id="auditPageSize"
                value={auditPageSize}
                onChange={(event) => {
                  setAuditPageSize(Number(event.target.value));
                  setAuditPage(1);
                }}
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
            </div>
          </div>
        ) : null}
      </section>
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
      {isMemberModalOpen ? (
        <div className="modal-backdrop">
          <div className="modal card">
            <div className="card-header">
              <div>
                <div className="card-title">Add Member</div>
                <div className="card-subtitle">Link an existing user to a game account</div>
              </div>
            </div>
            <form onSubmit={handleAddMember}>
              <div className="form-group">
                <label htmlFor="memberClan">Selected clan</label>
                <input id="memberClan" value={selectedClan?.name ?? ""} disabled />
              </div>
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  value={memberUsername}
                  onChange={(event) => setMemberUsername(event.target.value)}
                  placeholder="username"
                />
              </div>
              <div className="form-group">
                <label htmlFor="userEmail">User Email</label>
                <input
                  id="userEmail"
                  value={memberEmail}
                  onChange={(event) => setMemberEmail(event.target.value)}
                  placeholder="user@example.com"
                />
              </div>
              <div className="form-group">
                <label htmlFor="gameUsername">Game username</label>
                <input
                  id="gameUsername"
                  value={memberGameUsername}
                  onChange={(event) => setMemberGameUsername(event.target.value)}
                  placeholder="In-game account name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="displayName">Game display name</label>
                <input
                  id="displayName"
                  value={memberDisplayName}
                  onChange={(event) => setMemberDisplayName(event.target.value)}
                  placeholder="Defaults to game username"
                />
              </div>
              <div className="form-group">
                <label htmlFor="role">Role</label>
                <select id="role" value={memberRole} onChange={(event) => setMemberRole(event.target.value)}>
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="active">Active</label>
                <select
                  id="active"
                  value={memberActive ? "true" : "false"}
                  onChange={(event) => setMemberActive(event.target.value === "true")}
                >
                  <option value="true">active</option>
                  <option value="false">inactive</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="rank">Rank</label>
                <select id="rank" value={memberRank} onChange={(event) => setMemberRank(event.target.value)}>
                  <option value="">None</option>
                  {rankOptions.map((rank) => (
                    <option key={rank} value={rank}>
                      {rank}
                    </option>
                  ))}
                </select>
              </div>
              <div className="list">
                {memberModalStatus ? <div className="alert info">{memberModalStatus}</div> : null}
                <button className="button primary" type="submit">
                  Add Member
                </button>
                <button className="button" type="button" onClick={handleCloseMemberModal}>
                  Cancel
                </button>
              </div>
            </form>
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
