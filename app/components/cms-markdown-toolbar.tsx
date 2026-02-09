"use client";

/**
 * CmsMarkdownToolbar — Formatting toolbar for CMS markdown text areas.
 *
 * Based on the forum MarkdownToolbar but with:
 * - Configurable storage bucket (not hardcoded "forum-images")
 * - CMS-specific CSS class prefix (cms-md-toolbar)
 * - Fixed upload error handling (isUploading always resets)
 */

import { useRef, useState, type RefObject, type ChangeEvent } from "react";
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

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  { label: "Bold", icon: "B", prefix: "**", suffix: "**", placeholder: "bold text" },
  { label: "Italic", icon: "I", prefix: "_", suffix: "_", placeholder: "italic text" },
  { label: "Heading", icon: "H", prefix: "## ", suffix: "", placeholder: "Heading", block: true },
  { label: "Link", icon: "🔗", prefix: "[", suffix: "](https://)", placeholder: "link text" },
  { label: "Image URL", icon: "🖼️", prefix: "![", suffix: "](https://image-url)", placeholder: "alt text" },
  { label: "List", icon: "•", prefix: "- ", suffix: "", placeholder: "list item", block: true },
  { label: "Numbered List", icon: "1.", prefix: "1. ", suffix: "", placeholder: "list item", block: true },
  { label: "Quote", icon: "❝", prefix: "> ", suffix: "", placeholder: "quote", block: true },
  { label: "Code", icon: "</>", prefix: "`", suffix: "`", placeholder: "code" },
  { label: "Divider", icon: "—", prefix: "\n---\n", suffix: "", placeholder: "", block: true },
];

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
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + insertion.length,
      );
    });
  }

  /** Upload a single image file to Supabase Storage and insert its markdown. */
  async function uploadImage(file: File): Promise<void> {
    if (!supabase || !userId) {
      setUploadError("Anmeldung erforderlich um Bilder hochzuladen.");
      return;
    }
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setUploadError(`Nicht unterstützter Dateityp: ${file.type}`);
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadError(`Datei zu groß (max ${MAX_FILE_SIZE_MB} MB).`);
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
        setUploadError(`Upload fehlgeschlagen: ${uploadErr.message}`);
        setIsUploading(false);
        return;
      }
      const { data: urlData } = supabase.storage
        .from(storageBucket)
        .getPublicUrl(filePath);
      const altText = (file.name || "image").replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
      insertAtCursor(`\n![${altText}](${urlData.publicUrl})\n`);
    } catch {
      setUploadError("Upload unerwartet fehlgeschlagen.");
    } finally {
      setIsUploading(false);
    }
  }

  function handleFileInputChange(e: ChangeEvent<HTMLInputElement>): void {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      void uploadImage(files[i]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const canUpload = Boolean(supabase && userId);

  return (
    <div>
      <div className="forum-md-toolbar">
        {TOOLBAR_ACTIONS.map((action) => (
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
          title={canUpload ? `Bild hochladen (max ${MAX_FILE_SIZE_MB} MB)` : "Anmeldung erforderlich"}
          aria-label="Bild hochladen"
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
          style={{ display: "none" }}
          aria-hidden="true"
        />
      </div>
      {uploadError && (
        <div className="forum-upload-error">
          {uploadError}
          <button type="button" onClick={() => setUploadError("")} className="forum-upload-error-close" aria-label="Fehler schließen">✕</button>
        </div>
      )}
      {isUploading && (
        <div className="forum-upload-status">Bild wird hochgeladen...</div>
      )}
    </div>
  );
}

export default CmsMarkdownToolbar;
