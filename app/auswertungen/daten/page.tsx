import type { Metadata } from "next";
import DatenClient from "./daten-client";

export const metadata: Metadata = {
  title: "Data",
  description: "Manage data submissions, imports and validation.",
};

export default function DatenPage(): JSX.Element {
  return <DatenClient />;
}
