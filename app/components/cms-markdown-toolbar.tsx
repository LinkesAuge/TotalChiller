"use client";

/**
 * CmsMarkdownToolbar — Formatting toolbar for CMS markdown text areas.
 *
 * Based on the forum MarkdownToolbar but with:
 * - Configurable storage bucket (not hardcoded "forum-images")
 * - CMS-specific CSS class prefix (cms-md-toolbar)
 * - Fixed upload error handling (isUploading always resets)
 */

import { useRef, useState, useMemo, type RefObject, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import type { SupabaseClient } from "@supabase/supabase-js";

/* ─── Toolbar actions ─── */

interface ToolbarAction {
  readonly label: string;
  readonly icon: string;
  readonly prefix: string;
  readonly suffix: string;
  readonly placeholder: string;
  readonly block?: boolean;
}

/** Builds the toolbar actions array using translated labels. */
function buildToolbarActions(t: ReturnType<typeof useTranslations>): ToolbarAction[] {
  return [
    { label: t("bold"), icon: "B", prefix: "**", suffix: "**", placeholder: "bold text" },
    { label: t("italic"), icon: "I", prefix: "_", suffix: "_", placeholder: "italic text" },
    { label: t("heading"), icon: "H", prefix: "## ", suffix: "", placeholder: "Heading", block: true },
    { label: t("link"), icon: "🔗", prefix: "[", suffix: "](https://)", placeholder: "link text" },
    { label: t("imageUrl"), icon: "🖼️", prefix: "![", suffix: "](https://image-url)", placeholder: "alt text" },
    { label: t("list"), icon: "•", prefix: "- ", suffix: "", placeholder: "list item", block: true },
    { label: t("numberedList"), icon: "1.", prefix: "1. ", suffix: "", placeholder: "list item", block: true },
    { label: t("quote"), icon: "❝", prefix: "> ", suffix: "", placeholder: "quote", block: true },
    { label: t("code"), icon: "</>", prefix: "`", suffix: "`", placeholder: "code" },
    { label: t("divider"), icon: "—", prefix: "\n---\n", suffix: "", placeholder: "", block: true },
  ];
}

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/* ─── Props ─── */

interface CmsMarkdownToolbarProps {
  readonly textareaRef: RefObject<HTMLTextAreaElement | null>;
  readonly value: string;
  readonly onChange: (value: string) => void;
  /** Supabase client — required for image upload. */
  readonly supabase?: SupabaseClient;
  /** Current user ID — required for image upload. */
  readonly userId?: string;
  /** Storage bucket name for image uploads (default: "cms-images") */
  readonly storageBucket?: string;
}

/** Generate a unique storage path for an uploaded file. */
function generateStoragePath(userId: string, fileName: string): string {
  const timestamp = Date.now();
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${userId}/${timestamp}_${sanitized}`;
}

/**
 * CMS-specific formatting toolbar for markdown text areas.
 * Supports text formatting, image upload via file picker.
 */
function CmsMarkdownToolbar({
  textareaRef,
  value,
  onChange,
  supabase,
  userId,
  storageBucket = "forum-images",
}: CmsMarkdownToolbarProps): JSX.Element {
  const t = useTranslations("cmsToolbar");
  const toolbarActions = useMemo(() => buildToolbarActions(t), [t]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  /** Insert text at the current cursor position in the textarea. */
  function insertAtCursor(text: string): void {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(value + text);
      return;
    }
    const start = textarea.selectionStart;
    const newText = value.substring(0, start) + text + value.substring(start);
    onChange(newText);
    requestAnimationFrame(() => {
      textarea.focus();
      const cursorPos = start + text.length;
      textarea.setSelectionRange(cursorPos, cursorPos);
    });
  }

  /** Apply a formatting action around the current selection. */
  function applyFormat(action: ToolbarAction): void {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end);
    const insertion = selected || action.placeholder;
    let prefix = action.prefix;
    if (action.block && start > 0 && value[start - 1] !== "\n") {
      prefix = "\n" + prefix;
    }
    const newText = value.substring(0, start) + prefix + insertion + action.suffix + value.substring(end);
    onChange(newText);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + insertion.length);
    });
  }

  /** Upload a single image file to Supabase Storage and insert its markdown. */
  async function uploadImage(file: File): Promise<void> {
    if (!supabase || !userId) {
      setUploadError(t("loginRequiredToUpload"));
      return;
    }
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setUploadError(t("unsupportedFileType", { type: file.type }));
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadError(t("fileTooLargeMb", { max: MAX_FILE_SIZE_MB }));
      return;
    }
    setUploadError("");
    setIsUploading(true);
    try {
      const filePath = generateStoragePath(userId, file.name || "image.png");
      const { error: uploadErr } = await supabase.storage
        .from(storageBucket)
        .upload(filePath, file, { cacheControl: "3600", upsert: false });
      if (uploadErr) {
        setUploadError(t("uploadFailed", { message: uploadErr.message }));
        setIsUploading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from(storageBucket).getPublicUrl(filePath);
      const altText = (file.name || "image").replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
      insertAtCursor(`\n![${altText}](${urlData.publicUrl})\n`);
    } catch {
      setUploadError(t("uploadUnexpectedError"));
    } finally {
      setIsUploading(false);
    }
  }

  function handleFileInputChange(e: ChangeEvent<HTMLInputElement>): void {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;
      void uploadImage(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const canUpload = Boolean(supabase && userId);

  return (
    <div>
      <div className="forum-md-toolbar">
        {toolbarActions.map((action) => (
          <button
            key={action.label}
            type="button"
            className="forum-md-toolbar-btn"
            title={action.label}
            aria-label={action.label}
            onClick={() => applyFormat(action)}
          >
            {action.icon}
          </button>
        ))}
        {/* Separator + Upload */}
        <span className="forum-md-toolbar-sep" />
        <button
          type="button"
          className="forum-md-toolbar-btn forum-md-toolbar-upload"
          title={canUpload ? t("uploadImageTooltip", { max: MAX_FILE_SIZE_MB }) : t("loginRequired")}
          aria-label={t("uploadImage")}
          onClick={() => fileInputRef.current?.click()}
          disabled={!canUpload || isUploading}
        >
          {isUploading ? <span className="forum-upload-spinner" /> : "📎"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          multiple
          onChange={handleFileInputChange}
          className="hidden"
          aria-hidden="true"
        />
      </div>
      {uploadError && (
        <div className="forum-upload-error">
          {uploadError}
          <button
            type="button"
            onClick={() => setUploadError("")}
            className="forum-upload-error-close"
            aria-label={t("closeError")}
          >
            ✕
          </button>
        </div>
      )}
      {isUploading && <div className="forum-upload-status">{t("uploadingImage")}</div>}
    </div>
  );
}

export default CmsMarkdownToolbar;
