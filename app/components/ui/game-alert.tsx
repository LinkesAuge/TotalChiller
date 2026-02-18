"use client";

import type { ReactNode } from "react";
import GameIcon from "./game-icon";

type GameAlertVariant = "warn" | "success" | "error" | "info";

const VARIANT_ICON: Record<GameAlertVariant, string> = {
  warn: "warning",
  success: "success",
  error: "error",
  info: "info",
};

const VARIANT_TITLE_COLOR: Record<GameAlertVariant, string> = {
  warn: "var(--color-gold-2)",
  success: "#5ec07e",
  error: "#e05555",
  info: "#6ba3d6",
};

interface GameAlertProps {
  /** Alert type — controls icon, border color, and gradient tint. */
  readonly variant: GameAlertVariant;
  /** Bold heading line. */
  readonly title?: string;
  /** Body content. */
  readonly children?: ReactNode;
  /** Optional retry callback (shown as a button). */
  readonly onRetry?: () => void;
  /** Extra CSS class. */
  readonly className?: string;
}

/**
 * Game-themed notification panel with gradient background,
 * colored left accent stripe, and curated game icon per variant.
 */
export default function GameAlert({ variant, title, children, onRetry, className }: GameAlertProps): JSX.Element {
  return (
    <div className={`game-alert game-alert--${variant} ${className ?? ""}`.trim()} role="alert">
      <div className="game-alert__inner">
        <GameIcon name={VARIANT_ICON[variant]} size="lg" className="game-alert__icon" />
        <div className="game-alert__body">
          {title && (
            <div className="game-alert__title" style={{ color: VARIANT_TITLE_COLOR[variant] }}>
              {title}
            </div>
          )}
          {children && <div className="game-alert__text">{children}</div>}
          {onRetry && (
            <button type="button" className="game-alert__retry" onClick={onRetry}>
              ↻ Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export type { GameAlertVariant, GameAlertProps };
