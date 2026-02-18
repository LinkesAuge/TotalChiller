import PageSkeleton from "../components/page-skeleton";

/**
 * Route-level loading UI — shown during page transitions.
 */
export default function Loading(): JSX.Element {
  return <PageSkeleton variant="messages" />;
}
