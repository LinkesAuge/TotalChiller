"use client";

import AuthActions from "./auth-actions";
import PageTopBar from "./page-top-bar";
import SectionHero from "./section-hero";

interface PageShellProps {
  /** Optional breadcrumb text above the title. */
  readonly breadcrumb?: string;
  /** Page heading rendered as h1 in the top bar. */
  readonly title: string;
  /** Optional right-side actions. Defaults to `<AuthActions />`. Pass `null` to hide. */
  readonly actions?: React.ReactNode | null;
  /** Hero title. When provided with `heroSubtitle` and `bannerSrc`, renders a SectionHero. */
  readonly heroTitle?: string;
  /** Hero subtitle (required alongside `heroTitle`). */
  readonly heroSubtitle?: string;
  /** Banner image source for the SectionHero. */
  readonly bannerSrc?: string;
  /** Optional custom hero slot — overrides the default SectionHero. */
  readonly heroSlot?: React.ReactNode;
  /** Optional extra class name(s) appended to the `.content-inner` wrapper. */
  readonly contentClassName?: string;
  /** Page content rendered inside `.content-inner`. */
  readonly children: React.ReactNode;
}

/**
 * Shared page layout composing PageTopBar + optional SectionHero + content wrapper.
 *
 * Reduces boilerplate across all authenticated pages that follow the
 * `PageTopBar + SectionHero + <div className="content-inner">` pattern.
 */
export default function PageShell({
  breadcrumb,
  title,
  actions,
  heroTitle,
  heroSubtitle,
  bannerSrc,
  heroSlot,
  contentClassName,
  children,
}: PageShellProps): JSX.Element {
  const actionsNode = actions === null ? undefined : (actions ?? <AuthActions />);
  return (
    <>
      <PageTopBar breadcrumb={breadcrumb} title={title} actions={actionsNode} />
      {heroSlot ? (
        heroSlot
      ) : heroTitle && heroSubtitle && bannerSrc ? (
        <SectionHero title={heroTitle} subtitle={heroSubtitle} bannerSrc={bannerSrc} />
      ) : null}
      <div className={contentClassName ? `content-inner ${contentClassName}` : "content-inner"}>{children}</div>
    </>
  );
}
