"use client";

import { type ReactNode } from "react";

interface IconButtonProps {
  readonly ariaLabel: string;
  readonly title?: string;
  readonly onClick?: () => void;
  readonly disabled?: boolean;
  readonly variant?: "default" | "primary" | "danger";
  readonly type?: "button" | "submit" | "reset";
  readonly className?: string;
  readonly children: ReactNode;
}

/**
 * Renders a standardized icon-only button.
 */
function IconButton({
  ariaLabel,
  title,
  onClick,
  disabled = false,
  variant = "default",
  type = "button",
  className,
  children,
}: IconButtonProps): JSX.Element {
  const variantClass = variant === "default" ? "" : variant;
  const classes = ["button", "icon-button", variantClass, className].filter(Boolean).join(" ");
  return (
    <button
      className={classes}
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title ?? ariaLabel}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

export default IconButton;
