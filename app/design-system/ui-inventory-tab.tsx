"use client";

import { useState, useEffect, useCallback, useRef, type ReactElement } from "react";
import Image from "next/image";
import type { UiElement, AssetAssignment, RenderType } from "./design-system-types";
import {
  UI_ELEMENT_CATEGORIES,
  RENDER_TYPES,
  ASSIGNABLE_RENDER_TYPES,
  RENDER_TYPE_LABELS,
  RENDER_TYPE_COLORS,
} from "./design-system-types";
import ThumbnailSizePicker, { UI_ELEMENT_SIZES } from "./thumbnail-size-picker";
import AssignmentModal from "./assignment-modal";

/* ------------------------------------------------------------------ */
/*  Inline HTML Preview Component                                      */
/* ------------------------------------------------------------------ */

function InlinePreview({ html }: { readonly html: string }): ReactElement {
  return (
    <div
      className="inline-preview-scope"
      dangerouslySetInnerHTML={{ __html: html }}
      style={{
        padding: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 48,
        pointerEvents: "none",
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Render Type Badge                                                  */
/* ------------------------------------------------------------------ */

function RenderTypeBadge({ renderType }: { readonly renderType: RenderType }): ReactElement {
  const color = RENDER_TYPE_COLORS[renderType] ?? "";
  const label = RENDER_TYPE_LABELS[renderType] ?? renderType;
  const cls = color ? `badge ${color}` : "badge";
  return (
    <span className={cls} style={{ fontSize: "0.6rem", padding: "0 6px" }}>
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  UI Inventory Tab — Card grid with previews + assignment modal      */
/* ------------------------------------------------------------------ */

function UiInventoryTab(): ReactElement {
  const [elements, setElements] = useState<UiElement[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Filters */
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [renderTypeFilter, setRenderTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [previewSize, setPreviewSize] = useState(90);

  /* Editing */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<UiElement>>({});

  /* Add form */
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    description: "",
    category: "button",
    subcategory: "",
    component_file: "",
    current_css: "",
    status: "active" as const,
    render_type: "css" as RenderType,
  });

  /* Assignment modal */
  const [assignElement, setAssignElement] = useState<UiElement | null>(null);

  /* Previews: map elementId -> assignments */
  const [previewMap, setPreviewMap] = useState<Record<string, AssetAssignment[]>>({});

  /* Screenshot upload */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);

  /* ── Fetch elements ── */

  const fetchElements = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (renderTypeFilter !== "all") params.set("render_type", renderTypeFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/design-system/ui-elements?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setElements(json.data ?? []);
      setTotalCount(json.count ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load UI elements");
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter, statusFilter, renderTypeFilter, search]);

  useEffect(() => {
    fetchElements();
  }, [fetchElements]);

  /* ── Fetch asset-assignment previews for assignable elements ── */

  const fetchPreviews = useCallback(async (elementIds: string[]) => {
    if (elementIds.length === 0) return;
    try {
      const results: Record<string, AssetAssignment[]> = {};
      await Promise.all(
        elementIds.map(async (id) => {
          const res = await fetch(`/api/design-system/assignments?ui_element_id=${id}`);
          if (res.ok) {
            const json = await res.json();
            results[id] = json.data ?? [];
          }
        }),
      );
      setPreviewMap((prev) => ({ ...prev, ...results }));
    } catch {
      /* Silent */
    }
  }, []);

  useEffect(() => {
    const assignable = elements.filter((e) => ASSIGNABLE_RENDER_TYPES.includes(e.render_type));
    if (assignable.length > 0) {
      fetchPreviews(assignable.map((e) => e.id));
    }
  }, [elements, fetchPreviews]);

  /* ── Group by category ── */

  function groupByCategory(items: UiElement[]): Record<string, UiElement[]> {
    const groups: Record<string, UiElement[]> = {};
    for (const item of items) {
      const existing = groups[item.category];
      if (existing) {
        existing.push(item);
      } else {
        groups[item.category] = [item];
      }
    }
    return groups;
  }

  const grouped = groupByCategory(elements);

  /* ── Inline edit ── */

  function startEdit(el: UiElement): void {
    setEditingId(el.id);
    setEditForm({
      description: el.description ?? "",
      notes: el.notes ?? "",
      status: el.status,
      render_type: el.render_type,
    });
  }

  async function saveEdit(): Promise<void> {
    if (!editingId) return;
    try {
      const res = await fetch("/api/design-system/ui-elements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, ...editForm }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setEditingId(null);
      fetchElements();
    } catch {
      /* Silent */
    }
  }

  /* ── Add element ── */

  async function handleAdd(): Promise<void> {
    if (!addForm.name || !addForm.category) return;
    try {
      const res = await fetch("/api/design-system/ui-elements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...addForm,
          subcategory: addForm.subcategory || null,
          component_file: addForm.component_file || null,
          current_css: addForm.current_css || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to add");
      setIsAdding(false);
      setAddForm({
        name: "",
        description: "",
        category: "button",
        subcategory: "",
        component_file: "",
        current_css: "",
        status: "active",
        render_type: "css",
      });
      fetchElements();
    } catch {
      /* Silent */
    }
  }

  /* ── Delete element ── */

  async function handleDelete(id: string): Promise<void> {
    if (!confirm("Delete this UI element?")) return;
    try {
      await fetch("/api/design-system/ui-elements", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      fetchElements();
    } catch {
      /* Silent */
    }
  }

  /* ── Screenshot upload ── */

  async function handleScreenshotUpload(file: File, elementId: string): Promise<void> {
    const form = new FormData();
    form.append("file", file);
    form.append("element_id", elementId);
    try {
      const res = await fetch("/api/design-system/preview-upload", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      fetchElements();
    } catch {
      /* Silent */
    }
  }

  function triggerUpload(elementId: string): void {
    setUploadTarget(elementId);
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (file && uploadTarget) {
      handleScreenshotUpload(file, uploadTarget);
    }
    setUploadTarget(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  /* ── Status badge ── */

  function statusBadgeClass(status: string): string {
    switch (status) {
      case "active":
        return "badge success";
      case "planned":
        return "badge info";
      case "deprecated":
        return "badge warning";
      default:
        return "badge";
    }
  }

  /* ── Can this element have assets assigned? ── */

  function isAssignable(el: UiElement): boolean {
    return ASSIGNABLE_RENDER_TYPES.includes(el.render_type);
  }

  /* ── Render preview area per element ── */

  function renderPreviewArea(el: UiElement): ReactElement {
    const assignments = previewMap[el.id] ?? [];

    /* Inline HTML preview (css, icon, typography, hybrid) */
    if (el.preview_html) {
      return <InlinePreview html={el.preview_html} />;
    }

    /* Screenshot preview */
    if (el.preview_image) {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>
          <Image
            src={el.preview_image}
            alt={`${el.name} preview`}
            width={previewSize * 2}
            height={previewSize}
            style={{ maxWidth: "100%", maxHeight: previewSize, objectFit: "contain" }}
            unoptimized
          />
        </div>
      );
    }

    /* Asset-based preview from assignments */
    if (isAssignable(el) && assignments.length > 0) {
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: 8, overflowX: "auto" }}>
          {assignments.slice(0, 4).map((a) => (
            <div
              key={a.id}
              style={{
                width: previewSize,
                height: previewSize,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 6,
                border: "1px solid var(--color-edge)",
                background: "var(--color-surface)",
                position: "relative",
              }}
            >
              {a.design_assets && (
                <Image
                  src={a.design_assets.public_path}
                  alt={a.design_assets.filename}
                  width={previewSize - 8}
                  height={previewSize - 8}
                  style={{ objectFit: "contain" }}
                  unoptimized
                />
              )}
              <span
                style={{
                  position: "absolute",
                  bottom: 2,
                  right: 4,
                  fontSize: "0.5rem",
                  color: "var(--color-text-muted)",
                  background: "var(--color-surface)",
                  padding: "0 3px",
                  borderRadius: 3,
                }}
              >
                {a.role}
              </span>
            </div>
          ))}
          {assignments.length > 4 && (
            <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
              +{assignments.length - 4}
            </span>
          )}
        </div>
      );
    }

    /* Empty state */
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          color: "var(--color-text-muted)",
          fontSize: "0.72rem",
        }}
      >
        {el.render_type === "composite" ? "Upload screenshot" : "No preview"}
      </div>
    );
  }

  /* ── Render ── */

  return (
    <>
      {/* Hidden file input for screenshot uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <section className="card">
        <div className="card-header">
          <div>
            <div className="card-title">UI Element Inventory</div>
            <div className="card-subtitle">
              {totalCount} UI elements across {Object.keys(grouped).length} categories
            </div>
          </div>
          <button
            className="button primary"
            style={{ fontSize: "0.85rem", padding: "6px 16px" }}
            onClick={() => setIsAdding(!isAdding)}
          >
            {isAdding ? "Cancel" : "+ Add Element"}
          </button>
        </div>

        {/* Toolbar */}
        <div
          style={{
            display: "flex",
            gap: 12,
            padding: "12px 16px",
            flexWrap: "wrap",
            alignItems: "center",
            borderBottom: "1px solid var(--color-edge)",
          }}
        >
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ minWidth: 140 }}>
            <option value="all">All Categories</option>
            {UI_ELEMENT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ minWidth: 100 }}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="planned">Planned</option>
            <option value="deprecated">Deprecated</option>
          </select>
          <select
            value={renderTypeFilter}
            onChange={(e) => setRenderTypeFilter(e.target.value)}
            style={{ minWidth: 120 }}
          >
            <option value="all">All Types</option>
            {RENDER_TYPES.map((rt) => (
              <option key={rt} value={rt}>
                {RENDER_TYPE_LABELS[rt] ?? rt}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search elements..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 160 }}
          />
          <ThumbnailSizePicker
            sizes={UI_ELEMENT_SIZES}
            value={previewSize}
            onChange={setPreviewSize}
            label="Preview:"
          />
        </div>

        {/* Add form */}
        {isAdding && (
          <div
            style={{
              padding: 16,
              borderBottom: "1px solid var(--color-edge)",
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 12,
            }}
          >
            <input
              type="text"
              placeholder="Name *"
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
            />
            <select value={addForm.category} onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}>
              {UI_ELEMENT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <select
              value={addForm.render_type}
              onChange={(e) => setAddForm({ ...addForm, render_type: e.target.value as RenderType })}
            >
              {RENDER_TYPES.map((rt) => (
                <option key={rt} value={rt}>
                  {RENDER_TYPE_LABELS[rt] ?? rt}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Description"
              value={addForm.description}
              onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
            />
            <input
              type="text"
              placeholder="Subcategory"
              value={addForm.subcategory}
              onChange={(e) => setAddForm({ ...addForm, subcategory: e.target.value })}
            />
            <input
              type="text"
              placeholder="Component file"
              value={addForm.component_file}
              onChange={(e) => setAddForm({ ...addForm, component_file: e.target.value })}
            />
            <input
              type="text"
              placeholder="CSS class"
              value={addForm.current_css}
              onChange={(e) => setAddForm({ ...addForm, current_css: e.target.value })}
            />
            <div>
              <button
                className="button primary"
                style={{ fontSize: "0.85rem", padding: "6px 16px" }}
                onClick={handleAdd}
              >
                Add Element
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ padding: 16, color: "var(--color-accent-red)" }}>
            Error: {error}
            <button className="button" style={{ marginLeft: 12 }} onClick={fetchElements}>
              Retry
            </button>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 12,
              padding: 16,
            }}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ width: "100%", height: 140, borderRadius: 10 }} />
            ))}
          </div>
        )}

        {/* Card grid grouped by category */}
        {!isLoading && (
          <div style={{ maxHeight: "calc(100vh - 360px)", overflowY: "auto", padding: "8px 16px 16px" }}>
            {Object.entries(grouped)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([cat, items]) => (
                <div key={cat} style={{ marginBottom: 20 }}>
                  {/* Category header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 10,
                      padding: "8px 0",
                      borderBottom: "1px solid var(--color-edge)",
                      position: "sticky",
                      top: 0,
                      zIndex: 1,
                      background: "var(--color-bg)",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: "1rem",
                        textTransform: "capitalize",
                        color: "var(--color-gold)",
                      }}
                    >
                      {cat}
                    </span>
                    <span className="badge" style={{ fontSize: "0.7rem", padding: "1px 8px" }}>
                      {items.length}
                    </span>
                  </div>

                  {/* Cards grid */}
                  <div
                    style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 10 }}
                  >
                    {items.map((el) => {
                      const isEditing = editingId === el.id;
                      return (
                        <div
                          key={el.id}
                          style={{
                            borderRadius: 10,
                            border: "1px solid var(--color-edge)",
                            background: "var(--color-surface)",
                            overflow: "hidden",
                            display: "flex",
                            flexDirection: "column",
                          }}
                        >
                          {/* Card top: preview area */}
                          <div
                            style={{
                              minHeight: previewSize + 16,
                              background: "var(--color-bg)",
                              borderBottom: "1px solid var(--color-edge)",
                              overflow: "hidden",
                            }}
                          >
                            {renderPreviewArea(el)}
                          </div>

                          {/* Card body */}
                          <div
                            style={{ padding: "10px 12px", flex: 1, display: "flex", flexDirection: "column", gap: 4 }}
                          >
                            {isEditing ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{el.name}</div>
                                <input
                                  type="text"
                                  placeholder="Description"
                                  value={editForm.description ?? ""}
                                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                  style={{ fontSize: "0.8rem" }}
                                />
                                <input
                                  type="text"
                                  placeholder="Notes"
                                  value={editForm.notes ?? ""}
                                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                  style={{ fontSize: "0.8rem" }}
                                />
                                <div style={{ display: "flex", gap: 8 }}>
                                  <select
                                    value={editForm.status ?? "active"}
                                    onChange={(e) =>
                                      setEditForm({ ...editForm, status: e.target.value as UiElement["status"] })
                                    }
                                    style={{ fontSize: "0.8rem" }}
                                  >
                                    <option value="active">Active</option>
                                    <option value="planned">Planned</option>
                                    <option value="deprecated">Deprecated</option>
                                  </select>
                                  <select
                                    value={
                                      ((editForm as Record<string, unknown>).render_type as string) ?? el.render_type
                                    }
                                    onChange={(e) =>
                                      setEditForm({ ...editForm, render_type: e.target.value as RenderType })
                                    }
                                    style={{ fontSize: "0.8rem" }}
                                  >
                                    {RENDER_TYPES.map((rt) => (
                                      <option key={rt} value={rt}>
                                        {RENDER_TYPE_LABELS[rt] ?? rt}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div style={{ display: "flex", gap: 6 }}>
                                  <button
                                    className="button primary"
                                    style={{ fontSize: "0.75rem", padding: "3px 10px" }}
                                    onClick={saveEdit}
                                  >
                                    Save
                                  </button>
                                  <button
                                    className="button"
                                    style={{ fontSize: "0.75rem", padding: "3px 10px" }}
                                    onClick={() => setEditingId(null)}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                  <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{el.name}</span>
                                  {el.subcategory && (
                                    <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                                      ({el.subcategory})
                                    </span>
                                  )}
                                  <span
                                    className={statusBadgeClass(el.status)}
                                    style={{ fontSize: "0.6rem", padding: "0 6px" }}
                                  >
                                    {el.status}
                                  </span>
                                  <RenderTypeBadge renderType={el.render_type} />
                                </div>
                                {el.description && (
                                  <div style={{ fontSize: "0.78rem", color: "var(--color-text-2)", lineHeight: 1.3 }}>
                                    {el.description}
                                  </div>
                                )}
                                <div
                                  style={{
                                    display: "flex",
                                    gap: 8,
                                    fontSize: "0.7rem",
                                    color: "var(--color-text-muted)",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  {el.component_file && <span>File: {el.component_file}</span>}
                                  {el.current_css && (
                                    <span>
                                      CSS: <code>{el.current_css}</code>
                                    </span>
                                  )}
                                </div>
                                {el.notes && (
                                  <div
                                    style={{
                                      fontSize: "0.7rem",
                                      color: "var(--color-text-muted)",
                                      fontStyle: "italic",
                                    }}
                                  >
                                    {el.notes}
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          {/* Card actions bar */}
                          {!isEditing && (
                            <div
                              style={{
                                display: "flex",
                                gap: 6,
                                padding: "8px 12px",
                                borderTop: "1px solid var(--color-edge)",
                                background: "rgba(0,0,0,0.1)",
                                flexWrap: "wrap",
                              }}
                            >
                              {isAssignable(el) && (
                                <button
                                  className="button primary"
                                  style={{ fontSize: "0.72rem", padding: "3px 10px", flex: 1, minWidth: 80 }}
                                  onClick={() => setAssignElement(el)}
                                >
                                  Assign Assets ({(previewMap[el.id] ?? []).length})
                                </button>
                              )}
                              {(el.render_type === "composite" || (!el.preview_html && !el.preview_image)) && (
                                <button
                                  className="button"
                                  style={{ fontSize: "0.72rem", padding: "3px 10px" }}
                                  onClick={() => triggerUpload(el.id)}
                                >
                                  Screenshot
                                </button>
                              )}
                              <button
                                className="button"
                                style={{ fontSize: "0.72rem", padding: "3px 10px" }}
                                onClick={() => startEdit(el)}
                              >
                                Edit
                              </button>
                              <button
                                className="button danger"
                                style={{ fontSize: "0.72rem", padding: "3px 10px" }}
                                onClick={() => handleDelete(el.id)}
                              >
                                Del
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && elements.length === 0 && !error && (
          <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-muted)" }}>
            No UI elements found. Run the scanner script first:
            <br />
            <code
              style={{
                display: "inline-block",
                marginTop: 8,
                padding: "4px 12px",
                background: "var(--color-surface)",
                borderRadius: 6,
                fontSize: "0.85rem",
              }}
            >
              npx tsx scripts/scan-ui-elements.ts
            </code>
          </div>
        )}
      </section>

      {/* Assignment modal */}
      {assignElement && (
        <AssignmentModal
          element={assignElement}
          onClose={() => setAssignElement(null)}
          onAssignmentsChange={() => fetchPreviews([assignElement.id])}
        />
      )}
    </>
  );
}

export default UiInventoryTab;
