"use client";

/**
 * EditableText — Inline-editable text component for CMS pages.
 *
 * Renders text content that admins can edit inline via a hover pencil button.
 * Supports bilingual editing (DE/EN) with live preview.
 *
 * Rendering paths (explicit, no implicit behavior):
 * 1. `children` provided → renders children in original Tag (no CMS text)
 * 2. `singleLine` → plain text in original Tag, simple DE/EN inputs for editing
 * 3. `markdown={true}` → CmsMarkdown in <div>, CmsMarkdownToolbar for editing
 * 4. `markdown={false}` (default) → plain text with <br> in <div>
 */

import dynamic from "next/dynamic";
import { useState, useRef, useEffect, type ReactNode } from "react";
import { useTranslations } from "next-intl";

const CmsMarkdown = dynamic(() => import("./cms-markdown"), {
  loading: () => <div className="skeleton h-20 rounded" />,
});
import CmsMarkdownToolbar from "./cms-markdown-toolbar";
import type { SupabaseClient } from "@supabase/supabase-js";

/* ─── Types ─── */

interface EditableTextProps {
  /** Current text value */
  readonly value: string;
  /** Called with (newValueDe, newValueEn) when the user saves */
  readonly onSave: (valueDe: string, valueEn: string) => Promise<void>;
  /** Whether the user has admin/edit permissions */
  readonly canEdit: boolean;
  /** Current locale (for choosing which field to display) */
  readonly locale: string;
  /** The English content (for bilingual editing) */
  readonly valueEn?: string;
  /** Render as markdown via CmsMarkdown (default: false) */
  readonly markdown?: boolean;
  /** Use a single-line input instead of textarea */
  readonly singleLine?: boolean;
  /** Wrapper element tag (default: "span") */
  readonly as?: "p" | "span" | "h3" | "div";
  /** Additional className for the display wrapper */
  readonly className?: string;
  /** Children override: if provided, renders children instead of value text */
  readonly children?: ReactNode;
  /** Supabase client for image uploads in markdown toolbar */
  readonly supabase?: SupabaseClient;
  /** Current user ID for image uploads */
  readonly userId?: string;
}

/**
 * Renders text content that admins can edit inline.
 * Displays a small pencil icon on hover (admin only).
 * Click opens a bilingual edit form with Save/Cancel.
 */
