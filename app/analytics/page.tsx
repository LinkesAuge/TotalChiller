import type { Metadata } from "next";
import AnalyticsOverview from "./analytics-overview";

export const metadata: Metadata = {
  title: "Analytics",
  description: "Clan analytics and performance insights.",
  alternates: { canonical: "/analytics" },
};

export default function AnalyticsPage(): JSX.Element {
  return <AnalyticsOverview />;
}
