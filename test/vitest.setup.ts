import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, vi } from "vitest";
import { clearCookies, clearHeaders } from "./mocks/next-headers";
import { clearSearchParams, setPathname, resetRouterMock, resetRedirectMock } from "./mocks/next-navigation";

const SUPPRESSED_PATTERNS = [
  "Not implemented: navigation",
  "Not implemented: HTMLMediaElement",
  "Not implemented: Window",
  "is an async Client Component",
  "the `act` call was not awaited",
  "cannot be a child of",
];

beforeAll(() => {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    const msg = typeof args[0] === "string" ? args[0] : String(args[0]);
    if (SUPPRESSED_PATTERNS.some((p) => msg.includes(p))) return;
    originalError.apply(console, args);
  };
});

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
