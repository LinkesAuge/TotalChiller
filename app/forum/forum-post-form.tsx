"use client";

import dynamic from "next/dynamic";
import type { RefObject } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ForumCategory } from "@/lib/types/domain";

const AppMarkdown = dynamic(() => import("@/lib/markdown/app-markdown"), {
  loading: () => <div className="skeleton h-32 rounded" />,
});
import AppMarkdownToolbar, { handleImagePaste, handleImageDrop } from "@/lib/markdown/app-markdown-toolbar";
import type { TFunction } from "./forum-utils";

export interface ForumPostFormProps {
  readonly formTitle: string;
  readonly formContent: string;
  readonly formCategoryId: string;
  readonly formPinned: boolean;
  readonly editingPostId: string;
  readonly isPreviewMode: boolean;
  readonly isImageUploading: boolean;
  readonly categories: ForumCategory[];
  readonly canManage: boolean;
  readonly t: TFunction;
  readonly contentTextareaRef: RefObject<HTMLTextAreaElement | null>;
  readonly supabase: SupabaseClient;
  readonly currentUserId: string;
  readonly onTitleChange: (value: string) => void;
  readonly onContentChange: (value: string) => void;
  readonly onCategoryChange: (value: string) => void;
  readonly onPinnedChange: (value: boolean) => void;
  readonly onPreviewToggle: (value: boolean) => void;
  readonly onContentInsert: (markdown: string) => void;
  readonly onImageUploadingChange: (value: boolean) => void;
  readonly onSubmit: () => void;
  readonly onCancel: () => void;
}

export default function ForumPostForm({
  formTitle,
  formContent,
  formCategoryId,
  formPinned,
  editingPostId,
  isPreviewMode,
  isImageUploading: _isImageUploading,
  categories,
  canManage,
  t,
  contentTextareaRef,
  supabase,
  currentUserId,
  onTitleChange,
  onContentChange,
  onCategoryChange,
  onPinnedChange,
  onPreviewToggle,
  onContentInsert,
  onImageUploadingChange,
  onSubmit,
  onCancel,
}: ForumPostFormProps): JSX.Element {
  return (
    <section className="forum-form">
      <h3 className="card-title mb-3">{editingPostId ? t("editPost") : t("createPost")}</h3>
      <div className="form-group mb-2.5">
        <label className="form-label" htmlFor="post-title">
          {t("postTitle")}
        </label>
        <input
          id="post-title"
          type="text"
          value={formTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder={t("postTitlePlaceholder")}
          maxLength={200}
        />
      </div>
      <div className="form-group mb-2.5">
        <label className="form-label" htmlFor="post-category">
          {t("category")}
        </label>
        <select
          id="post-category"
          value={formCategoryId}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="py-2 px-2.5 w-full bg-bg text-text border border-edge rounded-sm"
          style={{ fontFamily: "var(--font-body)", fontSize: "0.84rem" }}
        >
          <option value="">{t("selectCategory")}</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>
      {canManage && (
        <div className="form-group mb-2.5">
          <label className="flex items-center gap-2 cursor-pointer text-[0.84rem] text-text">
            <input
              type="checkbox"
              checked={formPinned}
              onChange={(e) => onPinnedChange(e.target.checked)}
              style={{ accentColor: "var(--color-gold)" }}
            />
            {t("pinPost")}
          </label>
        </div>
      )}
      <div className="form-group mb-2.5">
        <label className="form-label" htmlFor="post-content">
          {t("postContent")}
        </label>
        <div className="forum-editor-tabs">
          <button
            type="button"
            className={`forum-editor-tab${!isPreviewMode ? " active" : ""}`}
            onClick={() => onPreviewToggle(false)}
          >
            {t("write")}
          </button>
          <button
            type="button"
            className={`forum-editor-tab${isPreviewMode ? " active" : ""}`}
            onClick={() => onPreviewToggle(true)}
          >
            {t("preview")}
          </button>
        </div>
        {isPreviewMode ? (
          <div className="forum-editor-preview">
            {formContent.trim() ? (
              <AppMarkdown content={formContent} />
            ) : (
              <p style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}>{t("previewEmpty")}</p>
            )}
          </div>
        ) : (
          <>
            <AppMarkdownToolbar
              textareaRef={contentTextareaRef}
              value={formContent}
              onChange={onContentChange}
              supabase={supabase}
              userId={currentUserId}
            />
            <textarea
              id="post-content"
              ref={contentTextareaRef}
              value={formContent}
              onChange={(e) => onContentChange(e.target.value)}
              placeholder={t("postContentPlaceholder")}
              rows={10}
              onPaste={(e) => handleImagePaste(e, supabase, currentUserId, onContentInsert, onImageUploadingChange)}
              onDrop={(e) => handleImageDrop(e, supabase, currentUserId, onContentInsert, onImageUploadingChange)}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            />
          </>
        )}
        <p className="forum-editor-hint">{t("markdownHint")}</p>
      </div>
      <div className="forum-form-row">
        <button className="button primary" onClick={onSubmit} disabled={!formTitle.trim()}>
          {editingPostId ? t("save") : t("submit")}
        </button>
        <button className="button" onClick={onCancel}>
          {t("cancel")}
        </button>
      </div>
    </section>
  );
}
