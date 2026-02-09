import type { Metadata } from "next";
import HomeClient from "./home-client";

export const metadata: Metadata = {
  title: "[THC] Chiller & Killer Community Hub",
  description:
    "Welcome to [THC] Chiller & Killer — a focused Total Battle clan built around teamwork, planning, and data-driven play. Join our community hub.",
  alternates: { canonical: "/home" },
};

/**
 * Thin server-component wrapper that delegates to the client-rendered
 * HomeClient component (needed for CMS inline editing).
 */
async function HomePage(): Promise<JSX.Element> {
  return <HomeClient />;
}

export default HomePage;
