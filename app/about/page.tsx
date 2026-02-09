import type { Metadata } from "next";
import AboutClient from "./about-client";

export const metadata: Metadata = {
  title: "About [THC] Chiller & Killer",
  description:
    "Learn about [THC] Chiller & Killer — a competitive Total Battle clan focused on teamwork, data-driven strategy, and community building.",
  alternates: { canonical: "/about" },
};

export default function AboutPage(): JSX.Element {
  return <AboutClient />;
}
