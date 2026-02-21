import type { ReactNode } from "react";

/**
 * Shared skeleton loading fallback used inside Suspense boundaries
 * and the route-level loading.tsx.
 */
export type PageSkeletonVariant =
  | "default"
  | "dashboard"
  | "list"
  | "table"
  | "detail"
  | "article"
  | "auth"
  | "form"
  | "messages"
  | "admin";

interface PageSkeletonProps {
  /**
   * Page-surface specific loading shape.
   * Keeps loading states consistent across dashboard/list/table/detail views.
   */
  readonly variant?: PageSkeletonVariant;
}

interface SkeletonProps {
  readonly className: string;
}

function Skeleton({ className }: SkeletonProps): JSX.Element {
  return <div className={`skeleton ${className}`.trim()} />;
}

function TopChromeSkeleton(): JSX.Element {
  return (
    <>
      <Skeleton className="h-14 rounded-lg" />
      <Skeleton className="h-[168px] rounded-lg" />
    </>
  );
}

function InsetSurface({ children }: { readonly children: ReactNode }): JSX.Element {
  return <div className="rounded-lg border border-white/10 p-3">{children}</div>;
}

function renderSurfaceSkeleton(variant: PageSkeletonVariant): JSX.Element {
  switch (variant) {
    case "dashboard":
      return (
        <>
          <TopChromeSkeleton />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton key={`dashboard-stat-${idx}`} className="h-[88px] rounded-lg" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <Skeleton className="h-[260px] rounded-lg" />
            <div className="flex flex-col gap-4">
              <Skeleton className="h-[120px] rounded-lg" />
              <Skeleton className="h-[120px] rounded-lg" />
            </div>
          </div>
        </>
      );
    case "list":
      return (
        <>
          <TopChromeSkeleton />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-10 w-36 rounded-full" />
            <Skeleton className="h-10 w-28 rounded-full" />
            <Skeleton className="h-10 w-32 rounded-full" />
          </div>
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton key={`list-row-${idx}`} className="h-[116px] rounded-lg" />
            ))}
          </div>
        </>
      );
    case "table":
      return (
        <>
          <TopChromeSkeleton />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-10 w-36 rounded-full" />
            <Skeleton className="h-10 w-48 rounded-full" />
            <Skeleton className="h-10 w-28 rounded-full" />
          </div>
          <InsetSurface>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-10 rounded-lg" />
              {Array.from({ length: 6 }).map((_, idx) => (
                <Skeleton key={`table-row-${idx}`} className="h-12 rounded-lg" />
              ))}
            </div>
          </InsetSurface>
        </>
      );
    case "detail":
      return (
        <>
          <TopChromeSkeleton />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <Skeleton className="h-[280px] rounded-lg" />
            <div className="flex flex-col gap-4">
              <Skeleton className="h-[132px] rounded-lg" />
              <Skeleton className="h-[132px] rounded-lg" />
            </div>
          </div>
          <Skeleton className="h-[160px] rounded-lg" />
        </>
      );
    case "article":
      return (
        <>
          <TopChromeSkeleton />
          <InsetSurface>
            <div className="flex flex-col gap-3">
              <Skeleton className="h-8 w-2/3 rounded-lg" />
              <Skeleton className="h-5 w-1/2 rounded-lg" />
              <Skeleton className="h-5 w-full rounded-lg" />
              <Skeleton className="h-5 w-full rounded-lg" />
              <Skeleton className="h-5 w-11/12 rounded-lg" />
              <Skeleton className="h-[180px] rounded-lg" />
              <Skeleton className="h-5 w-full rounded-lg" />
              <Skeleton className="h-5 w-10/12 rounded-lg" />
            </div>
          </InsetSurface>
        </>
      );
    case "auth":
      return (
        <>
          <TopChromeSkeleton />
          <div className="mx-auto w-full max-w-xl">
            <Skeleton className="h-[420px] rounded-lg" />
          </div>
        </>
      );
    case "form":
      return (
        <>
          <TopChromeSkeleton />
          <Skeleton className="h-[180px] rounded-lg" />
          <Skeleton className="h-[240px] rounded-lg" />
          <Skeleton className="h-10 w-40 rounded-lg" />
        </>
      );
    case "messages":
      return (
        <>
          <TopChromeSkeleton />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-10 w-28 rounded-full" />
            <Skeleton className="h-10 w-28 rounded-full" />
            <Skeleton className="h-10 w-36 rounded-full" />
          </div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <InsetSurface>
              <div className="flex flex-col gap-3">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Skeleton key={`messages-list-${idx}`} className="h-16 rounded-lg" />
                ))}
              </div>
            </InsetSurface>
            <InsetSurface>
              <div className="flex flex-col gap-3">
                <Skeleton className="h-10 rounded-lg" />
                <Skeleton className="h-[220px] rounded-lg" />
                <Skeleton className="h-[132px] rounded-lg" />
              </div>
            </InsetSurface>
          </div>
        </>
      );
    case "admin":
      return (
        <>
          <TopChromeSkeleton />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-10 w-28 rounded-full" />
            <Skeleton className="h-10 w-28 rounded-full" />
            <Skeleton className="h-10 w-28 rounded-full" />
            <Skeleton className="h-10 w-28 rounded-full" />
          </div>
          <InsetSurface>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-10 rounded-lg" />
              {Array.from({ length: 8 }).map((_, idx) => (
                <Skeleton key={`admin-row-${idx}`} className="h-[52px] rounded-lg" />
              ))}
            </div>
          </InsetSurface>
        </>
      );
    case "default":
    default:
      return (
        <>
          <TopChromeSkeleton />
          <Skeleton className="h-[220px] rounded-lg" />
          <Skeleton className="h-[140px] rounded-lg" />
        </>
      );
  }
}

export default function PageSkeleton({ variant = "default" }: PageSkeletonProps): JSX.Element {
  return (
    <div className="content-inner">
      <div className="grid">
        <div className="col-span-full flex flex-col gap-4">{renderSurfaceSkeleton(variant)}</div>
      </div>
    </div>
  );
}
