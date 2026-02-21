import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { clearCookies, clearHeaders } from "./mocks/next-headers";
import { clearSearchParams, setPathname, resetRouterMock, resetRedirectMock } from "./mocks/next-navigation";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  clearCookies();
  clearHeaders();
  clearSearchParams();
  setPathname("/");
  resetRouterMock();
  resetRedirectMock();
});
