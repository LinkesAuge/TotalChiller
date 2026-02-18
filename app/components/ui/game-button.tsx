"use client";

import type { ReactNode, MouseEvent } from "react";

/* ── Asset paths per variant ── */

const VARIANT_ASSETS: Record<GameButtonVariant, string> = {
  ornate1: "/assets/game/buttons/button_171x72_up_1.png",
  ornate2: "/assets/game/buttons/button_171x72_up_2.png",
  ornate3: "/assets/game/buttons/button_171x72_up_3.png",
  hero: "/assets/game/buttons/button_294x72_up_1.png",
  green: "/assets/game/buttons/batler_button_green_up_88x40.png",
  orange: "/assets/game/buttons/batler_button_orange_up_88x40.png",
  purple: "/assets/game/buttons/batler_button_purple_up_88x40.png",
  turquoise: "/assets/game/buttons/batler_button_turquoise_up_88x40.png",
  standard: "/assets/game/buttons/button_104x48_up_1.png",
};

const VARIANT_HEIGHT: Record<GameButtonVariant, number> = {
  ornate1: 49,
  ornate2: 49,
  ornate3: 49,
  hero: 64,
  green: 52,
  orange: 52,
  purple: 52,
  turquoise: 52,
  standard: 52,
};

const VARIANT_RATIO: Record<GameButtonVariant, number> = {
  ornate1: 2.375,
  ornate2: 2.375,
  ornate3: 2.375,
  hero: 4.08,
  green: 2.2,
  orange: 2.2,
  purple: 2.2,
  turquoise: 2.2,
  standard: 2.167,
};

const VARIANT_FONT: Record<GameButtonVariant, string> = {
  ornate1: "0.72rem",
  ornate2: "0.72rem",
  ornate3: "0.72rem",
  hero: "0.88rem",
  green: "0.66rem",
  orange: "0.66rem",
  purple: "0.66rem",
  turquoise: "0.66rem",
  standard: "0.66rem",
};

type GameButtonVariant =
  | "ornate1"
  | "ornate2"
  | "ornate3"
  | "hero"
  | "green"
  | "orange"
  | "purple"
  | "turquoise"
  | "standard";

interface GameButtonProps {
  /** Visual variant determining which asset to use. */
  readonly variant?: GameButtonVariant;
  /** Button label text. */
  readonly children: ReactNode;
  readonly onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  readonly disabled?: boolean;
  readonly type?: "button" | "submit" | "reset";
  readonly ariaLabel?: string;
  readonly className?: string;
  /** Override the default font size for this variant. */
  readonly fontSize?: string;
}

/**
 * Image-backed game button with overlaid label text.
 *
 * All variants use a fixed-size <img> as the background so decorative
 * borders stay pixel-perfect. The label is absolutely positioned on top.
 */
export default function GameButton({
  variant = "ornate1",
  children,
  onClick,
  disabled = false,
  type = "button",
  ariaLabel,
  className,
  fontSize: fontSizeOverride,
}: GameButtonProps): JSX.Element {
  const src = VARIANT_ASSETS[variant];
  const height = VARIANT_HEIGHT[variant];
  const ratio = VARIANT_RATIO[variant];
  const fontSize = fontSizeOverride ?? VARIANT_FONT[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`gbtn ${disabled ? "gbtn--disabled" : ""} ${className ?? ""}`.trim()}
    >
      <img src={src} alt="" height={height} width={Math.round(height * ratio)} className="gbtn-bg" />
      <span className="gbtn-label" style={{ fontSize }}>
        <span className="gbtn-text">{children}</span>
      </span>
    </button>
  );
}

export type { GameButtonVariant, GameButtonProps };
