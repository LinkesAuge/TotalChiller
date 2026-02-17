"use client";

import type { ReactElement } from "react";

/* ------------------------------------------------------------------ */
/*  Thumbnail Size Presets                                             */
/* ------------------------------------------------------------------ */

export interface SizePreset {
  readonly label: string;
  readonly px: number;
}

export const ASSET_SIZES: SizePreset[] = [
  { label: "XS", px: 48 },
  { label: "S", px: 72 },
  { label: "M", px: 100 },
  { label: "L", px: 140 },
  { label: "XL", px: 200 },
];

export const UI_ELEMENT_SIZES: SizePreset[] = [
  { label: "S", px: 60 },
  { label: "M", px: 90 },
  { label: "L", px: 130 },
];

/* ------------------------------------------------------------------ */
/*  Thumbnail Size Picker                                              */
/* ------------------------------------------------------------------ */

interface ThumbnailSizePickerProps {
  readonly sizes: readonly SizePreset[];
  readonly value: number;
  readonly onChange: (px: number) => void;
  readonly label?: string;
  readonly className?: string;
}

function ThumbnailSizePicker({ sizes, value, onChange, label, className }: ThumbnailSizePickerProps): ReactElement {
  return (
    <div className={className} style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
      {label && <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginRight: 2 }}>{label}</span>}
      {sizes.map((s) => (
        <button
          key={s.label}
          type="button"
          onClick={() => onChange(s.px)}
          title={`${s.px}px`}
          style={{
            padding: "2px 7px",
            fontSize: "0.7rem",
            borderRadius: 4,
            border: value === s.px ? "1px solid var(--color-gold)" : "1px solid var(--color-edge)",
            background: value === s.px ? "rgba(201, 163, 74, 0.15)" : "transparent",
            color: value === s.px ? "var(--color-gold)" : "var(--color-text-2)",
            cursor: "pointer",
            fontWeight: value === s.px ? 600 : 400,
            transition: "all 0.15s",
          }}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

export default ThumbnailSizePicker;
