import type { Metadata } from "next";
import AnalyticsPlaceholder from "./analytics-placeholder";

export const metadata: Metadata = {
  title: "Analytics",
  description: "Clan analytics and performance insights.",
  alternates: { canonical: "/analytics" },
};

function AnalyticsPage(): JSX.Element {
  return <AnalyticsPlaceholder />;
}

export default AnalyticsPage;
