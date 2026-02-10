"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";
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
  const supabase = createSupabaseBrowserClient();
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
      .order("sort_order", { ascending: true });
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

  /* ─── Move (reorder) ─── */
  async function handleMoveUp(index: number): Promise<void> {
    if (index <= 0) return;
    const current = categories[index];
    const above = categories[index - 1];
    /* Swap sort_order values; if they are identical, assign distinct values */
    const currentOrder = current.sort_order;
    const aboveOrder = above.sort_order;
    const newCurrentOrder = currentOrder === aboveOrder ? aboveOrder - 1 : aboveOrder;
    const newAboveOrder = currentOrder === aboveOrder ? currentOrder : currentOrder;

    await Promise.all([
      fetch("/api/admin/forum-categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: current.id, sort_order: newCurrentOrder }),
      }),
      fetch("/api/admin/forum-categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: above.id, sort_order: newAboveOrder }),
      }),
    ]);
    await loadCategories();
  }

  async function handleMoveDown(index: number): Promise<void> {
    if (index >= categories.length - 1) return;
    const current = categories[index];
    const below = categories[index + 1];
    const currentOrder = current.sort_order;
    const belowOrder = below.sort_order;
    const newCurrentOrder = currentOrder === belowOrder ? belowOrder + 1 : belowOrder;
    const newBelowOrder = currentOrder === belowOrder ? currentOrder : currentOrder;

    await Promise.all([
      fetch("/api/admin/forum-categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: current.id, sort_order: newCurrentOrder }),
      }),
      fetch("/api/admin/forum-categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: below.id, sort_order: newBelowOrder }),
      }),
    ]);
    await loadCategories();
  }

  /* ─── Render ─── */

  if (!clanContext) {
    return <p style={{ color: "var(--color-text-muted)", padding: 16 }}>{t("selectClan")}</p>;
  }

  if (!tablesReady) {
    return (
      <div style={{ padding: 16 }}>
        <p style={{ color: "var(--color-text-muted)" }}>{t("tablesNotReady")}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: 16 }}>
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
        <div className="alert info" style={{ marginBottom: 12 }}>
          {status}
          <button
            type="button"
            onClick={() => setStatus("")}
            style={{
              marginLeft: 8,
              background: "none",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            &#10005;
          </button>
        </div>
      )}

      {/* Create form */}
      {showCreateForm && (
        <form onSubmit={handleCreate} className="card" style={{ marginBottom: 16, padding: 16 }}>
          <h4 style={{ margin: "0 0 10px", fontSize: "0.88rem" }}>{t("newCategory")}</h4>
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
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  background: "var(--color-bg)",
                  color: "var(--color-text)",
                  border: "1px solid var(--color-edge)",
                  borderRadius: "var(--radius-sm)",
                }}
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
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  background: "var(--color-bg)",
                  color: "var(--color-text)",
                  border: "1px solid var(--color-edge)",
                  borderRadius: "var(--radius-sm)",
                }}
              />
            </div>
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label className="form-label" htmlFor="cat-desc">
                {t("description")}
              </label>
              <input
                id="cat-desc"
                type="text"
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder={t("descriptionPlaceholder")}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  background: "var(--color-bg)",
                  color: "var(--color-text)",
                  border: "1px solid var(--color-edge)",
                  borderRadius: "var(--radius-sm)",
                }}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="cat-order">
                {t("sortOrder")}
              </label>
              <input
                id="cat-order"
                type="number"
                value={createForm.sort_order}
                onChange={(e) => setCreateForm({ ...createForm, sort_order: e.target.value })}
                style={{
                  width: 80,
                  padding: "6px 10px",
                  background: "var(--color-bg)",
                  color: "var(--color-text)",
                  border: "1px solid var(--color-edge)",
                  borderRadius: "var(--radius-sm)",
                }}
              />
            </div>
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
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
        <p style={{ color: "var(--color-text-muted)" }}>{t("loading")}</p>
      ) : categories.length === 0 ? (
        <p style={{ color: "var(--color-text-muted)" }}>{t("noCategories")}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {categories.map((cat, index) => (
            <div key={cat.id}>
              {editingId === cat.id ? (
                /* Inline edit form */
                <div className="card" style={{ padding: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end" }}>
                    <div className="form-group">
                      <label className="form-label">{t("name")}</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "5px 8px",
                          background: "var(--color-bg)",
                          color: "var(--color-text)",
                          border: "1px solid var(--color-edge)",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "0.82rem",
                        }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{t("slug")}</label>
                      <input
                        type="text"
                        value={editForm.slug}
                        onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "5px 8px",
                          background: "var(--color-bg)",
                          color: "var(--color-text)",
                          border: "1px solid var(--color-edge)",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "0.82rem",
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        className="button primary"
                        type="button"
                        onClick={handleSaveEdit}
                        style={{ fontSize: "0.75rem", padding: "5px 10px" }}
                      >
                        {t("save")}
                      </button>
                      <button
                        className="button"
                        type="button"
                        onClick={() => setEditingId("")}
                        style={{ fontSize: "0.75rem", padding: "5px 10px" }}
                      >
                        {t("cancel")}
                      </button>
                    </div>
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <input
                      type="text"
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      placeholder={t("descriptionPlaceholder")}
                      style={{
                        width: "100%",
                        padding: "5px 8px",
                        background: "var(--color-bg)",
                        color: "var(--color-text)",
                        border: "1px solid var(--color-edge)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "0.82rem",
                      }}
                    />
                  </div>
                </div>
              ) : deletingId === cat.id ? (
                /* Delete confirmation */
                <div className="card" style={{ padding: 12, borderColor: "var(--color-accent-red)" }}>
                  <p style={{ fontSize: "0.82rem", marginBottom: 8 }}>
                    {t("confirmDeleteText")}{" "}
                    <strong style={{ color: "var(--color-accent-red)" }}>DELETE {cat.name}</strong>
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmInput}
                    onChange={(e) => setDeleteConfirmInput(e.target.value)}
                    placeholder={`DELETE ${cat.name}`}
                    style={{
                      width: "100%",
                      padding: "5px 8px",
                      background: "var(--color-bg)",
                      color: "var(--color-text)",
                      border: "1px solid var(--color-edge)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "0.82rem",
                      marginBottom: 8,
                    }}
                  />
                  <div style={{ display: "flex", gap: 6 }}>
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
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 12px",
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-edge)",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  {/* Reorder buttons */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <button
                      type="button"
                      className="forum-mod-btn"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      aria-label={t("moveUp")}
                      style={{ fontSize: "0.65rem", padding: "1px 4px" }}
                    >
                      &#9650;
                    </button>
                    <button
                      type="button"
                      className="forum-mod-btn"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === categories.length - 1}
                      aria-label={t("moveDown")}
                      style={{ fontSize: "0.65rem", padding: "1px 4px" }}
                    >
                      &#9660;
                    </button>
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.84rem", color: "var(--color-text)" }}>
                      {cat.name}
                      <span style={{ marginLeft: 8, fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                        /{cat.slug}
                      </span>
                    </div>
                    {cat.description && (
                      <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginTop: 1 }}>
                        {cat.description}
                      </div>
                    )}
                  </div>
                  {/* Sort order */}
                  <span style={{ fontSize: "0.68rem", color: "var(--color-text-muted)" }}>#{cat.sort_order}</span>
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
