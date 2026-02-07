import type { Metadata } from "next";
import ChartsClient from "./charts-client";

export const metadata: Metadata = {
  title: "Charts",
  description: "Score tracking, player rankings, and chest distribution charts for The Chillers.",
};

/**
 * Renders the charts and stats page.
 */
function ChartsPage(): JSX.Element {
  return <ChartsClient />;
}

export default ChartsPage;
