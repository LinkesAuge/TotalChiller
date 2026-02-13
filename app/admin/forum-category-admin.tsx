"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useSupabase } from "../hooks/use-supabase";
import useClanContext from "../components/use-clan-context";

/* ─── Types ─── */

import type { ForumCategory } from "@/lib/types/domain";

type ForumCategoryRow = Required<ForumCategory>;

interface CategoryFormState {
  name: string;
  slug: string;
  description: string;
  sort_order: string;
}

const EMPTY_FORM: CategoryFormState = { name: "", slug: "", description: "", sort_order: "0" };

/** Generate a URL-safe slug from a name. */
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[äÄ]/g, "ae")
    .replace(/[öÖ]/g, "oe")
    .replace(/[üÜ]/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Admin panel component for managing forum categories.
 * Supports create, edit (inline), reorder, and delete with confirmation.
 */
function ForumCategoryAdmin(): JSX.Element {
  const supabase = useSupabase();
  const clanContext = useClanContext();
  const t = useTranslations("admin.forumCategories");

  const [categories, setCategories] = useState<ForumCategoryRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [tablesReady, setTablesReady] = useState<boolean>(true);
  const [status, setStatus] = useState<string>("");

  /* Create form */
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState<CategoryFormState>({ ...EMPTY_FORM });

  /* Inline edit */
  const [editingId, setEditingId] = useState<string>("");
  const [editForm, setEditForm] = useState<CategoryFormState>({ ...EMPTY_FORM });

  /* Delete confirmation */
  const [deletingId, setDeletingId] = useState<string>("");
  const [deleteConfirmInput, setDeleteConfirmInput] = useState<string>("");

  /* ─── Load categories ─── */
  const loadCategories = useCallback(async (): Promise<void> => {
    if (!clanContext) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from("forum_categories")
      .select("*")
      .eq("clan_id", clanContext.clanId)
      .order("name", { ascending: true });
    if (error) {
      const isTableMissing = error.message.includes("schema cache") || error.code === "PGRST204";
      if (isTableMissing) {
        setTablesReady(false);
      }
      setIsLoading(false);
      return;
    }
    setCategories((data ?? []) as ForumCategoryRow[]);
    setIsLoading(false);
  }, [clanContext, supabase]);

  useEffect(() => {
    if (!clanContext) return;
    void loadCategories();
  }, [clanContext, loadCategories]);

  /* ─── Create ─── */
  async function handleCreate(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!clanContext || !createForm.name.trim()) return;
    const slug = createForm.slug.trim() || toSlug(createForm.name);
    const sortOrder = parseInt(createForm.sort_order, 10) || categories.length + 1;

    const response = await fetch("/api/admin/forum-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clan_id: clanContext.clanId,
        name: createForm.name.trim(),
        slug,
        description: createForm.description.trim() || null,
        sort_order: sortOrder,
      }),
    });
    if (!response.ok) {
      const result = await response.json();
      setStatus(`${t("error")}: ${result.error ?? response.statusText}`);
      return;
    }
    setStatus(t("categoryCreated"));
    setCreateForm({ ...EMPTY_FORM });
    setShowCreateForm(false);
    await loadCategories();
  }

  /* ─── Edit ─── */
  function startEdit(cat: ForumCategoryRow): void {
    setEditingId(cat.id);
    setEditForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description ?? "",
      sort_order: String(cat.sort_order),
    });
  }

  async function handleSaveEdit(): Promise<void> {
    if (!editForm.name.trim()) return;
    const slug = editForm.slug.trim() || toSlug(editForm.name);

    const response = await fetch("/api/admin/forum-categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingId,
        name: editForm.name.trim(),
        slug,
        description: editForm.description.trim() || null,
        sort_order: parseInt(editForm.sort_order, 10) || 0,
      }),
    });
    if (!response.ok) {
      const result = await response.json();
      setStatus(`${t("error")}: ${result.error ?? response.statusText}`);
      return;
    }
    setStatus(t("categoryUpdated"));
    setEditingId("");
    await loadCategories();
  }

  /* ─── Delete ─── */
  async function handleConfirmDelete(): Promise<void> {
    const cat = categories.find((c) => c.id === deletingId);
    if (!cat) return;
    if (deleteConfirmInput !== `DELETE ${cat.name}`) return;

    const response = await fetch(`/api/admin/forum-categories?id=${deletingId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const result = await response.json();
      setStatus(`${t("error")}: ${result.error ?? response.statusText}`);
      return;
    }
    setStatus(t("categoryDeleted"));
    setDeletingId("");
    setDeleteConfirmInput("");
    await loadCategories();
  }

  /* ─── Render ─── */

  if (!clanContext) {
    return (
      <p className="p-4" style={{ color: "var(--color-text-muted)" }}>
        {t("selectClan")}
      </p>
    );
  }

  if (!tablesReady) {
    return (
      <div className="p-4">
        <p className="text-text-muted">{t("tablesNotReady")}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-end items-center mb-4">
        <button
          className="button primary"
          type="button"
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            setCreateForm({ ...EMPTY_FORM, sort_order: String(categories.length + 1) });
          }}
        >
          {showCreateForm ? t("cancel") : t("addCategory")}
        </button>
      </div>

      {/* Status message */}
      {status && (
        <div className="alert info mb-3">
          {status}
          <button
            type="button"
            onClick={() => setStatus("")}
            className="ml-2 cursor-pointer text-[0.8rem]"
            style={{
              background: "none",
              border: "none",
              color: "inherit",
            }}
          >
            &#10005;
          </button>
        </div>
      )}

      {/* Create form */}
      {showCreateForm && (
        <form onSubmit={handleCreate} className="card mb-4 p-4">
          <h4 className="mb-2.5 text-[0.88rem]">{t("newCategory")}</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="cat-name">
                {t("name")} *
              </label>
              <input
                id="cat-name"
                type="text"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value, slug: toSlug(e.target.value) })}
                placeholder={t("namePlaceholder")}
                required
                className="w-full bg-bg text-text border border-edge rounded-sm"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="cat-slug">
                {t("slug")}
              </label>
              <input
                id="cat-slug"
                type="text"
                value={createForm.slug}
                onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value })}
                placeholder={t("slugPlaceholder")}
                className="w-full bg-bg text-text border border-edge rounded-sm"
              />
            </div>
            <div className="form-group col-span-full">
              <label className="form-label" htmlFor="cat-desc">
                {t("description")}
              </label>
              <input
                id="cat-desc"
                type="text"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder={t("descriptionPlaceholder")}
                className="w-full bg-bg text-text border border-edge rounded-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-2.5">
            <button className="button primary" type="submit" disabled={!createForm.name.trim()}>
              {t("createCategory")}
            </button>
            <button className="button" type="button" onClick={() => setShowCreateForm(false)}>
              {t("cancel")}
            </button>
          </div>
        </form>
      )}

      {/* Category list */}
      {isLoading ? (
        <p className="text-text-muted">{t("loading")}</p>
      ) : categories.length === 0 ? (
        <p className="text-text-muted">{t("noCategories")}</p>
      ) : (
        <div className="flex flex-col gap-1">
          {categories.map((cat) => (
            <div key={cat.id}>
              {editingId === cat.id ? (
                /* Inline edit form */
                <div className="card p-3">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end" }}>
                    <div className="form-group">
                      <label className="form-label">{t("name")}</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full bg-bg text-text border border-edge rounded-sm text-[0.82rem]"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{t("slug")}</label>
                      <input
                        type="text"
                        value={editForm.slug}
                        onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                        className="w-full bg-bg text-text border border-edge rounded-sm text-[0.82rem]"
                      />
                    </div>
                    <div className="flex gap-1.5">
                      <button className="button primary text-xs" type="button" onClick={handleSaveEdit}>
                        {t("save")}
                      </button>
                      <button className="button text-xs" type="button" onClick={() => setEditingId("")}>
                        {t("cancel")}
                      </button>
                    </div>
                  </div>
                  <div className="mt-1.5">
                    <input
                      type="text"
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      placeholder={t("descriptionPlaceholder")}
                      className="w-full bg-bg text-text border border-edge rounded-sm text-[0.82rem]"
                    />
                  </div>
                </div>
              ) : deletingId === cat.id ? (
                /* Delete confirmation */
                <div className="card p-3" style={{ borderColor: "var(--color-accent-red)" }}>
                  <p className="text-[0.82rem] mb-2">
                    {t("confirmDeleteText")} <strong className="text-accent-red">DELETE {cat.name}</strong>
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmInput}
                    onChange={(e) => setDeleteConfirmInput(e.target.value)}
                    placeholder={`DELETE ${cat.name}`}
                    className="w-full bg-bg text-text border border-edge rounded-sm text-[0.82rem]"
                  />
                  <div className="flex gap-1.5">
                    <button
                      className="button danger"
                      type="button"
                      onClick={handleConfirmDelete}
                      disabled={deleteConfirmInput !== `DELETE ${cat.name}`}
                    >
                      {t("delete")}
                    </button>
                    <button
                      className="button"
                      type="button"
                      onClick={() => {
                        setDeletingId("");
                        setDeleteConfirmInput("");
                      }}
                    >
                      {t("cancel")}
                    </button>
                  </div>
                </div>
              ) : (
                /* Normal row */
                <div
                  className="flex items-center gap-2.5 rounded-sm px-3 py-2"
                  style={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-edge)",
                  }}
                >
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[0.84rem] text-text">
                      {cat.name}
                      <span className="ml-2 text-[0.7rem] text-text-muted">/{cat.slug}</span>
                    </div>
                    {cat.description && <div className="text-[0.72rem] text-text-muted mt-px">{cat.description}</div>}
                  </div>
                  {/* Actions */}
                  <button className="forum-mod-btn" type="button" onClick={() => startEdit(cat)} aria-label={t("edit")}>
                    &#9998;
                  </button>
                  <button
                    className="forum-mod-btn danger"
                    type="button"
                    onClick={() => {
                      setDeletingId(cat.id);
                      setDeleteConfirmInput("");
                    }}
                    aria-label={t("delete")}
                  >
                    &#128465;
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ForumCategoryAdmin;
