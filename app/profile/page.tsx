import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import createSupabaseServerClient from "../../lib/supabase/server-client";

export const metadata: Metadata = {
  title: "Profile",
  description: "Your member profile, clan memberships, and game account management.",
};
import DisplayNameEditor from "./display-name-editor";
import GameAccountManager from "./game-account-manager";
import AuthActions from "../components/auth-actions";
import PageTopBar from "../components/page-top-bar";
import SectionHero from "../components/section-hero";

interface UserProfileView {
  readonly id: string;
  readonly email: string;
  readonly username: string;
  readonly usernameDisplay: string;
  readonly displayName: string;
}

interface MembershipView {
  readonly clan_id: string;
  readonly is_active: boolean;
  readonly game_accounts: { readonly game_username: string } | null;
}

type MembershipQueryView = Omit<MembershipView, "game_accounts"> & {
  readonly game_accounts: { readonly game_username: string } | readonly { readonly game_username: string }[] | null;
};

import { ROLE_LABELS as PERM_ROLE_LABELS, toRole, isAdmin as isAdminRole } from "@/lib/permissions";

function formatRole(role: string): string {
  return PERM_ROLE_LABELS[toRole(role)] ?? role.charAt(0).toUpperCase() + role.slice(1);
}

interface ClanView {
  readonly id: string;
  readonly name: string;
}

interface GameAccountView {
  readonly id: string;
  readonly game_username: string;
  readonly approval_status: string;
  readonly created_at: string;
}

/**
 * Renders the authenticated user's profile overview.
 */
export const dynamic = "force-dynamic";

