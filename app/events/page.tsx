import type { Metadata } from "next";
import EventsClient from "./events-client";

export const metadata: Metadata = {
  title: "Events",
  description: "Upcoming events, war schedules, and clan calendar for [THC] Chiller & Killer.",
  alternates: { canonical: "/events" },
  openGraph: {
    title: "Events",
    description: "Upcoming events, war schedules, and clan calendar for [THC] Chiller & Killer.",
    images: [{ url: "/assets/banners/banner_gold_dragon.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Events",
    description: "Upcoming events, war schedules, and clan calendar for [THC] Chiller & Killer.",
    images: ["/assets/banners/banner_gold_dragon.png"],
  },
};

/**
 * Renders the clan events page.
 */
function EventsPage(): JSX.Element {
  return <EventsClient />;
}

export default EventsPage;
