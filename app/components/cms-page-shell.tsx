"use client";

import PageTopBar from "./page-top-bar";
import { LoadingSkeleton, ErrorBanner } from "./cms-shared";

/**
 * Shared shell for CMS-powered pages (home, about, contact, privacy-policy).
 *
 * Handles the common loading → error → content flow so each page only
 * needs to provide its grid content as children.
 */

interface CmsPageShellProps {
  /** Page heading rendered in the top bar. */
  readonly title: string;
  /** Optional breadcrumb text above the title. */
  readonly breadcrumb?: string;
  /** Optional right-side actions (e.g. PublicAuthActions). */
  readonly actions?: React.ReactNode;
  /** Optional slot rendered between the top bar and content (e.g. hero banner). Only shown when loaded. */
  readonly heroSlot?: React.ReactNode;
  /** Whether the CMS data has finished loading. */
  readonly isLoaded: boolean;
  /** Error message from useSiteContent (null when no error). */
  readonly error: string | null;
  /** Number of skeleton rows while loading (default 4). */
  readonly loadingRows?: number;
  /** Extra class names for the .content-inner wrapper (e.g. "content-constrained"). */
  readonly contentClassName?: string;
  /** Page-specific grid content — rendered inside .content-inner > .grid. */
  readonly children: React.ReactNode;
}

export default function CmsPageShell({
  title,
  breadcrumb,
  actions,
  heroSlot,
  isLoaded,
  error,
  loadingRows = 4,
  contentClassName,
  children,
}: CmsPageShellProps): JSX.Element {
  return (
    <>
      <PageTopBar breadcrumb={breadcrumb} title={title} actions={actions} />

      {isLoaded ? heroSlot : null}

      <div className={`content-inner ${contentClassName ?? ""}`}>
        {!isLoaded ? (
          <LoadingSkeleton rows={loadingRows} />
        ) : (
          <>
            {error ? <ErrorBanner message={error} /> : null}
            <div className="grid">{children}</div>
          </>
        )}
      </div>
    </>
  );
}
