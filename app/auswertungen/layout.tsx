import type { ReactNode } from "react";

interface AnalyticsLayoutProps {
  readonly children: ReactNode;
}

export default function AnalyticsLayout({ children }: AnalyticsLayoutProps): JSX.Element {
  return <>{children}</>;
}
