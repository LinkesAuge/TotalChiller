"use client";

import { useEffect, useState } from "react";

interface ClanContextState {
  readonly clanId: string;
  readonly gameAccountId: string;
}

const CLAN_STORAGE_KEY: string = "tc.currentClanId";
const GAME_ACCOUNT_STORAGE_KEY: string = "tc.currentGameAccountId";

/**
 * Reads the currently selected clan + game account from local storage.
 */
function useClanContext(): ClanContextState | null {
  const [state, setState] = useState<ClanContextState | null>(null);

  useEffect(() => {
    function readState(): void {
      const clanId = window.localStorage.getItem(CLAN_STORAGE_KEY) ?? "";
      const gameAccountId = window.localStorage.getItem(GAME_ACCOUNT_STORAGE_KEY) ?? "";
      if (!clanId || !gameAccountId) {
        setState(null);
        return;
      }
      setState({ clanId, gameAccountId });
    }
    readState();
    function handleChange(): void {
      readState();
    }
    window.addEventListener("clan-context-change", handleChange);
    return () => {
      window.removeEventListener("clan-context-change", handleChange);
    };
  }, []);

  return state;
}

export default useClanContext;
