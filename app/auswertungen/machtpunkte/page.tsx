import type { Metadata } from "next";
import PowerAnalytics from "./power-analytics";

export const metadata: Metadata = {
  title: "Machtpunkte",
  description: "Power score rankings and progression tracking.",
};

export default function MachtpunktePage(): JSX.Element {
  return <PowerAnalytics />;
}
