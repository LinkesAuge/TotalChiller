"use client";

import { useEffect, useState } from "react";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";

interface ClanScopeState {
  readonly clanName: string;
  readonly gameLabel: string;
}

const CLAN_STORAGE_KEY: string = "tc.currentClanId";
const GAME_ACCOUNT_STORAGE_KEY: string = "tc.currentGameAccountId";

/**
 * Displays the currently selected clan/game account context.
 */
function ClanScopeBanner(): JSX.Element {
  const supabase = createSupabaseBrowserClient();
  const [scope, setScope] = useState<ClanScopeState | null>(null);
  const [isMissing, setIsMissing] = useState<boolean>(false);

  useEffect(() => {
    let isActive = true;
    async function loadScope(): Promise<void> {
      const clanId = window.localStorage.getItem(CLAN_STORAGE_KEY) ?? \"\";
      const gameAccountId = window.localStorage.getItem(GAME_ACCOUNT_STORAGE_KEY) ?? \"\";
      if (!clanId || !gameAccountId) {
        if (isActive) {
          setScope(null);
          setIsMissing(true);
        }
        return;
      }
      const [{ data: clanData }, { data: gameAccountData }] = await Promise.all([
        supabase.from(\"clans\").select(\"name\").eq(\"id\", clanId).maybeSingle(),
        supabase.from(\"game_accounts\").select(\"game_username,display_name\").eq(\"id\", gameAccountId).maybeSingle(),
      ]);
      if (!isActive) {
        return;
      }
      setScope({
        clanName: clanData?.name ?? clanId,
        gameLabel: gameAccountData?.display_name ?? gameAccountData?.game_username ?? gameAccountId,
      });
      setIsMissing(false);
    }
    void loadScope();
    function handleContextChange(): void {
      void loadScope();
    }
    window.addEventListener(\"clan-context-change\", handleContextChange);
    return () => {
      isActive = false;
      window.removeEventListener(\"clan-context-change\", handleContextChange);
    };
  }, [supabase]);

  if (isMissing) {
    return (
      <div className=\"alert warn\" style={{ gridColumn: \"span 12\" }}>
        Select a clan in the sidebar to see clan-specific content.
      </div>
    );
  }

  if (!scope) {
    return null;
  }

  return (
    <div className=\"alert info\" style={{ gridColumn: \"span 12\" }}>
      Viewing <strong>{scope.clanName}</strong> • <strong>{scope.gameLabel}</strong>
    </div>
  );
}

export default ClanScopeBanner;
