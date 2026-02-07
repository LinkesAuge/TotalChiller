import type { Metadata } from "next";
import ForumClient from "./forum-client";

export const metadata: Metadata = {
  title: "Forum",
  description: "Community discussion forum for The Chillers clan.",
};

/**
 * Renders the clan forum page.
 */
function ForumPage(): JSX.Element {
  return <ForumClient />;
}

export default ForumPage;
