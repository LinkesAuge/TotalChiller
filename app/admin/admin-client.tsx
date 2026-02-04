"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";

interface ClanRow {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
}

interface MembershipRow {
  readonly id: string;
  readonly clan_id: string;
  readonly user_id: string;
  readonly role: string;
  readonly is_active: boolean;
  readonly rank: string | null;
}

interface MembershipEditState {
  readonly role?: string;
  readonly is_active?: boolean;
  readonly rank?: string | null;
  readonly clan_id?: string;
  readonly display_name?: string;
  readonly username?: string;
  readonly email?: string;
}

interface ProfileRow {
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

/**
 * Admin UI for clan and membership management.
 */
function AdminClient(): JSX.Element {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clans, setClans] = useState<readonly ClanRow[]>([]);
  const [memberships, setMemberships] = useState<readonly MembershipRow[]>([]);
  const [selectedClanId, setSelectedClanId] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [memberUserId, setMemberUserId] = useState<string>("");
  const [memberUsername, setMemberUsername] = useState<string>("");
  const [memberEmail, setMemberEmail] = useState<string>("");
  const [memberRole, setMemberRole] = useState<string>("member");
  const [memberActive, setMemberActive] = useState<boolean>(true);
  const [memberRank, setMemberRank] = useState<string>("");
  const [membershipEditingId, setMembershipEditingId] = useState<string>("");
  const [membershipEdits, setMembershipEdits] = useState<Record<string, MembershipEditState>>({});
  const [isMemberModalOpen, setIsMemberModalOpen] = useState<boolean>(false);
  const [profilesById, setProfilesById] = useState<Record<string, ProfileRow>>({});
  const [memberSearch, setMemberSearch] = useState<string>("");
  const [memberRoleFilter, setMemberRoleFilter] = useState<string>("all");
  const [memberStatusFilter, setMemberStatusFilter] = useState<string>("all");
  const [validationRules, setValidationRules] = useState<readonly RuleRow[]>([]);
  const [correctionRules, setCorrectionRules] = useState<readonly RuleRow[]>([]);
  const [scoringRules, setScoringRules] = useState<readonly RuleRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<readonly AuditLogRow[]>([]);
  const [auditActorsById, setAuditActorsById] = useState<Record<string, ProfileRow>>({});
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
  const [activeSection, setActiveSection] = useState<"clans" | "rules" | "logs">("clans");
  const [isClanModalOpen, setIsClanModalOpen] = useState<boolean>(false);
  const [clanModalMode, setClanModalMode] = useState<"create" | "edit">("create");
  const [clanModalName, setClanModalName] = useState<string>("");
  const [clanModalDescription, setClanModalDescription] = useState<string>("");
  const [defaultClanId, setDefaultClanId] = useState<string>("");

