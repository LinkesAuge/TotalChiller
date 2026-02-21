import type { Metadata } from "next";
import ChestsAnalytics from "./chests-analytics";

export const metadata: Metadata = {
  title: "Chest Rankings",
  description: "Chest collection rankings and trends.",
};

export default function ChestsPage(): JSX.Element {
  return <ChestsAnalytics />;
}
