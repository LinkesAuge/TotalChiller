/**
 * Route-level loading UI — shown during page transitions.
 */
export default function Loading(): JSX.Element {
  return (
    <div className="content-inner">
      <div className="grid">
        <div className="col-span-full flex flex-col gap-4">
          {/* Skeleton top bar */}
          <div className="skeleton h-14 rounded-lg" />
          {/* Skeleton content cards */}
          <div className="skeleton h-[200px] rounded-lg" />
          <div className="skeleton h-[120px] rounded-lg" />
        </div>
      </div>
    </div>
  );
}