  const selectedClan = useMemo(
    () => clans.find((clan) => clan.id === selectedClanId),
    [clans, selectedClanId],
  );

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
      const profile = profilesById[membership.user_id];
      const searchText = [
        profile?.display_name,
        profile?.username_display,
        profile?.username,
        profile?.email,
        membership.user_id,
      ]
        .filter((value): value is string => Boolean(value))
        .join(" ")
        .toLowerCase();
      return searchText.includes(normalizedSearch);
    });
  }, [memberRoleFilter, memberSearch, memberStatusFilter, memberships, profilesById]);

  function resolveSection(value: string | null): "clans" | "rules" | "logs" {
    if (value === "rules" || value === "logs") {
      return value;
    }
    return "clans";
  }

  function updateActiveSection(nextSection: "clans" | "rules" | "logs"): void {
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
      setSelectedClanId(data[0].id);
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
      .from("clan_memberships")
      .select("id,clan_id,user_id,role,is_active,rank")
      .eq("clan_id", clanId)
      .order("role");
    if (error) {
      setStatus(`Failed to load memberships: ${error.message}`);
      return;
    }
    const membershipRows = data ?? [];
    setMemberships(membershipRows);
    const userIds = membershipRows.map((row) => row.user_id);
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

  async function loadAuditLogs(clanId: string): Promise<void> {
    if (!clanId) {
      setAuditLogs([]);
      setAuditActorsById({});
      return;
    }
    const { data, error } = await supabase
      .from("audit_logs")
      .select("id,clan_id,actor_id,action,entity,entity_id,diff,created_at")
      .eq("clan_id", clanId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      setStatus(`Failed to load audit logs: ${error.message}`);
      return;
    }
    const rows = data ?? [];
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

  useEffect(() => {
    void loadClans();
    void loadDefaultClan();
  }, []);

  useEffect(() => {
    const nextSection = resolveSection(searchParams.get("tab"));
    setActiveSection(nextSection);
  }, [searchParams]);

  useEffect(() => {
    void loadMemberships(selectedClanId);
    void loadRules(selectedClanId);
    void loadAuditLogs(selectedClanId);
  }, [selectedClanId]);

  useEffect(() => {
    if (clans.length === 0) {
      return;
    }
    if (defaultClanId && clans.some((clan) => clan.id === defaultClanId)) {
      setSelectedClanId(defaultClanId);
    }
  }, [clans, defaultClanId]);

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
      setStatus("Select a clan first.");
      return;
    }
    let resolvedUserId = memberUserId.trim();
    const identifier = memberUsername.trim() || memberEmail.trim();
    if (!resolvedUserId && identifier) {
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
        setStatus(payload.error ?? "Failed to find user.");
        return;
      }
      resolvedUserId = payload.id ?? "";
    }
    if (!resolvedUserId) {
      setStatus("User ID or email is required.");
      return;
    }
    setStatus("Adding member...");
    const payload = {
      clan_id: selectedClanId,
      user_id: resolvedUserId,
      role: memberRole,
      is_active: memberActive,
      rank: memberRank.trim() || null,
    };
    const previousMembership = membershipEditingId
      ? memberships.find((membership) => membership.id === membershipEditingId)
      : undefined;
    const { data, error } = membershipEditingId
      ? await supabase
          .from("clan_memberships")
          .update(payload)
          .eq("id", membershipEditingId)
          .select("id")
          .single()
      : await supabase
          .from("clan_memberships")
          .upsert(payload, { onConflict: "clan_id,user_id" })
          .select("id")
          .single();
    if (error) {
      setStatus(`Failed to add member: ${error.message}`);
      return;
    }
    const membershipId = data?.id ?? membershipEditingId;
    const actorId = await getCurrentUserId();
    const roleChanged = previousMembership?.role !== undefined && previousMembership.role !== payload.role;
    const activeChanged =
      previousMembership?.is_active !== undefined && previousMembership.is_active !== payload.is_active;
    const isNewMembership = !previousMembership;
    if (actorId && membershipId && (isNewMembership || roleChanged || activeChanged)) {
      await insertAuditLogs([
        {
          clan_id: selectedClanId,
          actor_id: actorId,
          action: membershipEditingId ? "update" : "upsert",
          entity: "clan_memberships",
          entity_id: membershipId,
          diff: {
            user_id: payload.user_id,
            role: {
              from: previousMembership?.role ?? null,
              to: payload.role,
            },
            is_active: {
              from: previousMembership?.is_active ?? null,
              to: payload.is_active,
            },
          },
        },
      ]);
    }
    setMemberUserId("");
    setMemberUsername("");
    setMemberEmail("");
    setMembershipEditingId("");
    setStatus("Member updated.");
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
    const { error } = await supabase.from("clan_memberships").delete().eq("id", membershipId);
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
          entity: "clan_memberships",
          entity_id: membershipId,
          diff: {
            user_id: membership.user_id,
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
    setMemberUserId(membership.user_id);
    setMemberUsername("");
    setMemberEmail("");
    setMemberRole(membership.role);
    setMemberActive(membership.is_active);
  }

  function updateMembershipEdit(membershipId: string, field: keyof MembershipEditState, value: string): void {
    setMembershipEdits((current) => {
      const baseMembership = memberships.find((entry) => entry.id === membershipId);
      const baseProfile = baseMembership ? profilesById[baseMembership.user_id] : undefined;
      const existing = current[membershipId] ?? {
        role: baseMembership?.role ?? "member",
        is_active: baseMembership?.is_active ?? true,
        rank: baseMembership?.rank ?? "",
        clan_id: baseMembership?.clan_id ?? selectedClanId,
        display_name: baseProfile?.display_name ?? "",
        username: baseProfile?.username_display ?? baseProfile?.username ?? "",
        email: baseProfile?.email ?? "",
      };
      const nextValue = field === "is_active" ? value === "true" : value;
      return {
        ...current,
        [membershipId]: { ...existing, [field]: nextValue },
      };
    });
  }

  function getMembershipEditValue(membership: MembershipRow): MembershipEditState {
    const profile = profilesById[membership.user_id];
    return {
      role: membershipEdits[membership.id]?.role ?? membership.role,
      is_active: membershipEdits[membership.id]?.is_active ?? membership.is_active,
      rank: membershipEdits[membership.id]?.rank ?? membership.rank ?? "",
      clan_id: membershipEdits[membership.id]?.clan_id ?? membership.clan_id,
      display_name: membershipEdits[membership.id]?.display_name ?? profile?.display_name ?? "",
      username:
        membershipEdits[membership.id]?.username ??
        profile?.username_display ??
        profile?.username ??
        "",
      email: membershipEdits[membership.id]?.email ?? profile?.email ?? "",
    };
  }

  async function handleSaveMembershipEdit(membership: MembershipRow, shouldReload: boolean = true): Promise<void> {
    const edits = membershipEdits[membership.id];
    if (!edits) {
      setStatus("No changes to save.");
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
      user_id: membership.user_id,
      role: nextEdits.role ?? membership.role,
      is_active: nextEdits.is_active ?? membership.is_active,
      rank: nextEdits.rank ?? membership.rank,
    };
    const { error } = await supabase.from("clan_memberships").update(membershipPayload).eq("id", membership.id);
    if (error) {
      setStatus(`Failed to update member: ${error.message}`);
      return;
    }
    const profilePayload = {
      id: membership.user_id,
      email: nextEdits.email ?? profilesById[membership.user_id]?.email ?? "",
      display_name: nextEdits.display_name ?? profilesById[membership.user_id]?.display_name ?? null,
      username: nextEdits.username ? nextEdits.username.toLowerCase() : profilesById[membership.user_id]?.username,
      username_display: nextEdits.username ?? profilesById[membership.user_id]?.username_display ?? null,
    };
    await supabase.from("profiles").upsert(profilePayload, { onConflict: "id" });
    await insertAuditLogs([
      {
        clan_id: membership.clan_id,
        actor_id: actorId,
        action: "update",
        entity: "clan_memberships",
        entity_id: membership.id,
        diff: {
          user_id: membership.user_id,
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
    for (const membershipId of editEntries) {
      const membership = memberships.find((entry) => entry.id === membershipId);
      if (!membership) {
        continue;
      }
      await handleSaveMembershipEdit(membership, false);
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
    setMemberUserId("");
    setMemberUsername("");
    setMemberEmail("");
    setMemberRole("member");
    setMemberActive(true);
    setMemberRank("");
    setIsMemberModalOpen(true);
  }

  function handleCloseMemberModal(): void {
    setIsMemberModalOpen(false);
  }

  function getMembershipLabel(membership: MembershipRow): string {
    const profile = profilesById[membership.user_id];
    if (!profile) {
      return membership.user_id;
    }
    if (profile.display_name && profile.display_name.trim()) {
      return profile.display_name;
    }
    if (profile.username_display && profile.username_display.trim()) {
      return profile.username_display;
    }
    if (profile.username && profile.username.trim()) {
      return profile.username;
    }
    return profile.email;
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
        <div className="list inline" style={{ alignItems: "center", flexWrap: "wrap" }}>
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
              <span>Username</span>
              <span>Role</span>
              <span>Email</span>
              <span>Display name</span>
              <span>Clan</span>
              <span>Rank</span>
              <span>Status</span>
              <span>Actions</span>
            </header>
            {filteredMemberships.map((membership) => (
              <div className="row" key={membership.id}>
                <input
                  value={getMembershipEditValue(membership).username ?? ""}
                  onChange={(event) => updateMembershipEdit(membership.id, "username", event.target.value)}
                  placeholder="Username"
                />
                <select
                  value={getMembershipEditValue(membership).role}
                  onChange={(event) => updateMembershipEdit(membership.id, "role", event.target.value)}
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <input
                  value={getMembershipEditValue(membership).email ?? ""}
                  onChange={(event) => updateMembershipEdit(membership.id, "email", event.target.value)}
                  placeholder="Email"
                />
                <input
                  value={getMembershipEditValue(membership).display_name ?? ""}
                  onChange={(event) => updateMembershipEdit(membership.id, "display_name", event.target.value)}
                  placeholder="Display name"
                />
                <select
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
        <div className="list">
          {validationRules.length === 0 ? (
            <div className="list-item">
              <span>No validation rules</span>
              <span className="badge">Add one</span>
            </div>
          ) : (
            validationRules.map((rule) => (
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
        <div className="list">
          {correctionRules.length === 0 ? (
            <div className="list-item">
              <span>No correction rules</span>
              <span className="badge">Add one</span>
            </div>
          ) : (
            correctionRules.map((rule) => (
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
        <div className="list">
          {scoringRules.length === 0 ? (
            <div className="list-item">
              <span>No scoring rules</span>
              <span className="badge">Add one</span>
            </div>
          ) : (
            scoringRules.map((rule) => (
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
      </section>
      ) : null}
      {activeSection === "logs" ? (
      <section className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Audit Logs</div>
            <div className="card-subtitle">Latest clan activity</div>
          </div>
          <span className="badge">Last 50</span>
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
                <div className="card-subtitle">Use username, email, or user ID</div>
              </div>
            </div>
            <form onSubmit={handleAddMember}>
              <div className="form-group">
                <label htmlFor="memberClan">Selected clan</label>
                <input id="memberClan" value={selectedClan?.name ?? ""} disabled />
              </div>
              <div className="form-group">
                <label htmlFor="userId">User ID</label>
                <input
                  id="userId"
                  value={memberUserId}
                  onChange={(event) => setMemberUserId(event.target.value)}
                  placeholder="Supabase user UUID"
                />
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
                <input
                  id="rank"
                  value={memberRank}
                  onChange={(event) => setMemberRank(event.target.value)}
                  placeholder="Rank"
                />
              </div>
              <div className="list">
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
