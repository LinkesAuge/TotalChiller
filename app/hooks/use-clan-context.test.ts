// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

import useClanContext from "./use-clan-context";

const CLAN_KEY = "tc.currentClanId";
const GAME_ACCOUNT_KEY = "tc.currentGameAccountId";

describe("useClanContext", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when no localStorage values are set", async () => {
    const { result } = renderHook(() => useClanContext());

    await waitFor(() => {
      expect(result.current).toBeNull();
    });
  });

  it("returns null when only clanId is set", async () => {
    window.localStorage.setItem(CLAN_KEY, "clan-1");

    const { result } = renderHook(() => useClanContext());

    await waitFor(() => {
      expect(result.current).toBeNull();
    });
  });

  it("returns null when only gameAccountId is set", async () => {
    window.localStorage.setItem(GAME_ACCOUNT_KEY, "ga-1");

    const { result } = renderHook(() => useClanContext());

    await waitFor(() => {
      expect(result.current).toBeNull();
    });
  });

  it("returns context when both values are present", async () => {
    window.localStorage.setItem(CLAN_KEY, "clan-1");
    window.localStorage.setItem(GAME_ACCOUNT_KEY, "ga-1");

    const { result } = renderHook(() => useClanContext());

    await waitFor(() => {
      expect(result.current).toEqual({
        clanId: "clan-1",
        gameAccountId: "ga-1",
      });
    });
  });

  it("updates when 'clan-context-change' event fires", async () => {
    const { result } = renderHook(() => useClanContext());

    await waitFor(() => {
      expect(result.current).toBeNull();
    });

    act(() => {
      window.localStorage.setItem(CLAN_KEY, "clan-2");
      window.localStorage.setItem(GAME_ACCOUNT_KEY, "ga-2");
      window.dispatchEvent(new Event("clan-context-change"));
    });

    await waitFor(() => {
      expect(result.current).toEqual({
        clanId: "clan-2",
        gameAccountId: "ga-2",
      });
    });
  });

  it("reverts to null when localStorage is cleared via event", async () => {
    window.localStorage.setItem(CLAN_KEY, "clan-1");
    window.localStorage.setItem(GAME_ACCOUNT_KEY, "ga-1");

    const { result } = renderHook(() => useClanContext());

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    act(() => {
      window.localStorage.clear();
      window.dispatchEvent(new Event("clan-context-change"));
    });

    await waitFor(() => {
      expect(result.current).toBeNull();
    });
  });

  it("removes event listener on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() => useClanContext());
    unmount();

    expect(removeSpy).toHaveBeenCalledWith("clan-context-change", expect.any(Function));
  });
});
