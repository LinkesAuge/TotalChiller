import { redirect } from "next/navigation";
import createSupabaseServerClient from "../../lib/supabase/server-client";
import DisplayNameEditor from "./display-name-editor";
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
  readonly role: string;
  readonly is_active: boolean;
}

interface ClanView {
  readonly id: string;
  readonly name: string;
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
    .select("username,username_display,display_name")
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
              username: fallbackUsername,
              username_display: emailPrefix,
              display_name: emailPrefix,
            },
            { onConflict: "id" },
          )
          .select("username,username_display,display_name")
          .single()
      : { data: profileData };
  const userView: UserProfileView = {
    id: userId,
    email: userEmail,
    username: ensuredProfile?.username ?? "Unknown",
    usernameDisplay:
      ensuredProfile?.username_display ??
      ensuredProfile?.username ??
      (userEmail && userEmail !== "Unknown" ? userEmail.split("@")[0] : "Unknown"),
    displayName:
      ensuredProfile?.display_name ??
      ensuredProfile?.username_display ??
      ensuredProfile?.username ??
      "Unknown",
  };
  const { data: membershipData } = await supabase
    .from("clan_memberships")
    .select("clan_id,role,is_active")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("role");
  const memberships = membershipData ?? [];
  const isAdmin = memberships.some((membership) => ["owner", "admin"].includes(membership.role));
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
  const roleLabel = primaryMembership?.role ?? "member";
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
              <span>Display name</span>
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
              <div className="card-title">Edit Display Name</div>
              <div className="card-subtitle">Visible to other members</div>
            </div>
          </div>
          <DisplayNameEditor
            userId={userId}
            email={userEmail}
            initialDisplayName={userView.displayName}
          />
        </section>
        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Clan Memberships</div>
              <div className="card-subtitle">Active roles</div>
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
                <div className="list-item" key={`${membership.clan_id}-${membership.role}`}>
                  <div>
                    <div>{clansById[membership.clan_id]?.name ?? membership.clan_id}</div>
                    <div className="text-muted">{membership.clan_id}</div>
                  </div>
                  <span className="badge">{membership.role}</span>
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
