"use client";

import type { FormEvent, ChangeEvent, RefObject } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BANNER_PRESETS } from "@/lib/constants/banner-presets";
import RadixSelect from "../components/ui/radix-select";
import BannerPicker from "../components/banner-picker";
import MarkdownEditor from "../components/markdown-editor";
import GameButton from "../components/ui/game-button";

/* ── Types ── */

/** Grouped form field values. */
export interface NewsFormValues {
  readonly title: string;
  readonly content: string;
  readonly status: "draft" | "pending" | "published";
  readonly isPinned: boolean;
  readonly tagsInput: string;
  readonly bannerUrl: string;
}

export interface NewsFormProps {
  /** Ref attached to the outer section for scroll-into-view. */
  readonly editFormRef: RefObject<HTMLElement | null>;
  /** True when editing an existing article. */
  readonly isEditing: boolean;
  /** Current form field values. */
  readonly values: NewsFormValues;
  /** Generic field updater — called with field name and new value. */
  readonly onFieldChange: (field: keyof NewsFormValues, value: string | boolean) => void;
  /** Whether the form is currently submitting. */
  readonly isSaving: boolean;
  /** Whether a banner image is being uploaded. */
  readonly isBannerUploading: boolean;
  /** Ref for the hidden file input used by BannerPicker. */
  readonly bannerFileRef: RefObject<HTMLInputElement | null>;
  /** Handler for banner file selection. */
  readonly onBannerUpload: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  /** Form submit handler. */
  readonly onSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  /** Cancel / close handler. */
  readonly onCancel: () => void;
  /** Supabase client (needed by MarkdownEditor for image uploads). */
  readonly supabase: SupabaseClient;
  /** Current user ID (needed by MarkdownEditor). */
  readonly userId: string;
  /** Translation function. */
  readonly t: (key: string) => string;
}

/* ── Component ── */

export default function NewsForm({
  editFormRef,
  isEditing,
  values,
  onFieldChange,
  isSaving,
  isBannerUploading,
  bannerFileRef,
  onBannerUpload,
  onSubmit,
  onCancel,
  supabase,
  userId,
  t,
}: NewsFormProps): JSX.Element {
  return (
    <section className="card col-span-full" ref={editFormRef}>
      <div className="card-header">
        <div>
          <div className="card-title">{isEditing ? t("editPost") : t("createPost")}</div>
          <div className="card-subtitle">{t("visibleToClan")}</div>
        </div>
      </div>
      <form onSubmit={onSubmit} className="pt-0 px-4 pb-4">
        {/* Title */}
        <div className="form-group">
          <label htmlFor="newsTitle">{t("titleLabel")}</label>
          <input
            id="newsTitle"
            value={values.title}
            onChange={(e) => onFieldChange("title", e.target.value)}
            placeholder={t("titlePlaceholder")}
          />
        </div>

        {/* Banner selection */}
        <div className="form-group">
          <label id="newsBannerLabel">{t("bannerLabel")}</label>
          <BannerPicker
            presets={BANNER_PRESETS}
            value={values.bannerUrl}
            onChange={(v) => onFieldChange("bannerUrl", v)}
            onUpload={onBannerUpload}
            isUploading={isBannerUploading}
            fileRef={bannerFileRef}
            labelId="newsBannerLabel"
          />
        </div>

        {/* Content editor */}
        <div className="form-group">
          <label htmlFor="newsContent">{t("contentLabel")}</label>
          <MarkdownEditor
            id="newsContent"
            value={values.content}
            onChange={(v) => onFieldChange("content", v)}
            supabase={supabase}
            userId={userId}
            placeholder={t("contentPlaceholder")}
            rows={14}
            minHeight={250}
          />
        </div>

        {/* Status, Tags, Pin */}
        <div className="form-grid">
          <div className="form-group mb-0">
            <label htmlFor="newsStatus">{t("status")}</label>
            <RadixSelect
              id="newsStatus"
              ariaLabel={t("status")}
              value={values.status}
              onValueChange={(v) => onFieldChange("status", v)}
              options={[
                { value: "draft", label: t("draft") },
                { value: "pending", label: t("pending") },
                { value: "published", label: t("published") },
              ]}
            />
          </div>
          <div className="form-group mb-0">
            <label htmlFor="newsTags">{t("tags")}</label>
            <input
              id="newsTags"
              value={values.tagsInput}
              onChange={(e) => onFieldChange("tagsInput", e.target.value)}
              placeholder={t("tagsPlaceholder")}
            />
          </div>
        </div>
        <div className="list inline mt-3">
          <label className="text-muted inline-flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={values.isPinned}
              onChange={(e) => onFieldChange("isPinned", e.target.checked)}
              style={{ accentColor: "var(--color-gold)" }}
            />
            {t("pinLabel")}
          </label>
        </div>
        <div className="list inline mt-4">
          <GameButton variant="green" fontSize="0.6rem" type="submit" disabled={isSaving}>
            {isSaving ? t("saving") : isEditing ? t("save") : t("createPost")}
          </GameButton>
          <button className="button" type="button" onClick={onCancel}>
            {t("cancel")}
          </button>
        </div>
      </form>
    </section>
  );
}
