import { vi } from "vitest";

export const routerMock = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
};

export function resetRouterMock(): void {
  routerMock.push.mockReset();
  routerMock.replace.mockReset();
  routerMock.refresh.mockReset();
  routerMock.back.mockReset();
  routerMock.forward.mockReset();
  routerMock.prefetch.mockReset();
}

const searchParamsStore = new URLSearchParams();

export const searchParamsMock = {
  get: vi.fn((key: string) => searchParamsStore.get(key)),
  getAll: vi.fn((key: string) => searchParamsStore.getAll(key)),
  has: vi.fn((key: string) => searchParamsStore.has(key)),
  toString: vi.fn(() => searchParamsStore.toString()),
  entries: vi.fn(() => searchParamsStore.entries()),
  forEach: vi.fn((cb: (value: string, key: string) => void) => searchParamsStore.forEach(cb)),
  keys: vi.fn(() => searchParamsStore.keys()),
  values: vi.fn(() => searchParamsStore.values()),
};

export function setSearchParam(key: string, value: string): void {
  searchParamsStore.set(key, value);
}

export function clearSearchParams(): void {
  for (const key of Array.from(searchParamsStore.keys())) {
    searchParamsStore.delete(key);
  }
}

let currentPathname = "/";

export function setPathname(path: string): void {
  currentPathname = path;
}

export const redirectMock = vi.fn();
export const notFoundMock = vi.fn();

export function resetRedirectMock(): void {
  redirectMock.mockReset();
  notFoundMock.mockReset();
}

/**
 * Usage:
 * ```ts
 * vi.mock("next/navigation", () => nextNavigationMock());
 * ```
 */
export function nextNavigationMock() {
  return {
    useRouter: () => routerMock,
    useSearchParams: () => searchParamsMock,
    usePathname: () => currentPathname,
    useParams: () => ({}),
    redirect: redirectMock,
    notFound: notFoundMock,
  };
}
