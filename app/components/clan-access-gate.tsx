"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";

interface ClanAccessGateProps {
  readonly children: React.ReactNode;
}

function isPublicPath(pathname: string): boolean {
  return (
    pathname.startsWith("/home") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/about") ||
    pathname.startsWith("/contact") ||
    pathname.startsWith("/privacy-policy") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/not-authorized") ||
    pathname.startsWith("/redesign")
  );
}

/**
 * Hides clan-scoped content until a user belongs to a non-unassigned clan.
 */
function ClanAccessGate({ children }: ClanAccessGateProps): JSX.Element {
  const pathname = usePathname();
  const supabase = createSupabaseBrowserClient();
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isActive = true;
    async function loadAccess(): Promise<void> {
      if (isPublicPath(pathname)) {
        if (isActive) {
          setHasAccess(true);
          setIsLoading(false);
        }
        return;
      }
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        if (isActive) {
          setHasAccess(false);
          setIsLoading(false);
        }
        return;
      }
      const { data, error } = await supabase
        .from("game_account_clan_memberships")
        .select("id,clans(is_unassigned)")
        .eq("is_active", true)
        .eq("clans.is_unassigned", false)
        .limit(1);
      if (!isActive) {
        return;
      }
      if (error) {
        setHasAccess(false);
        setIsLoading(false);
        return;
      }
      setHasAccess(Boolean(data && data.length > 0));
      setIsLoading(false);
    }
    void loadAccess();
    return () => {
      isActive = false;
    };
  }, [pathname, supabase]);

  if (isPublicPath(pathname)) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="content-inner">
        <div className="grid">
          <div className="card" style={{ gridColumn: "1 / -1" }}>
            <div className="card-header">
              <h3 className="card-title">Loading access</h3>
            </div>
            <div className="card-body">
              <div className="text-muted">Checking your clan membership…</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="content-inner">
        <div className="grid">
          <div className="alert warn" style={{ gridColumn: "1 / -1" }}>
            You do not have access to clan areas yet. Please contact an admin to assign a clan.
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <a className="button primary" href="/home">
              Go to Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default ClanAccessGate;
