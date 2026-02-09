"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import ForumMarkdown from "../forum/forum-markdown";
import MarkdownToolbar from "../forum/markdown-toolbar";
import type { SupabaseClient } from "@supabase/supabase-js";

/* ─── Helpers ─── */

/** Normalise plain text / bullet chars into valid markdown */
function normalizeContent(raw: string): string {
  let text = raw;
  /* Normalize Windows line endings */
  text = text.replace(/\r\n/g, "\n");
  text = text.replace(/\r/g, "\n");
  /* Convert bullet chars to markdown list syntax */
  text = text.replace(/^[ \t]*[•–—][ \t]*/gm, "- ");
  /* Ensure blank line before numbered list items */
  text = text.replace(/\n(\d+\.\s)/g, "\n\n$1");
  /* Ensure blank line before unordered list items */
  text = text.replace(/([^\n])\n(- )/g, "$1\n\n$2");
  /* Single newlines → trailing spaces for <br> (preserves double newlines as paragraphs) */
  text = text.replace(/([^\n]) *\n(?!\n)/g, "$1  \n");
  return text;
}

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
  /** Render as markdown (default: false) */
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
 * Multi-line fields get a MarkdownToolbar + live preview.
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
  const [isEditing, setIsEditing] = useState(false);
  const [editDe, setEditDe] = useState("");
  const [editEn, setEditEn] = useState("");
  const [isSaving, setIsSaving] = useState(false);
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
    try {
      await onSave(editDe, editEn);
    } finally {
      setIsSaving(false);
      setIsEditing(false);
    }
  }

  function handleCancel(): void {
    setIsEditing(false);
  }

  const isMultiLine = !singleLine;
  const currentValue = activeTab === "de" ? editDe : editEn;
  const currentRef = activeTab === "de" ? textareaDeRef : textareaEnRef;
  const currentSetter = activeTab === "de" ? setEditDe : setEditEn;

  if (isEditing) {
    return (
      <div className="editable-text-editor">
        {isMultiLine && (
          <>
            {/* Tab selector DE / EN */}
            <div className="editable-text-tabs">
              <button
                className={`editable-text-tab${activeTab === "de" ? " active" : ""}`}
                type="button"
                onClick={() => setActiveTab("de")}
              >DE</button>
              <button
                className={`editable-text-tab${activeTab === "en" ? " active" : ""}`}
                type="button"
                onClick={() => setActiveTab("en")}
              >EN</button>
              <div className="editable-text-tab-spacer" />
              <button
                className={`editable-text-tab${showPreview ? " active" : ""}`}
                type="button"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? "Editor" : "Vorschau"}
              </button>
            </div>

            {/* Markdown Toolbar */}
            <MarkdownToolbar
              textareaRef={currentRef}
              value={currentValue}
              onChange={currentSetter}
              supabase={supabase}
              userId={userId}
            />

            {/* Preview or textarea */}
            {showPreview ? (
              <div className="editable-text-preview">
                <ForumMarkdown content={normalizeContent(currentValue)} />
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
        )}

        {singleLine && (
          <div className="editable-text-fields">
            <div className="editable-text-field-group">
              <label className="editable-text-label">DE</label>
              <input
                ref={inputRef}
                className="editable-text-input"
                value={editDe}
                onChange={(e) => setEditDe(e.target.value)}
              />
            </div>
            <div className="editable-text-field-group">
              <label className="editable-text-label">EN</label>
              <input
                className="editable-text-input"
                value={editEn}
                onChange={(e) => setEditEn(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="editable-text-actions">
          <button className="button primary" type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "…" : "Speichern"}
          </button>
          <button className="button" type="button" onClick={handleCancel}>Abbrechen</button>
        </div>
      </div>
    );
  }

  const pencilBtn = canEdit ? (
    <button
      className="editable-text-pencil"
      type="button"
      onClick={handleOpen}
      aria-label="Inhalt bearbeiten"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    </button>
  ) : null;

  /* All editable elements use the same hover-overlay pattern */
  return (
    <Tag className={`editable-text-wrap${canEdit ? " editable" : ""} ${className}`.trim()}>
      {markdown ? (
        <ForumMarkdown content={normalizeContent(value)} />
      ) : children ? (
        children
      ) : (
        value
      )}
      {pencilBtn}
    </Tag>
  );
}

export default EditableText;
