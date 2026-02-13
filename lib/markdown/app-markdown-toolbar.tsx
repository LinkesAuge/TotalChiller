"use client";

/**
 * AppMarkdownToolbar — Unified formatting toolbar for all markdown text areas.
 *
 * Replaces both CmsMarkdownToolbar and MarkdownToolbar with a single component.
 * Full feature set: Bold, Italic, Strikethrough, Heading, Quote, Code, Code Block,
 * Link, Image URL, Video, List, Numbered List, Divider, and image upload.
 *
 * Supports image upload via file picker, clipboard paste, and drag-and-drop.
 * i18n via next-intl (cmsToolbar namespace).
 */

import {
  useRef,
  useState,
  useMemo,
  type RefObject,
  type DragEvent,
  type ClipboardEvent,
  type ChangeEvent,
} from "react";
import { useTranslations } from "next-intl";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FORUM_IMAGES_BUCKET } from "@/lib/constants";

/* ─── Toolbar actions ─── */

interface ToolbarAction {
  readonly key: string;
  readonly icon: string;
  readonly prefix: string;
  readonly suffix: string;
  readonly placeholder: string;
  readonly block?: boolean;
}

/**
 * Builds the toolbar actions array using translated labels.
 * Superset of both original CMS and Forum toolbar actions.
 */
function buildToolbarActions(): ToolbarAction[] {
  return [
    { key: "bold", icon: "B", prefix: "**", suffix: "**", placeholder: "bold text" },
    { key: "italic", icon: "I", prefix: "_", suffix: "_", placeholder: "italic text" },
    { key: "strikethrough", icon: "S\u0336", prefix: "~~", suffix: "~~", placeholder: "strikethrough" },
    { key: "heading", icon: "H", prefix: "## ", suffix: "", placeholder: "Heading", block: true },
    { key: "quote", icon: "❝", prefix: "> ", suffix: "", placeholder: "quote", block: true },
    { key: "code", icon: "</>", prefix: "`", suffix: "`", placeholder: "code" },
    { key: "codeBlock", icon: "{ }", prefix: "```\n", suffix: "\n```", placeholder: "code block", block: true },
    { key: "link", icon: "🔗", prefix: "[", suffix: "](https://)", placeholder: "link text" },
    { key: "imageUrl", icon: "🖼️", prefix: "![", suffix: "](https://image-url)", placeholder: "alt text" },
    { key: "video", icon: "▶", prefix: "[Video](", suffix: ")", placeholder: "https://youtube.com/watch?v=..." },
    { key: "list", icon: "•", prefix: "- ", suffix: "", placeholder: "list item", block: true },
    { key: "numberedList", icon: "1.", prefix: "1. ", suffix: "", placeholder: "list item", block: true },
    { key: "divider", icon: "—", prefix: "\n---\n", suffix: "", placeholder: "", block: true },
  ];
}

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/* ─── Props ─── */

interface AppMarkdownToolbarProps {
  readonly textareaRef: RefObject<HTMLTextAreaElement | null>;
  readonly value: string;
  readonly onChange: (value: string) => void;
  /** Supabase client — required for image upload. */
  readonly supabase?: SupabaseClient;
  /** Current user ID — required for image upload. */
  readonly userId?: string;
  /** Storage bucket name for image uploads (default: "forum-images"). */
  readonly storageBucket?: string;
}

/** Generate a unique storage path for an uploaded file. */
export function generateStoragePath(userId: string, fileName: string): string {
  const timestamp = Date.now();
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${userId}/${timestamp}_${sanitized}`;
}

/**
 * Unified formatting toolbar for markdown text areas.
 * Supports text formatting, image upload via file picker.
 */
function AppMarkdownToolbar({
  textareaRef,
  value,
  onChange,
  supabase,
  userId,
  storageBucket = FORUM_IMAGES_BUCKET,
}: AppMarkdownToolbarProps): JSX.Element {
  const t = useTranslations("cmsToolbar");
  const toolbarActions = useMemo(() => buildToolbarActions(), []);
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
            key={action.key}
            type="button"
            className="forum-md-toolbar-btn"
            title={t(action.key)}
            aria-label={t(action.key)}
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

export default AppMarkdownToolbar;

/* ─── Exported helpers for paste / drag-drop on textarea ─── */

/**
 * Paste handler: detects images in clipboard and uploads them.
 * Attach to the textarea's onPaste event.
 */
export function handleImagePaste(
  e: ClipboardEvent<HTMLTextAreaElement>,
  supabase: SupabaseClient | undefined,
  userId: string,
  insertFn: (markdown: string) => void,
  setUploading: (v: boolean) => void,
  bucket: string = FORUM_IMAGES_BUCKET,
): void {
  if (!supabase || !userId) return;
  const items = e.clipboardData?.items;
  if (!items) return;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item || !item.type.startsWith("image/")) continue;
    e.preventDefault();
    const file = item.getAsFile();
    if (!file) return;
    setUploading(true);
    const filePath = generateStoragePath(userId, file.name || "pasted-image.png");
    void supabase.storage
      .from(bucket)
      .upload(filePath, file, { cacheControl: "3600", upsert: false })
      .then(({ error }) => {
        setUploading(false);
        if (error) return;
        const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
        const alt = (file.name || "image").replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
        insertFn(`\n![${alt}](${data.publicUrl})\n`);
      });
    return;
  }
}

/**
 * Drop handler: detects image files dropped onto the textarea and uploads them.
 * Attach to the textarea's onDrop event.
 */
export function handleImageDrop(
  e: DragEvent<HTMLTextAreaElement>,
  supabase: SupabaseClient | undefined,
  userId: string,
  insertFn: (markdown: string) => void,
  setUploading: (v: boolean) => void,
  bucket: string = FORUM_IMAGES_BUCKET,
): void {
  if (!supabase || !userId) return;
  const files = e.dataTransfer?.files;
  if (!files || files.length === 0) return;
  let hasImage = false;
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    if (f && ACCEPTED_IMAGE_TYPES.includes(f.type)) {
      hasImage = true;
      break;
    }
  }
  if (!hasImage) return;
  e.preventDefault();
  e.stopPropagation();
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file || !ACCEPTED_IMAGE_TYPES.includes(file.type) || file.size > MAX_FILE_SIZE_BYTES) continue;
    setUploading(true);
    const filePath = generateStoragePath(userId, file.name ?? "image");
    void supabase.storage
      .from(bucket)
      .upload(filePath, file, { cacheControl: "3600", upsert: false })
      .then(({ error }) => {
        setUploading(false);
        if (error) return;
        const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
        const alt = (file.name ?? "image").replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
        insertFn(`\n![${alt}](${data.publicUrl})\n`);
      });
  }
}
