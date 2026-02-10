/**
 * Route-level loading UI — shown during page transitions.
 */
export default function Loading(): JSX.Element {
  return (
    <div className="content-inner">
      <div className="grid">
        <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Skeleton top bar */}
          <div className="skeleton" style={{ height: 56, borderRadius: 8 }} />
          {/* Skeleton content cards */}
          <div className="skeleton" style={{ height: 200, borderRadius: 8 }} />
          <div className="skeleton" style={{ height: 120, borderRadius: 8 }} />
        </div>
      </div>
    </div>
  );
}
