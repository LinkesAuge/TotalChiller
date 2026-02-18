import type { ReactNode } from "react";

interface AuthInfoCardProps {
  readonly title: string;
  readonly className?: string;
  readonly bodyClassName?: string;
  readonly defaultOpen?: boolean;
  readonly children: ReactNode;
}

/**
 * Reusable collapsible helper card for auth pages.
 * Keeps critical form actions above the fold on smaller screens.
 */
export default function AuthInfoCard({
  title,
  className,
  bodyClassName,
  defaultOpen = false,
  children,
}: AuthInfoCardProps): JSX.Element {
  const bodyClasses = bodyClassName ? `card-body ${bodyClassName}` : "card-body";
  const containerClasses = className ? `card auth-info-card ${className}` : "card auth-info-card";
  return (
    <section className={containerClasses}>
      <details className="auth-info-details" open={defaultOpen}>
        <summary className="auth-info-summary">
          <span className="auth-info-summary-title">{title}</span>
          <span className="auth-info-summary-chevron" aria-hidden="true">
            ▾
          </span>
        </summary>
        <div className={bodyClasses}>{children}</div>
      </details>
    </section>
  );
}
