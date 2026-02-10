"use client";

import Image from "next/image";

interface PageTopBarProps {
  /** Optional breadcrumb text above the title. */
  readonly breadcrumb?: string;
  /** Page heading rendered as h1. */
  readonly title: string;
  /** Optional right-side actions (AuthActions, buttons, badges). */
  readonly actions?: React.ReactNode;
}

/**
 * Shared top bar used on every page.
 *
 * Renders the ornate header background, an optional breadcrumb,
 * the page title, and an optional right-aligned actions slot.
 */
export default function PageTopBar({ breadcrumb, title, actions }: PageTopBarProps): JSX.Element {
  return (
    <div className="top-bar">
      <Image
        src="/assets/vip/header_3.png"
        alt=""
        role="presentation"
        className="top-bar-bg"
        width={1200}
        height={56}
        priority
      />
      <div className="top-bar-inner">
        <div>
          {breadcrumb ? <div className="top-bar-breadcrumb">{breadcrumb}</div> : null}
          <h1 className="top-bar-title">{title}</h1>
        </div>
        {actions ? <div style={{ display: "flex", alignItems: "center", gap: 12 }}>{actions}</div> : null}
      </div>
    </div>
  );
}
