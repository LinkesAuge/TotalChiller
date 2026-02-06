"use client";

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";

interface SidebarContextValue {
  readonly isOpen: boolean;
  readonly toggle: () => void;
  readonly width: number;
}

const EXPANDED_WIDTH = 236;
const COLLAPSED_WIDTH = 60;

const SidebarContext = createContext<SidebarContextValue>({
  isOpen: true,
  toggle: () => undefined,
  width: EXPANDED_WIDTH,
});

interface SidebarProviderProps {
  readonly children: ReactNode;
}

/**
 * Provides sidebar expand/collapse state to the layout and navigation.
 */
function SidebarProvider({ children }: SidebarProviderProps): JSX.Element {
  const [isOpen, setIsOpen] = useState<boolean>(true);

  const toggle = useCallback((): void => {
    setIsOpen((prev) => !prev);
  }, []);

  const width = isOpen ? EXPANDED_WIDTH : COLLAPSED_WIDTH;

  const value = useMemo<SidebarContextValue>(
    () => ({ isOpen, toggle, width }),
    [isOpen, toggle, width],
  );

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}

/**
 * Hook to access sidebar expand/collapse state.
 */
function useSidebar(): SidebarContextValue {
  return useContext(SidebarContext);
}

export { SidebarProvider, useSidebar };
export default SidebarProvider;