/** Async content streamed via Suspense. */
async function ProfileContent(): Promise<JSX.Element> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    redirect("/home");
  }
  const userEmail = data.user?.email ?? "Unknown";
  const userId = data.user?.id ?? "Unknown";
  const { data: profileData } = await supabase
    .from("profiles")
    .select("user_db,username,display_name,default_game_account_id")
    .eq("id", userId)
    .maybeSingle();
  const emailPrefix = userEmail && userEmail !== "Unknown" ? userEmail.split("@")[0] : "user";
  const fallbackSuffix = userId !== "Unknown" ? userId.replace(/-/g, "").slice(-6) : "000000";
  const fallbackUsername = `${emailPrefix}_${fallbackSuffix}`.toLowerCase();
  const { data: ensuredProfile } =
    !profileData && userId !== "Unknown" && userEmail !== "Unknown"
      ? await supabase
          .from("profiles")
          .upsert(
            {
              id: userId,
              email: userEmail,
              user_db: fallbackUsername,
              username: emailPrefix,
              display_name: emailPrefix,
            },
            { onConflict: "id" },
          )
          .select("user_db,username,display_name,default_game_account_id")
          .single()
      : { data: profileData };
  const userView: UserProfileView = {
    id: userId,
    email: userEmail,
    username: ensuredProfile?.username ?? "Unknown",
    usernameDisplay:
      ensuredProfile?.username ?? (userEmail && userEmail !== "Unknown" ? userEmail.split("@")[0] : "Unknown"),
    displayName: ensuredProfile?.display_name ?? ensuredProfile?.username ?? "Unknown",
  };
  const { data: membershipData } = await supabase
    .from("game_account_clan_memberships")
    .select("clan_id,is_active,game_accounts(game_username)")
    .eq("game_accounts.user_id", userId)
    .eq("is_active", true)
    .order("clan_id");
  const memberships: readonly MembershipView[] = ((membershipData ?? []) as readonly MembershipQueryView[]).map(
    (membership) => ({
      ...membership,
      game_accounts: Array.isArray(membership.game_accounts)
        ? (membership.game_accounts[0] ?? null)
        : membership.game_accounts,
    }),
  );
  const { data: gameAccountData } = await supabase
    .from("game_accounts")
    .select("id,game_username,approval_status,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  const gameAccounts = (gameAccountData ?? []) as readonly GameAccountView[];
  const { data: userRoleData } = await supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
  const userRole = userRoleData?.role ?? "member";
  const clanIds = memberships.map((membership) => membership.clan_id);
  const { data: clanData } = clanIds.length
    ? await supabase.from("clans").select("id,name").in("id", clanIds)
    : { data: [] as ClanView[] };
  const clansById: Record<string, ClanView> = {};
  (clanData ?? []).forEach((clan) => {
    clansById[clan.id] = clan;
  });
  const t = await getTranslations("profile");
  const locale = await getLocale();
  const primaryMembership: MembershipView | null = memberships[0] ?? null;
  const primaryClan = primaryMembership ? clansById[primaryMembership.clan_id] : null;
  const roleLabel = formatRole(userRole);
  const clanLabel = primaryClan?.name ?? t("noClanAssigned");

  return (
    <>
      <PageTopBar
        breadcrumb={t("breadcrumb")}
        title={t("title")}
        actions={
          <>
            <a className="button" href="/settings">
              {t("settingsButton")}
            </a>
            <AuthActions />
          </>
        }
      />
      <SectionHero title={t("heroTitle")} subtitle={t("heroSubtitle")} bannerSrc="/assets/banners/banner_captain.png" />
      <div className="content-inner">
        <div className="grid">
          <section className="card">
            <div className="card-header">
              <div>
                <div className="card-title">{t("accountTitle")}</div>
                <div className="card-subtitle">{t("accountSubtitle")}</div>
              </div>
              <span className="badge">{roleLabel}</span>
            </div>
            <div className="list">
              <div className="list-item">
                <span>{t("username")}</span>
                <strong>{userView.usernameDisplay}</strong>
              </div>
              <div className="list-item">
                <span>{t("nickname")}</span>
                <strong>{userView.displayName}</strong>
              </div>
              <div className="list-item">
                <span>{t("email")}</span>
                <strong>{userView.email}</strong>
              </div>
              <div className="list-item">
                <span>{t("userId")}</span>
                <strong>{userView.id}</strong>
              </div>
              <div className="list-item">
                <span>{t("primaryClan")}</span>
                <strong>{clanLabel}</strong>
              </div>
            </div>
          </section>
          <section className="card">
            <div className="card-header">
              <div>
                <div className="card-title">{t("editNickname")}</div>
                <div className="card-subtitle">{t("visibleToMembers")}</div>
              </div>
            </div>
            <DisplayNameEditor userId={userId} email={userEmail} initialDisplayName={userView.displayName} />
          </section>
          <GameAccountManager
            userId={userId}
            initialAccounts={gameAccounts}
            initialDefaultId={(ensuredProfile?.default_game_account_id as string | null) ?? null}
          />
          <section className="card">
            <div className="card-header">
              <div>
                <div className="card-title">{t("clanMemberships")}</div>
                <div className="card-subtitle">{t("activeClans")}</div>
              </div>
              <span className="badge">{memberships.length}</span>
            </div>
            <div className="list">
              {memberships.length === 0 ? (
                <div className="list-item">
                  <span>{t("noActiveMemberships")}</span>
                  <span className="badge">{t("joinAClan")}</span>
                </div>
              ) : (
                memberships.map((membership, index) => (
                  <div
                    className="list-item"
                    key={`${membership.clan_id}-${membership.game_accounts?.game_username ?? `account-${index}`}`}
                  >
                    <div>
                      <div>{clansById[membership.clan_id]?.name ?? membership.clan_id}</div>
                      <div className="text-muted">{membership.clan_id}</div>
                      {membership.game_accounts ? (
                        <div className="text-muted">{membership.game_accounts.game_username ?? t("gameAccount")}</div>
                      ) : null}
                    </div>
                    <span className="badge">{roleLabel}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

/**
 * Profile page with Suspense streaming.
 */
function ProfilePage(): JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="content-inner">
          <div className="grid">
            <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="skeleton" style={{ height: 56, borderRadius: 8 }} />
              <div className="skeleton" style={{ height: 300, borderRadius: 8 }} />
              <div className="skeleton" style={{ height: 200, borderRadius: 8 }} />
              <div className="skeleton" style={{ height: 200, borderRadius: 8 }} />
            </div>
          </div>
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}

export default ProfilePage;
