import { redirect } from "next/navigation";
import createSupabaseServerClient from "../../lib/supabase/server-client";
import DisplayNameEditor from "./display-name-editor";
import GameAccountManager from "./game-account-manager";
import AuthActions from "../components/auth-actions";

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

async function ProfilePage(): Promise<JSX.Element> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    redirect("/home");
  }
  const userEmail = data.user?.email ?? "Unknown";
  const userId = data.user?.id ?? "Unknown";
  const { data: profileData } = await supabase
    .from("profiles")
    .select("user_db,username,display_name")
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
          .select("user_db,username,display_name")
          .single()
      : { data: profileData };
  const userView: UserProfileView = {
    id: userId,
    email: userEmail,
    username: ensuredProfile?.username ?? "Unknown",
    usernameDisplay:
      ensuredProfile?.username ??
      (userEmail && userEmail !== "Unknown" ? userEmail.split("@")[0] : "Unknown"),
    displayName:
      ensuredProfile?.display_name ??
      ensuredProfile?.username ??
      "Unknown",
  };
  const { data: membershipData } = await supabase
    .from("game_account_clan_memberships")
    .select("clan_id,is_active,game_accounts(game_username)")
    .eq("game_accounts.user_id", userId)
    .eq("is_active", true)
    .order("clan_id");
  const memberships = membershipData ?? [];
  const { data: gameAccountData } = await supabase
    .from("game_accounts")
    .select("id,game_username,approval_status,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  const gameAccounts = (gameAccountData ?? []) as readonly GameAccountView[];
  const { data: userRoleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  const userRole = userRoleData?.role ?? "member";
  const { data: isAdminData } = await supabase.rpc("is_any_admin");
  const isAdmin = Boolean(isAdminData);
  const clanIds = memberships.map((membership) => membership.clan_id);
  const { data: clanData } = clanIds.length
    ? await supabase.from("clans").select("id,name").in("id", clanIds)
    : { data: [] as ClanView[] };
  const clansById = (clanData ?? []).reduce<Record<string, ClanView>>((acc, clan) => {
    acc[clan.id] = clan;
    return acc;
  }, {});
  const primaryMembership: MembershipView | null = memberships[0] ?? null;
  const primaryClan = primaryMembership ? clansById[primaryMembership.clan_id] : null;
  const roleLabel = userRole;
  const clanLabel = primaryClan?.name ?? "No clan assigned";

  return (
    <>
      <section className="header header-inline">
        <div className="title">Profile</div>
        <div className="actions">
          <a className="button" href="/settings">
            Settings
          </a>
          <AuthActions />
        </div>
      </section>
      <div className="grid">
        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Account</div>
              <div className="card-subtitle">Supabase user details</div>
            </div>
            <span className="badge">{isAdmin ? "Admin" : roleLabel}</span>
          </div>
          <div className="list">
            <div className="list-item">
              <span>Username</span>
              <strong>{userView.usernameDisplay}</strong>
            </div>
            <div className="list-item">
              <span>Nickname</span>
              <strong>{userView.displayName}</strong>
            </div>
            <div className="list-item">
              <span>Email</span>
              <strong>{userView.email}</strong>
            </div>
            <div className="list-item">
              <span>User ID</span>
              <strong>{userView.id}</strong>
            </div>
            <div className="list-item">
              <span>Primary Clan</span>
              <strong>{clanLabel}</strong>
            </div>
          </div>
        </section>
        <section className="card">
          <div className="card-header">
            <div>
          <div className="card-title">Edit Nickname</div>
              <div className="card-subtitle">Visible to other members</div>
            </div>
          </div>
          <DisplayNameEditor
            userId={userId}
            email={userEmail}
            initialDisplayName={userView.displayName}
          />
        </section>
        <GameAccountManager userId={userId} initialAccounts={gameAccounts} />
        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Clan Memberships</div>
              <div className="card-subtitle">Active clans</div>
            </div>
            <span className="badge">{memberships.length}</span>
          </div>
          <div className="list">
            {memberships.length === 0 ? (
              <div className="list-item">
                <span>No active memberships</span>
                <span className="badge">Join a clan</span>
              </div>
            ) : (
              memberships.map((membership) => (
                <div className="list-item" key={`${membership.clan_id}-${membership.game_accounts?.game_username ?? "account"}`}>
                  <div>
                    <div>{clansById[membership.clan_id]?.name ?? membership.clan_id}</div>
                    <div className="text-muted">{membership.clan_id}</div>
                    {membership.game_accounts ? (
                      <div className="text-muted">
                        {membership.game_accounts.game_username ?? "Game account"}
                      </div>
                    ) : null}
                  </div>
                  <span className="badge">{userRole}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </>
  );
}

export default ProfilePage;
