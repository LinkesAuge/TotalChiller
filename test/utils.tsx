import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import { type ReactElement, type ReactNode } from "react";
import { AuthStateContext, type AuthStateContextValue } from "@/lib/hooks/auth-state-context";
import type { Role } from "@/lib/permissions";

interface TestProviderOptions {
  authState?: Partial<AuthStateContextValue>;
  locale?: string;
}

const DEFAULT_AUTH_STATE: AuthStateContextValue = {
  userId: "test-user-id",
  isAuthenticated: true,
  isLoading: false,
  role: "member" as Role,
  isRoleLoading: false,
};

function createWrapper(options: TestProviderOptions = {}) {
  const authValue: AuthStateContextValue = {
    ...DEFAULT_AUTH_STATE,
    ...options.authState,
  };

  return function TestProviders({ children }: { children: ReactNode }) {
    return <AuthStateContext.Provider value={authValue}>{children}</AuthStateContext.Provider>;
  };
}

/**
 * Custom render that wraps components in all required providers.
 *
 * Usage:
 * ```tsx
 * const { getByText } = renderWithProviders(<MyComponent />, {
 *   authState: { role: "admin", userId: "admin-1" },
 * });
 * ```
 */
export function renderWithProviders(
  ui: ReactElement,
  options: TestProviderOptions & Omit<RenderOptions, "wrapper"> = {},
): RenderResult {
  const { authState, locale, ...renderOptions } = options;
  return render(ui, {
    wrapper: createWrapper({ authState, locale }),
    ...renderOptions,
  });
}

export { DEFAULT_AUTH_STATE };
