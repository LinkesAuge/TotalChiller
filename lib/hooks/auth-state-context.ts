"use client";

import { createContext, useContext } from "react";
import type { Role } from "@/lib/permissions";

export interface AuthStateContextValue {
  readonly userId: string | null;
  readonly isAuthenticated: boolean;
  readonly isLoading: boolean;
  readonly role: Role;
  readonly isRoleLoading: boolean;
}

export const AuthStateContext = createContext<AuthStateContextValue | null>(null);

export function useAuthStateContext(): AuthStateContextValue | null {
  return useContext(AuthStateContext);
}
