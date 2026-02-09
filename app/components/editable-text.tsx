"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import ForumMarkdown from "../forum/forum-markdown";

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
}: EditableTextProps): JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const [editDe, setEditDe] = useState("");
  const [editEn, setEditEn] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleOpen(): void {
    setEditDe(locale === "en" ? valueEn || value : value);
    setEditEn(locale === "en" ? value : valueEn || value);
    setIsEditing(true);
  }

  useEffect(() => {
    if (isEditing) {
      if (singleLine) inputRef.current?.focus();
      else textareaRef.current?.focus();
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

  if (isEditing) {
    return (
      <div className="editable-text-editor">
        <div className="editable-text-fields">
          <div className="editable-text-field-group">
            <label className="editable-text-label">DE</label>
            {singleLine ? (
              <input
                ref={inputRef}
                className="editable-text-input"
                value={editDe}
                onChange={(e) => setEditDe(e.target.value)}
              />
            ) : (
              <textarea
                ref={textareaRef}
                className="editable-text-textarea"
                value={editDe}
                onChange={(e) => setEditDe(e.target.value)}
                rows={4}
              />
            )}
          </div>
          <div className="editable-text-field-group">
            <label className="editable-text-label">EN</label>
            {singleLine ? (
              <input
                className="editable-text-input"
                value={editEn}
                onChange={(e) => setEditEn(e.target.value)}
              />
            ) : (
              <textarea
                className="editable-text-textarea"
                value={editEn}
                onChange={(e) => setEditEn(e.target.value)}
                rows={4}
              />
            )}
          </div>
        </div>
        <div className="editable-text-actions">
          <button className="button primary" type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "…" : "Speichern"}
          </button>
          <button className="button" type="button" onClick={handleCancel}>Abbrechen</button>
        </div>
      </div>
    );
  }

  return (
    <Tag className={`editable-text-wrap${canEdit ? " editable" : ""} ${className}`.trim()}>
      {markdown ? (
        <ForumMarkdown content={value} />
      ) : children ? (
        children
      ) : (
        value
      )}
      {canEdit && (
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
      )}
    </Tag>
  );
}

export default EditableText;