function EditableText({
  value,
  onSave,
  canEdit,
  locale,
  valueEn = "",
  markdown = false,
  singleLine = false,
  as: Tag = "span",
  className = "",
  children,
  supabase,
  userId,
}: EditableTextProps): JSX.Element {
  const t = useTranslations("common");
  const [isEditing, setIsEditing] = useState(false);
  const [editDe, setEditDe] = useState("");
  const [editEn, setEditEn] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [activeTab, setActiveTab] = useState<"de" | "en">("de");
  const [showPreview, setShowPreview] = useState(false);
  const textareaDeRef = useRef<HTMLTextAreaElement>(null);
  const textareaEnRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleOpen(): void {
    setEditDe(locale === "en" ? valueEn || value : value);
    setEditEn(locale === "en" ? value : valueEn || value);
    setActiveTab("de");
    setShowPreview(false);
    setSaveError("");
    setIsEditing(true);
  }

  useEffect(() => {
    if (isEditing) {
      if (singleLine) inputRef.current?.focus();
      else textareaDeRef.current?.focus();
    }
  }, [isEditing, singleLine]);

  async function handleSave(): Promise<void> {
    setIsSaving(true);
    setSaveError("");
    try {
      await onSave(editDe, editEn);
      setIsEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t("saveFailed"));
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel(): void {
    setIsEditing(false);
    setSaveError("");
  }

  const useMarkdownEditor = !singleLine && markdown;
  const currentValue = activeTab === "de" ? editDe : editEn;
  const currentRef = activeTab === "de" ? textareaDeRef : textareaEnRef;
  const currentSetter = activeTab === "de" ? setEditDe : setEditEn;

  /* ─── Editing UI ─── */

  if (isEditing) {
    return (
      <div className="editable-text-editor">
        {!singleLine ? (
          <>
            {/* Tab selector DE / EN + Preview toggle */}
            <div className="editable-text-tabs">
              <button
                className={`editable-text-tab${activeTab === "de" ? " active" : ""}`}
                type="button"
                onClick={() => setActiveTab("de")}
              >
                DE
              </button>
              <button
                className={`editable-text-tab${activeTab === "en" ? " active" : ""}`}
                type="button"
                onClick={() => setActiveTab("en")}
              >
                EN
              </button>
              <div className="editable-text-tab-spacer" />
              {useMarkdownEditor && (
                <button
                  className={`editable-text-tab${showPreview ? " active" : ""}`}
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? t("editor") : t("preview")}
                </button>
              )}
            </div>

            {/* Markdown toolbar (only for markdown-enabled fields) */}
            {useMarkdownEditor && (
              <CmsMarkdownToolbar
                textareaRef={currentRef}
                value={currentValue}
                onChange={currentSetter}
                supabase={supabase}
                userId={userId}
              />
            )}

            {showPreview && useMarkdownEditor ? (
              <div className="editable-text-preview">
                <CmsMarkdown content={currentValue} />
              </div>
            ) : (
              <textarea
                ref={currentRef}
                className="editable-text-textarea"
                value={currentValue}
                onChange={(e) => currentSetter(e.target.value)}
                rows={8}
              />
            )}
          </>
        ) : (
          /* Simple dual-input for single-line fields */
          <div className="editable-text-fields">
            <div className="editable-text-field-group">
              <label className="editable-text-label" htmlFor="editable-text-de">
                DE
              </label>
              <input
                ref={inputRef}
                id="editable-text-de"
                className="editable-text-input"
                value={editDe}
                onChange={(e) => setEditDe(e.target.value)}
              />
            </div>
            <div className="editable-text-field-group">
              <label className="editable-text-label" htmlFor="editable-text-en">
                EN
              </label>
              <input
                id="editable-text-en"
                className="editable-text-input"
                value={editEn}
                onChange={(e) => setEditEn(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Error message */}
        {saveError && <div className="editable-text-error">{saveError}</div>}

        <div className="editable-text-actions">
          <button
            className="button primary"
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            aria-label={t("save")}
          >
            {isSaving ? "…" : t("save")}
          </button>
          <button className="button" type="button" onClick={handleCancel} aria-label={t("cancel")}>
            {t("cancel")}
          </button>
        </div>
      </div>
    );
  }

  /* ─── Display UI ─── */

  const pencilBtn = canEdit ? (
    <button className="editable-text-pencil" type="button" onClick={handleOpen} aria-label={t("editContent")}>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    </button>
  ) : null;

  /* Path 1: children override → render children in original Tag */
  if (children) {
    return (
      <Tag className={`editable-text-wrap${canEdit ? " editable" : ""} ${className}`.trim()}>
        {children}
        {pencilBtn}
      </Tag>
    );
  }

  /* Path 2: singleLine → plain text in original Tag */
  if (singleLine) {
    return (
      <Tag className={`editable-text-wrap${canEdit ? " editable" : ""} ${className}`.trim()}>
        {value}
        {pencilBtn}
      </Tag>
    );
  }

  /* Path 3: markdown={true} → CmsMarkdown in <div> */
  if (markdown) {
    return (
      <div className={`editable-text-wrap${canEdit ? " editable" : ""} ${className}`.trim()}>
        <CmsMarkdown content={value} />
        {pencilBtn}
      </div>
    );
  }

  /* Path 4: markdown={false} (default) → plain text with <br> in <div> */
  return (
    <div className={`editable-text-wrap${canEdit ? " editable" : ""} ${className}`.trim()}>
      {value.split("\n").map((line, i, arr) => (
        <span key={i}>
          {line}
          {i < arr.length - 1 && <br />}
        </span>
      ))}
      {pencilBtn}
    </div>
  );
}

export default EditableText;
