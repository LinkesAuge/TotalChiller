import { vi } from "vitest";

export const routerMock = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
};

const searchParamsStore = new URLSearchParams();

export const searchParamsMock = {
  get: (key: string) => searchParamsStore.get(key),
  getAll: (key: string) => searchParamsStore.getAll(key),
  has: (key: string) => searchParamsStore.has(key),
  toString: () => searchParamsStore.toString(),
  entries: () => searchParamsStore.entries(),
  forEach: (cb: (value: string, key: string) => void) => searchParamsStore.forEach(cb),
  keys: () => searchParamsStore.keys(),
  values: () => searchParamsStore.values(),
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
    notFound: vi.fn(),
  };
}
