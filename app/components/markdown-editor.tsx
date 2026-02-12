"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import type { SupabaseClient } from "@supabase/supabase-js";
import AppMarkdownToolbar, { handleImagePaste, handleImageDrop } from "@/lib/markdown/app-markdown-toolbar";

const AppMarkdown = dynamic(() => import("@/lib/markdown/app-markdown"), {
  loading: () => <div className="skeleton h-32 rounded" />,
});

export interface MarkdownEditorProps {
  /** HTML id for the textarea element. */
  readonly id?: string;
  /** Current markdown content. */
  readonly value: string;
  /** Called when the content changes. */
  readonly onChange: (value: string) => void;
  /** Supabase client for image uploads. */
  readonly supabase: SupabaseClient;
  /** Current user ID for image uploads. */
  readonly userId: string;
  /** Placeholder text for the textarea. */
  readonly placeholder?: string;
  /** Number of visible textarea rows. */
  readonly rows?: number;
  /** Minimum height of the textarea/preview in px. */
  readonly minHeight?: number;
  /** Storage bucket name for image uploads (default: "forum-images"). */
  readonly storageBucket?: string;
}

/**
 * Reusable markdown editor with write/preview tabs, formatting toolbar,
 * and image paste/drop support. Used by events, announcements, and forum.
 */
function MarkdownEditor({
  id,
  value,
  onChange,
  supabase,
  userId,
  placeholder,
  rows = 8,
  minHeight = 200,
  storageBucket,
}: MarkdownEditorProps): JSX.Element {
  const t = useTranslations("markdownEditor");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [isImageUploading, setIsImageUploading] = useState<boolean>(false);

  return (
    <>
      <div className="forum-editor-tabs">
        <button
          type="button"
          className={`forum-editor-tab${!isPreviewMode ? " active" : ""}`}
          onClick={() => setIsPreviewMode(false)}
        >
          {t("write")}
        </button>
        <button
          type="button"
          className={`forum-editor-tab${isPreviewMode ? " active" : ""}`}
          onClick={() => setIsPreviewMode(true)}
        >
          {t("preview")}
        </button>
      </div>
      {isPreviewMode ? (
        <div className="forum-editor-preview p-4" style={{ minHeight }}>
          {value.trim() ? (
            <AppMarkdown content={value} />
          ) : (
            <p style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}>{t("previewEmpty")}</p>
          )}
        </div>
      ) : (
        <>
          <AppMarkdownToolbar
            textareaRef={textareaRef}
            value={value}
            onChange={onChange}
            supabase={supabase}
            userId={userId}
            storageBucket={storageBucket}
          />
          <textarea
            id={id}
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className="text-[0.88rem] leading-relaxed"
            style={{ minHeight, fontFamily: "var(--font-body)" }}
            onPaste={(e) => handleImagePaste(e, supabase, userId, (md) => onChange(value + md), setIsImageUploading, storageBucket)}
            onDrop={(e) => handleImageDrop(e, supabase, userId, (md) => onChange(value + md), setIsImageUploading, storageBucket)}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />
          {isImageUploading && (
            <p className="mt-1" style={{ fontSize: "0.75rem", color: "var(--color-gold)" }}>
              {t("uploadingImage")}
            </p>
          )}
          <p className="mt-1 text-[0.72rem] text-text-muted">{t("markdownHint")}</p>
        </>
      )}
    </>
  );
}

export default MarkdownEditor;
