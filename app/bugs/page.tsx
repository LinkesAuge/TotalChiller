import type { Metadata } from "next";
import BugsClient from "./bugs-client";

export const metadata: Metadata = {
  title: "Bug Reports",
  description: "Report issues, track bugs, and follow their resolution.",
  alternates: { canonical: "/bugs" },
};

function BugsPage(): JSX.Element {
  return <BugsClient />;
}

export default BugsPage;
