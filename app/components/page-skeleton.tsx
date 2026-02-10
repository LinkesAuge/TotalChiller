/**
 * Shared skeleton loading fallback used inside Suspense boundaries
 * and the route-level loading.tsx.
 *
 * Variants:
 *  - "default" (default)  — 3 skeleton rows: top-bar + content + footer
 *  - "admin"              — taller third row for admin panel tables
 */

interface PageSkeletonProps {
  /** "default" renders h-[120px] footer; "admin" renders h-[400px]. */
  readonly variant?: "default" | "admin";
}

export default function PageSkeleton({ variant = "default" }: PageSkeletonProps): JSX.Element {
  return (
    <div className="content-inner">
      <div className="grid">
        <div className="col-span-full flex flex-col gap-4">
          <div className="skeleton h-14 rounded-lg" />
          <div className="skeleton h-[200px] rounded-lg" />
          <div className={`skeleton rounded-lg ${variant === "admin" ? "h-[400px]" : "h-[120px]"}`} />
        </div>
      </div>
    </div>
  );
}
