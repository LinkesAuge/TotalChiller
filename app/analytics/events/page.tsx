import type { Metadata } from "next";
import { Suspense } from "react";
import EventsAnalytics from "./events-analytics";
import PageSkeleton from "@/app/components/page-skeleton";

export const metadata: Metadata = {
  title: "Event Results",
  description: "Event participation results and rankings.",
};

export default function EventsPage(): JSX.Element {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EventsAnalytics />
    </Suspense>
  );
}
