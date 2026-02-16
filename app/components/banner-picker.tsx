"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import type { BannerPreset } from "@/lib/constants/banner-presets";
import { isCustomBanner } from "@/lib/constants/banner-presets";

export interface BannerPickerProps {
  /** Available banner presets to display in the picker grid. */
  readonly presets: readonly BannerPreset[];
  /** Currently selected banner URL (empty string = no banner). */
  readonly value: string;
  /** Called when the user selects a preset or clears the banner. */
  readonly onChange: (url: string) => void;
  /** File input change handler for custom banner upload. */
  readonly onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Whether a custom banner upload is in progress. */
  readonly isUploading: boolean;
  /** Ref to the hidden file input (caller owns the ref). */
  readonly fileRef: React.RefObject<HTMLInputElement | null>;
  /** Optional aria-labelledby id for the picker group. */
  readonly labelId?: string;
}

/**
 * Reusable banner image picker with live preview, preset grid, and custom upload.
 * Used by events, announcements, and any page that needs banner selection.
 */
function BannerPicker({
  presets,
  value,
  onChange,
  onUpload,
  isUploading,
  fileRef,
  labelId,
}: BannerPickerProps): JSX.Element {
  const t = useTranslations("bannerPicker");
  const isCustom = isCustomBanner(value, presets);

  return (
    <>
      {/* Live preview */}
      {value && (
        <div className="banner-picker-preview">
          <Image src={value} alt={t("selectedBanner")} width={708} height={123} unoptimized />
        </div>
      )}
      <div className="banner-picker-grid" role="group" aria-labelledby={labelId}>
        {/* No banner option */}
        <button
          type="button"
          className={`banner-picker-option banner-picker-none${value === "" ? " selected" : ""}`}
          onClick={() => onChange("")}
          aria-pressed={value === ""}
        >
          {t("noBanner")}
        </button>
        {/* Predefined presets */}
        {presets.map((preset) => (
          <button
            key={preset.src}
            type="button"
            className={`banner-picker-option${value === preset.src ? " selected" : ""}`}
            onClick={() => onChange(preset.src)}
            title={preset.label}
            aria-pressed={value === preset.src}
          >
            <Image src={preset.src} alt={preset.label} width={148} height={52} />
          </button>
        ))}
        {/* Custom upload */}
        <button
          type="button"
          className={`banner-picker-option banner-picker-upload${isCustom ? " selected" : ""}`}
          onClick={() => fileRef.current?.click()}
          aria-pressed={isCustom}
        >
          {isCustom ? (
            <Image
              src={value}
              alt="Custom"
              width={148}
              height={52}
              unoptimized
              className="banner-picker-custom-thumb"
            />
          ) : (
            <>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="banner-picker-upload-label">{t("customBanner")}</span>
            </>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onUpload} />
      </div>
      {isUploading && (
        <p className="mt-1" style={{ fontSize: "0.75rem", color: "var(--color-gold)" }}>
          {t("uploadingImage")}
        </p>
      )}
    </>
  );
}

export default BannerPicker;
