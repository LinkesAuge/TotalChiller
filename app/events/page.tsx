import type { Metadata } from "next";
import EventsClient from "./events-client";

export const metadata: Metadata = {
  title: "Events",
  description: "Upcoming events, war schedules, and clan calendar for The Chillers.",
};

/**
 * Renders the clan events page.
 */
function EventsPage(): JSX.Element {
  return <EventsClient />;
}

export default EventsPage;
