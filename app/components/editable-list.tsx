"use client";

/**
 * EditableList — CMS list component with drag-and-drop reordering, badges, and icons.
 *
 * Features:
 * - Drag-and-drop reordering (native HTML Drag API)
 * - Add / remove items
 * - Inline edit modal for text (DE/EN), badge, link, icon
 * - Markdown rendering for list item text via AppMarkdown
 * - Preset icon selection + custom SVG upload (cms-icons bucket)
 * - Badge display per item
 */

import dynamic from "next/dynamic";
import { useState, useRef, useCallback, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";

const AppMarkdown = dynamic(() => import("@/lib/markdown/app-markdown"), {
  loading: () => <div className="skeleton h-20 rounded" />,
});
import type { ListItem } from "./use-site-content";
import type { SupabaseClient } from "@supabase/supabase-js";

/* ─── Preset icons ─── */

const PRESET_ICONS: Record<string, string> = {
  star: "⭐",
  fire: "🔥",
  shield: "🛡️",
  sword: "⚔️",
  trophy: "🏆",
  chart: "📊",
  calendar: "📅",
  news: "📰",
  mail: "📧",
  discord: "💬",
  crown: "👑",
  gem: "💎",
  rocket: "🚀",
  target: "🎯",
  check: "✅",
};

/* ─── Constants ─── */

const STORAGE_BUCKET = "cms-icons";
const MAX_SVG_SIZE = 50 * 1024; // 50 KB

/* ─── Types ─── */

interface EditableListProps {
  /** List items from useSiteContent hook */
  readonly items: ListItem[];
  /** Whether the user can edit */
  readonly canEdit: boolean;
  /** Current locale */
  readonly locale: string;
  /** Callback to add a new item */
  readonly onAdd: (
    textDe: string,
    textEn: string,
    extra?: Partial<Pick<ListItem, "badge_de" | "badge_en" | "link_url" | "icon" | "icon_type">>,
  ) => Promise<ListItem>;
  /** Callback to update an item */
  readonly onUpdate: (
    id: string,
    updates: Partial<Omit<ListItem, "id" | "page" | "section_key" | "sort_order">>,
  ) => Promise<void>;
  /** Callback to remove an item */
  readonly onRemove: (id: string) => Promise<void>;
  /** Callback to reorder items */
  readonly onReorder: (items: Array<{ id: string; sort_order: number }>) => Promise<void>;
  /** Show badges (default: true) */
  readonly showBadges?: boolean;
  /** Show icons (default: false) */
  readonly showIcons?: boolean;
  /** Additional CSS class name */
  readonly className?: string;
  /** Supabase client for custom SVG uploads */
  readonly supabase?: SupabaseClient;
  /** Current user ID for uploads */
  readonly userId?: string;
}

interface EditModalState {
  item: ListItem;
  textDe: string;
  textEn: string;
  badgeDe: string;
  badgeEn: string;
  linkUrl: string;
  icon: string;
  iconType: "preset" | "custom";
}

/* ─── Component ─── */

function EditableList({
  items,
  canEdit,
  locale,
  onAdd,
  onUpdate,
  onRemove,
  onReorder,
  showBadges = true,
  showIcons = false,
  className = "",
  supabase,
  userId,
}: EditableListProps): JSX.Element {
  const t = useTranslations("common");
  const [editModal, setEditModal] = useState<EditModalState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const svgInputRef = useRef<HTMLInputElement>(null);

  /* ── Drag-and-Drop ── */

  const handleDragStart = useCallback((idx: number) => {
    setDragIdx(idx);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDropIdx(idx);
  }, []);

  const handleDragEnd = useCallback(async () => {
    if (dragIdx === null || dropIdx === null || dragIdx === dropIdx) {
      setDragIdx(null);
      setDropIdx(null);
      return;
    }

    /* Compute new order */
    const reordered = [...items];
    const [moved] = reordered.splice(dragIdx, 1);
    if (!moved) return;
    reordered.splice(dropIdx, 0, moved);

    const reorderPayload = reordered.map((item, i) => ({ id: item.id, sort_order: i }));

    setDragIdx(null);
    setDropIdx(null);

    try {
      await onReorder(reorderPayload);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t("reorderFailed"));
    }
  }, [dragIdx, dropIdx, items, onReorder]);

  /* ── Add item ── */

  async function handleAdd(): Promise<void> {
    setActionError("");
    try {
      await onAdd(t("newItem"), "New item");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t("addFailed"));
    }
  }

  /* ── Remove item ── */

  async function handleRemove(id: string): Promise<void> {
    setActionError("");
    try {
      await onRemove(id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t("deleteFailed"));
    }
  }

  /* ── Custom SVG Upload ── */

  async function handleSvgUpload(e: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (svgInputRef.current) svgInputRef.current.value = "";
    if (!file || !supabase || !userId || !editModal) return;

    if (file.type !== "image/svg+xml") {
      setActionError(t("svgOnly"));
      return;
    }
    if (file.size > MAX_SVG_SIZE) {
      setActionError(t("fileTooLarge", { max: MAX_SVG_SIZE / 1024 }));
      return;
    }

    setIsUploading(true);
    setActionError("");
    try {
      const timestamp = Date.now();
      const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${userId}/${timestamp}_${sanitized}`;

      const { error: uploadErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file, { cacheControl: "3600", upsert: false });

      if (uploadErr) {
        setActionError(`${t("uploadFailed")}: ${uploadErr.message}`);
        return;
      }

      const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);

      setEditModal({ ...editModal, icon: urlData.publicUrl, iconType: "custom" });
    } catch {
      setActionError(t("uploadUnexpectedError"));
    } finally {
      setIsUploading(false);
    }
  }

  /* ── Edit modal ── */

  function openEdit(item: ListItem): void {
    setEditModal({
      item,
      textDe: item.text_de,
      textEn: item.text_en,
      badgeDe: item.badge_de,
      badgeEn: item.badge_en,
      linkUrl: item.link_url,
      icon: item.icon,
      iconType: item.icon_type,
    });
    setActionError("");
  }

  async function handleEditSave(): Promise<void> {
    if (!editModal) return;
    setIsSaving(true);
    setActionError("");
    try {
      await onUpdate(editModal.item.id, {
        text_de: editModal.textDe,
        text_en: editModal.textEn,
        badge_de: editModal.badgeDe,
        badge_en: editModal.badgeEn,
        link_url: editModal.linkUrl,
        icon: editModal.icon,
        icon_type: editModal.iconType,
      });
      setEditModal(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t("saveFailed"));
    } finally {
      setIsSaving(false);
    }
  }

  /* ── Render ── */

  const getText = (item: ListItem): string => (locale === "en" ? item.text_en || item.text_de : item.text_de);

  const getBadge = (item: ListItem): string => (locale === "en" ? item.badge_en || item.badge_de : item.badge_de);

  return (
    <div className={`editable-list ${className}`.trim()} ref={listRef}>
      {/* Error banner */}
      {actionError && (
        <div className="editable-list-error">
          {actionError}
          <button
            type="button"
            onClick={() => setActionError("")}
            className="editable-list-error-close"
            aria-label={t("closeError")}
          >
            ✕
          </button>
        </div>
      )}

      {/* List items */}
      {items.map((item, idx) => (
        /* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- draggable uses native HTML5 drag API; keyboard reorder would need ARIA live region */
        <div
          key={item.id}
          role={canEdit ? "button" : undefined}
          tabIndex={canEdit ? 0 : undefined}
          className={`editable-list-item${dragIdx === idx ? " dragging" : ""}${dropIdx === idx ? " drop-target" : ""}`}
          draggable={canEdit}
          onDragStart={() => handleDragStart(idx)}
          onDragOver={(e) => handleDragOver(e, idx)}
          onDragEnd={handleDragEnd}
          onKeyDown={
            canEdit
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") e.preventDefault();
                }
              : undefined
          }
        >
          {/* Drag handle */}
          {canEdit && (
            <button
              type="button"
              className="editable-list-drag-handle"
              aria-label={t("dragToSort")}
              onPointerDown={(e) => e.preventDefault()}
            >
              ⠿
            </button>
          )}

          {/* Icon */}
          {showIcons && item.icon && (
            <span className="editable-list-icon">
              {item.icon_type === "preset" && PRESET_ICONS[item.icon] ? (
                PRESET_ICONS[item.icon]
              ) : item.icon_type === "custom" && item.icon ? (
                <img src={item.icon} alt="" className="editable-list-icon-custom" />
              ) : null}
            </span>
          )}

          {/* Content */}
          <div className="editable-list-content">
            <AppMarkdown content={getText(item)} variant="cms" />
          </div>

          {/* Badge */}
          {showBadges && getBadge(item) && <span className="editable-list-badge">{getBadge(item)}</span>}

          {/* Edit / Remove buttons (hover-only) */}
          {canEdit && (
            <div className="editable-list-actions">
              <button
                className="editable-list-btn editable-list-edit"
                type="button"
                onClick={() => openEdit(item)}
                aria-label={t("editItem")}
              >
                <svg
                  width="12"
                  height="12"
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
              <button
                className="editable-list-btn editable-list-remove"
                type="button"
                onClick={() => handleRemove(item.id)}
                aria-label={t("removeItem")}
              >
                ✕
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Add button */}
      {canEdit && (
        <button className="editable-list-add" type="button" onClick={handleAdd} aria-label={t("addItem")}>
          + {t("addItem")}
        </button>
      )}

      {/* Edit modal */}
      {editModal && (
        <div
          className="editable-list-modal-backdrop"
          role="button"
          tabIndex={0}
          onClick={() => setEditModal(null)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setEditModal(null);
            }
          }}
        >
          <div
            className="editable-list-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <h3 className="editable-list-modal-title">{t("editItem")}</h3>

            <div className="editable-list-modal-field">
              <label className="editable-list-modal-label" htmlFor="edit-modal-text-de">
                Text (DE)
              </label>
              <textarea
                id="edit-modal-text-de"
                className="editable-text-textarea"
                value={editModal.textDe}
                onChange={(e) => setEditModal({ ...editModal, textDe: e.target.value })}
                rows={3}
              />
            </div>

            <div className="editable-list-modal-field">
              <label className="editable-list-modal-label" htmlFor="edit-modal-text-en">
                Text (EN)
              </label>
              <textarea
                id="edit-modal-text-en"
                className="editable-text-textarea"
                value={editModal.textEn}
                onChange={(e) => setEditModal({ ...editModal, textEn: e.target.value })}
                rows={3}
              />
            </div>

            {showBadges && (
              <div className="editable-list-modal-row">
                <div className="editable-list-modal-field">
                  <label className="editable-list-modal-label" htmlFor="edit-modal-badge-de">
                    Badge (DE)
                  </label>
                  <input
                    id="edit-modal-badge-de"
                    className="editable-text-input"
                    value={editModal.badgeDe}
                    onChange={(e) => setEditModal({ ...editModal, badgeDe: e.target.value })}
                  />
                </div>
                <div className="editable-list-modal-field">
                  <label className="editable-list-modal-label" htmlFor="edit-modal-badge-en">
                    Badge (EN)
                  </label>
                  <input
                    id="edit-modal-badge-en"
                    className="editable-text-input"
                    value={editModal.badgeEn}
                    onChange={(e) => setEditModal({ ...editModal, badgeEn: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="editable-list-modal-field">
              <label className="editable-list-modal-label" htmlFor="edit-modal-link-url">
                Link URL (optional)
              </label>
              <input
                id="edit-modal-link-url"
                className="editable-text-input"
                value={editModal.linkUrl}
                onChange={(e) => setEditModal({ ...editModal, linkUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>

            {showIcons && (
              <div className="editable-list-modal-field">
                <span id="edit-modal-icon-label" className="editable-list-modal-label">
                  Icon
                </span>
                <div className="editable-list-icon-picker" role="group" aria-labelledby="edit-modal-icon-label">
                  <button
                    type="button"
                    className={`editable-list-icon-option${editModal.icon === "" ? " active" : ""}`}
                    onClick={() => setEditModal({ ...editModal, icon: "", iconType: "preset" })}
                    aria-label={t("noIcon")}
                  >
                    ∅
                  </button>
                  {Object.entries(PRESET_ICONS).map(([key, emoji]) => (
                    <button
                      key={key}
                      type="button"
                      className={`editable-list-icon-option${editModal.icon === key && editModal.iconType === "preset" ? " active" : ""}`}
                      onClick={() => setEditModal({ ...editModal, icon: key, iconType: "preset" })}
                      aria-label={key}
                      title={key}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* Custom SVG Upload */}
                {supabase && userId && (
                  <div className="editable-list-svg-upload">
                    <button
                      type="button"
                      className="editable-list-svg-upload-btn"
                      onClick={() => svgInputRef.current?.click()}
                      disabled={isUploading}
                      aria-label={t("uploadCustomSvg")}
                    >
                      {isUploading ? t("uploading") : t("uploadCustomSvg")}
                    </button>
                    <input
                      ref={svgInputRef}
                      type="file"
                      accept="image/svg+xml"
                      onChange={handleSvgUpload}
                      className="hidden"
                      aria-hidden="true"
                    />
                    {editModal.iconType === "custom" && editModal.icon && (
                      <div className="editable-list-svg-preview">
                        <img src={editModal.icon} alt="Custom Icon" className="editable-list-svg-preview-img" />
                        <button
                          type="button"
                          className="editable-list-svg-preview-remove"
                          onClick={() => setEditModal({ ...editModal, icon: "", iconType: "preset" })}
                          aria-label={t("removeCustomIcon")}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {actionError && <div className="editable-text-error">{actionError}</div>}

            <div className="editable-text-actions">
              <button
                className="button primary"
                type="button"
                onClick={handleEditSave}
                disabled={isSaving}
                aria-label={t("save")}
              >
                {isSaving ? "…" : t("save")}
              </button>
              <button className="button" type="button" onClick={() => setEditModal(null)} aria-label={t("cancel")}>
                {t("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EditableList;
