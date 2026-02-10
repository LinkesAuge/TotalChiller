"use client";

import { useTranslations } from "next-intl";

/**
 * Shared CMS sub-components used across all CMS pages.
 * - LoadingSkeleton: Animated skeleton loading state
 * - ErrorBanner: Error display with optional retry
 * - CmsSection: Card wrapper with header + body
 */

/* ─── LoadingSkeleton ─── */

interface LoadingSkeletonProps {
  /** Number of skeleton rows (default: 3) */
  readonly rows?: number;
}

export function LoadingSkeleton({ rows = 3 }: LoadingSkeletonProps): JSX.Element {
  return (
    <div className="cms-loading-skeleton">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="cms-skeleton-row">
          <div className="cms-skeleton-line cms-skeleton-line-short" />
          <div className="cms-skeleton-line" />
          <div className="cms-skeleton-line cms-skeleton-line-medium" />
        </div>
      ))}
    </div>
  );
}

/* ─── ErrorBanner ─── */

interface ErrorBannerProps {
  /** Error message to display */
  readonly message: string;
  /** Optional retry callback */
  readonly onRetry?: () => void;
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps): JSX.Element {
  const t = useTranslations("common");
  return (
    <div className="cms-error-banner" role="alert">
      <span className="cms-error-banner-icon">⚠</span>
      <span className="cms-error-banner-text">{message}</span>
      {onRetry && (
        <button className="cms-error-banner-retry" type="button" onClick={onRetry} aria-label={t("retry")}>
          {t("retry")}
        </button>
      )}
    </div>
  );
}

/* ─── CmsSection ─── */

interface CmsSectionProps {
  /** Section content */
  readonly children: React.ReactNode;
  /** Additional CSS class */
  readonly className?: string;
  /** Section ID for anchor linking */
  readonly id?: string;
}

export function CmsSection({ children, className = "", id }: CmsSectionProps): JSX.Element {
  return (
    <section className={`cms-section card ${className}`.trim()} id={id}>
      {children}
    </section>
  );
}
