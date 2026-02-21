import type { Metadata } from "next";
import { Suspense } from "react";
import PlayerAnalytics from "./player-analytics";

export const metadata: Metadata = { title: "Player Stats" };

export default function PlayerPage(): JSX.Element {
  return (
    <Suspense>
      <PlayerAnalytics />
    </Suspense>
  );
}
