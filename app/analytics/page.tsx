import type { Metadata } from "next";
import AnalyticsClient from "./analytics-client";

export const metadata: Metadata = {
  title: "Analytics",
  description: "Score tracking, player rankings, and performance analytics for [THC] Chiller & Killer.",
  alternates: { canonical: "/analytics" },
};

/**
 * Renders the analytics and stats page.
 */
function AnalyticsPage(): JSX.Element {
  return <AnalyticsClient />;
}

export default AnalyticsPage;
