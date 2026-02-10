"use client";

import { useRef, useState, type RefObject, type DragEvent, type ClipboardEvent, type ChangeEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

/* ─── Types ─── */

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
  { label: "Strikethrough", icon: "S̶", prefix: "~~", suffix: "~~", placeholder: "strikethrough" },
  { label: "Heading", icon: "H", prefix: "## ", suffix: "", placeholder: "Heading", block: true },
  { label: "Quote", icon: "❝", prefix: "> ", suffix: "", placeholder: "quote", block: true },
  { label: "Code", icon: "</>", prefix: "`", suffix: "`", placeholder: "code" },
  { label: "Code Block", icon: "{ }", prefix: "```\n", suffix: "\n```", placeholder: "code block", block: true },
  { label: "Link", icon: "🔗", prefix: "[", suffix: "](https://)", placeholder: "link text" },
  { label: "Image URL", icon: "🖼️", prefix: "![", suffix: "](https://image-url)", placeholder: "alt text" },
  { label: "Video", icon: "▶", prefix: "[Video](", suffix: ")", placeholder: "https://youtube.com/watch?v=..." },
  { label: "List", icon: "•", prefix: "- ", suffix: "", placeholder: "list item", block: true },
  { label: "Numbered List", icon: "1.", prefix: "1. ", suffix: "", placeholder: "list item", block: true },
  { label: "Divider", icon: "—", prefix: "\n---\n", suffix: "", placeholder: "", block: true },
];

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const DEFAULT_STORAGE_BUCKET = "forum-images";

/* ─── Props ─── */

interface MarkdownToolbarProps {
  readonly textareaRef: RefObject<HTMLTextAreaElement | null>;
  readonly value: string;
  readonly onChange: (value: string) => void;
  /** Supabase client — required for image upload. */
  readonly supabase?: SupabaseClient;
  /** Current user ID — required for image upload. */
  readonly userId?: string;
  /** Storage bucket for image uploads (default: "forum-images"). */
  readonly storageBucket?: string;
}

/** Generate a unique storage path for an uploaded file. */
function generateStoragePath(userId: string, fileName: string): string {
  const timestamp = Date.now();
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${userId}/${timestamp}_${sanitized}`;
}

/**
 * Formatting toolbar for markdown text areas.
 * Supports text formatting, image upload via file picker, paste, or drag-and-drop.
 */
function MarkdownToolbar({
  textareaRef,
  value,
  onChange,
  supabase,
  userId,
  storageBucket = DEFAULT_STORAGE_BUCKET,
}: MarkdownToolbarProps): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>("");

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
      setUploadError("Sign in required to upload images.");
      return;
    }
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setUploadError(`Unsupported file type: ${file.type}`);
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadError(`File too large (max ${MAX_FILE_SIZE_MB} MB).`);
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
        setUploadError(`Upload failed: ${uploadErr.message}`);
        return;
      }
      const { data: urlData } = supabase.storage.from(storageBucket).getPublicUrl(filePath);
      const altText = (file.name || "image").replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
      insertAtCursor(`\n![${altText}](${urlData.publicUrl})\n`);
    } catch {
      setUploadError("Upload failed unexpectedly.");
    } finally {
      setIsUploading(false);
    }
  }

  /** Handle files from input or drop. */
  async function processFiles(files: FileList | null): Promise<void> {
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;
      await uploadImage(file);
    }
  }

  function handleFileInputChange(e: ChangeEvent<HTMLInputElement>): void {
    void processFiles(e.target.files);
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
          title={canUpload ? `Upload Image (max ${MAX_FILE_SIZE_MB} MB)` : "Sign in to upload images"}
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
          <button type="button" onClick={() => setUploadError("")} className="forum-upload-error-close">
            ✕
          </button>
        </div>
      )}
      {isUploading && <div className="forum-upload-status">Uploading image...</div>}
    </div>
  );
}

export default MarkdownToolbar;

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
  bucket: string = DEFAULT_STORAGE_BUCKET,
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
  bucket: string = DEFAULT_STORAGE_BUCKET,
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
