"use client";

import { useState, useEffect, useCallback, type ReactElement } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { DesignAsset, UiElement, AssetAssignment } from "./design-system-types";
import {
  UI_ELEMENT_CATEGORIES,
  ASSET_CATEGORIES,
  ASSIGNMENT_ROLES,
  ASSIGNABLE_RENDER_TYPES,
  RENDER_TYPE_COLORS,
  formatFileSize,
} from "./design-system-types";
import ThumbnailSizePicker, { ASSET_SIZES, UI_ELEMENT_SIZES } from "./thumbnail-size-picker";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 200;

/* ------------------------------------------------------------------ */
/*  Assignment Tab — Side-by-Side with pagination + rich previews      */
/* ------------------------------------------------------------------ */

function AssignmentTab(): ReactElement {
  const t = useTranslations("designSystem");
  /* ── UI Elements (left panel) ── */
  const [uiElements, setUiElements] = useState<UiElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<UiElement | null>(null);
  const [elementFilter, setElementFilter] = useState("all");
  const [elementSearch, setElementSearch] = useState("");
  const [elementPreviewSize, setElementPreviewSize] = useState(60);

  /* ── Assets (right panel) ── */
  const [assets, setAssets] = useState<DesignAsset[]>([]);
  const [totalAssets, setTotalAssets] = useState(0);
  const [assetOffset, setAssetOffset] = useState(0);
  const [assetCategory, setAssetCategory] = useState("all");
  const [assetSearch, setAssetSearch] = useState("");
  const [assetThumbSize, setAssetThumbSize] = useState(100);

  /* ── Assignments ── */
  const [assignments, setAssignments] = useState<AssetAssignment[]>([]);
  const [assignRole, setAssignRole] = useState("default");

  /* ── Preview map for elements (shows small thumbs in left list) ── */
  const [elementPreviews, setElementPreviews] = useState<Record<string, AssetAssignment[]>>({});

  /* ── Loading states ── */
  const [isLoadingElements, setIsLoadingElements] = useState(true);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);

  /* ── Fetch UI elements ── */

  const fetchElements = useCallback(async () => {
    setIsLoadingElements(true);
    try {
      const params = new URLSearchParams();
      if (elementFilter !== "all") params.set("category", elementFilter);
      if (elementSearch) params.set("search", elementSearch);
      const res = await fetch(`/api/design-system/ui-elements?${params}`);
      const json = await res.json();
      setUiElements(json.data ?? []);
    } catch {
      /* Silent */
    } finally {
      setIsLoadingElements(false);
    }
  }, [elementFilter, elementSearch]);

  useEffect(() => {
    fetchElements();
  }, [fetchElements]);

  /* ── Fetch element previews (first 3 assigned assets per element) ── */

  const fetchElementPreviews = useCallback(async (elementIds: string[]) => {
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
      setElementPreviews((prev) => ({ ...prev, ...results }));
    } catch {
      /* Silent */
    }
  }, []);

  useEffect(() => {
    if (uiElements.length > 0) {
      fetchElementPreviews(uiElements.map((e) => e.id));
    }
  }, [uiElements, fetchElementPreviews]);

  /* ── Fetch assets ── */

  const fetchAssets = useCallback(async () => {
    setIsLoadingAssets(true);
    try {
      const params = new URLSearchParams();
      if (assetCategory !== "all") params.set("category", assetCategory);
      if (assetSearch) params.set("search", assetSearch);
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(assetOffset));
      const res = await fetch(`/api/design-system/assets?${params}`);
      const json = await res.json();
      setAssets(json.data ?? []);
      setTotalAssets(json.count ?? 0);
    } catch {
      /* Silent */
    } finally {
      setIsLoadingAssets(false);
    }
  }, [assetCategory, assetSearch, assetOffset]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  /* ── Fetch assignments for selected element ── */

  const fetchAssignments = useCallback(async (elementId: string) => {
    setIsLoadingAssignments(true);
    try {
      const res = await fetch(`/api/design-system/assignments?ui_element_id=${elementId}`);
      const json = await res.json();
      setAssignments(json.data ?? []);
    } catch {
      setAssignments([]);
    } finally {
      setIsLoadingAssignments(false);
    }
  }, []);

  useEffect(() => {
    if (selectedElement) {
      fetchAssignments(selectedElement.id);
    } else {
      setAssignments([]);
    }
  }, [selectedElement, fetchAssignments]);

  /* ── Assign asset ── */

  async function handleAssign(asset: DesignAsset): Promise<void> {
    if (!selectedElement) return;
    try {
      const res = await fetch("/api/design-system/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ui_element_id: selectedElement.id, asset_id: asset.id, role: assignRole }),
      });
      if (!res.ok) throw new Error("Failed");
      fetchAssignments(selectedElement.id);
      fetchElementPreviews([selectedElement.id]);
    } catch {
      /* Silent */
    }
  }

  /* ── Remove assignment ── */

  async function handleRemoveAssignment(assignmentId: string): Promise<void> {
    try {
      await fetch("/api/design-system/assignments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: assignmentId }),
      });
      if (selectedElement) {
        fetchAssignments(selectedElement.id);
        fetchElementPreviews([selectedElement.id]);
      }
    } catch {
      /* Silent */
    }
  }

  /* ── Pagination ── */

  const totalPages = Math.ceil(totalAssets / PAGE_SIZE);
  const currentPage = Math.floor(assetOffset / PAGE_SIZE) + 1;

  /* ── Render ── */

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <div className="card-title">{t("assignments.title")}</div>
          <div className="card-subtitle">{t("assignments.subtitle")}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: "0.85rem", color: "var(--color-text-2)" }}>{t("common.role")}</label>
          <select
            value={assignRole}
            onChange={(e) => setAssignRole(e.target.value)}
            style={{ fontSize: "0.85rem", minWidth: 100 }}
          >
            {ASSIGNMENT_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "420px 1fr",
          minHeight: 500,
          borderTop: "1px solid var(--color-edge)",
        }}
      >
        {/* ══════ LEFT PANEL: UI Elements ══════ */}
        <div style={{ borderRight: "1px solid var(--color-edge)", display: "flex", flexDirection: "column" }}>
          {/* Filters */}
          <div
            style={{
              padding: "8px 12px",
              display: "flex",
              gap: 8,
              alignItems: "center",
              borderBottom: "1px solid var(--color-edge)",
              flexWrap: "wrap",
            }}
          >
            <select
              value={elementFilter}
              onChange={(e) => setElementFilter(e.target.value)}
              style={{ fontSize: "0.8rem", flex: 1, minWidth: 80 }}
            >
              <option value="all">{t("common.allCategories")}</option>
              {UI_ELEMENT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder={t("common.search")}
              value={elementSearch}
              onChange={(e) => setElementSearch(e.target.value)}
              style={{ fontSize: "0.8rem", flex: 1, minWidth: 80 }}
            />
            <ThumbnailSizePicker sizes={UI_ELEMENT_SIZES} value={elementPreviewSize} onChange={setElementPreviewSize} />
          </div>

          {/* Element list with previews */}
          <div style={{ flex: 1, overflowY: "auto", maxHeight: "calc(100vh - 400px)" }}>
            {isLoadingElements ? (
              <div style={{ padding: 16 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="skeleton"
                    style={{ width: "100%", height: 60, marginBottom: 6, borderRadius: 6 }}
                  />
                ))}
              </div>
            ) : (
              uiElements
                .filter((el) => ASSIGNABLE_RENDER_TYPES.includes(el.render_type))
                .map((el) => {
                  const elAssignments = elementPreviews[el.id] ?? [];
                  const isSelected = selectedElement?.id === el.id;
                  const rtColor = RENDER_TYPE_COLORS[el.render_type];
                  return (
                    <button
                      key={el.id}
                      type="button"
                      onClick={() => setSelectedElement(el)}
                      style={{
                        display: "flex",
                        width: "100%",
                        textAlign: "left",
                        padding: "8px 12px",
                        gap: 10,
                        alignItems: "center",
                        borderBottom: "1px solid rgba(201, 163, 74, 0.06)",
                        background: isSelected ? "rgba(201, 163, 74, 0.1)" : "transparent",
                        borderLeft: isSelected ? "3px solid var(--color-gold)" : "3px solid transparent",
                        cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                    >
                      {/* Small preview thumbs */}
                      <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                        {elAssignments.length > 0 ? (
                          elAssignments.slice(0, 2).map((a) => (
                            <div
                              key={a.id}
                              style={{
                                width: elementPreviewSize,
                                height: elementPreviewSize,
                                flexShrink: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: 4,
                                border: "1px solid var(--color-edge)",
                                background: "var(--color-surface)",
                              }}
                            >
                              {a.design_assets && (
                                <Image
                                  src={a.design_assets.public_path}
                                  alt={a.design_assets.filename}
                                  width={elementPreviewSize - 6}
                                  height={elementPreviewSize - 6}
                                  style={{ objectFit: "contain" }}
                                  unoptimized
                                />
                              )}
                            </div>
                          ))
                        ) : (
                          <div
                            style={{
                              width: elementPreviewSize,
                              height: elementPreviewSize,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: 4,
                              border: "1px dashed var(--color-edge)",
                              fontSize: "0.6rem",
                              color: "var(--color-text-muted)",
                            }}
                          >
                            —
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 500, fontSize: "0.85rem" }}>{el.name}</span>
                          <span
                            style={{
                              fontSize: "0.65rem",
                              color: "var(--color-text-muted)",
                              textTransform: "capitalize",
                            }}
                          >
                            {el.category}
                          </span>
                          <span
                            className={rtColor ? `badge ${rtColor}` : "badge"}
                            style={{ fontSize: "0.5rem", padding: "0 4px" }}
                          >
                            {t("renderType." + el.render_type)}
                          </span>
                          {elAssignments.length > 0 && (
                            <span className="badge info" style={{ fontSize: "0.55rem", padding: "0 5px" }}>
                              {elAssignments.length}
                            </span>
                          )}
                        </div>
                        {el.description && (
                          <div
                            style={{
                              fontSize: "0.73rem",
                              color: "var(--color-text-2)",
                              marginTop: 2,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {el.description}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
            )}
          </div>

          {/* Selected element detail + current assignments */}
          {selectedElement && (
            <div style={{ borderTop: "1px solid var(--color-edge)", padding: 12, background: "var(--color-surface)" }}>
              <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 6, color: "var(--color-gold)" }}>
                {selectedElement.name}
              </div>
              {selectedElement.description && (
                <div style={{ fontSize: "0.8rem", color: "var(--color-text-2)", marginBottom: 8 }}>
                  {selectedElement.description}
                </div>
              )}
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: 4 }}>
                {t("assignments.assignedAssets", { count: assignments.length })}
              </div>
              {isLoadingAssignments ? (
                <div className="skeleton" style={{ width: "100%", height: 40, borderRadius: 6 }} />
              ) : assignments.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 200, overflowY: "auto" }}>
                  {assignments.map((a) => (
                    <div
                      key={a.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "4px 8px",
                        borderRadius: 6,
                        background: "var(--color-bg)",
                        border: "1px solid var(--color-edge)",
                      }}
                    >
                      {a.design_assets && (
                        <Image
                          src={a.design_assets.public_path}
                          alt={a.design_assets.filename}
                          width={36}
                          height={36}
                          style={{ objectFit: "contain", flexShrink: 0 }}
                          unoptimized
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {a.design_assets?.filename ?? t("common.unknown")}
                        </div>
                        <div style={{ fontSize: "0.65rem", color: "var(--color-text-muted)" }}>
                          {t("common.role")} {a.role}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAssignment(a.id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--color-accent-red)",
                          cursor: "pointer",
                          fontSize: "1rem",
                          padding: "2px 6px",
                        }}
                        title={t("assignments.removeAssignment")}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontStyle: "italic" }}>
                  {t("assignments.noAssetsAssigned")}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ══════ RIGHT PANEL: Asset Browser ══════ */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* Filters + pagination */}
          <div
            style={{
              padding: "8px 12px",
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
              borderBottom: "1px solid var(--color-edge)",
            }}
          >
            <select
              value={assetCategory}
              onChange={(e) => {
                setAssetCategory(e.target.value);
                setAssetOffset(0);
              }}
              style={{ fontSize: "0.8rem", minWidth: 130 }}
            >
              <option value="all">
                {t("common.allCategories")} ({totalAssets})
              </option>
              {ASSET_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder={t("assignments.searchAssets")}
              value={assetSearch}
              onChange={(e) => {
                setAssetSearch(e.target.value);
                setAssetOffset(0);
              }}
              style={{ fontSize: "0.8rem", flex: 1, minWidth: 120 }}
            />
            <ThumbnailSizePicker
              sizes={ASSET_SIZES}
              value={assetThumbSize}
              onChange={setAssetThumbSize}
              label={t("common.size")}
            />
            {totalPages > 1 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: "0.8rem",
                  color: "var(--color-text-2)",
                  marginLeft: "auto",
                }}
              >
                <button
                  className="button"
                  style={{ padding: "3px 8px", fontSize: "0.75rem" }}
                  disabled={assetOffset === 0}
                  onClick={() => setAssetOffset(Math.max(0, assetOffset - PAGE_SIZE))}
                >
                  {t("common.prev")}
                </button>
                <span>{t("common.pageOf", { current: currentPage, total: totalPages })}</span>
                <button
                  className="button"
                  style={{ padding: "3px 8px", fontSize: "0.75rem" }}
                  disabled={currentPage >= totalPages}
                  onClick={() => setAssetOffset(assetOffset + PAGE_SIZE)}
                >
                  {t("common.next")}
                </button>
              </div>
            )}
          </div>

          {/* Asset grid */}
          <div style={{ flex: 1, overflowY: "auto", maxHeight: "calc(100vh - 400px)", padding: 12 }}>
            {isLoadingAssets ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(auto-fill, minmax(${assetThumbSize}px, 1fr))`,
                  gap: 6,
                }}
              >
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} className="skeleton" style={{ width: "100%", aspectRatio: "1", borderRadius: 6 }} />
                ))}
              </div>
            ) : (
              <>
                {!selectedElement && (
                  <div
                    style={{ padding: 20, textAlign: "center", color: "var(--color-text-muted)", fontSize: "0.9rem" }}
                  >
                    {t("assignments.selectPrompt")}
                  </div>
                )}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(auto-fill, minmax(${assetThumbSize}px, 1fr))`,
                    gap: 6,
                  }}
                >
                  {assets.map((asset) => {
                    const isAssigned = assignments.some((a) => a.asset_id === asset.id);
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        disabled={!selectedElement}
                        onClick={() => handleAssign(asset)}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 2,
                          padding: 6,
                          borderRadius: 6,
                          border: isAssigned ? "2px solid var(--color-accent-green)" : "1px solid var(--color-edge)",
                          background: isAssigned ? "rgba(74, 153, 96, 0.1)" : "var(--color-surface)",
                          cursor: selectedElement ? "pointer" : "not-allowed",
                          opacity: selectedElement ? 1 : 0.5,
                          transition: "border-color 0.15s",
                        }}
                        title={`${asset.filename}\n${asset.width ?? "?"}x${asset.height ?? "?"} | ${formatFileSize(asset.file_size_bytes)}${isAssigned ? "\n" + t("assignments.alreadyAssigned") : ""}`}
                      >
                        <div
                          style={{
                            width: "100%",
                            aspectRatio: "1",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Image
                            src={asset.public_path}
                            alt={asset.filename}
                            width={assetThumbSize}
                            height={assetThumbSize}
                            style={{
                              width: "auto",
                              height: "auto",
                              maxWidth: "100%",
                              maxHeight: "100%",
                              objectFit: "contain",
                            }}
                            unoptimized
                          />
                        </div>
                        <span
                          style={{
                            fontSize: "0.6rem",
                            color: "var(--color-text-2)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            width: "100%",
                            textAlign: "center",
                          }}
                        >
                          {asset.filename}
                        </span>
                        {isAssigned && (
                          <span style={{ fontSize: "0.55rem", color: "var(--color-accent-green)" }}>
                            {t("common.assigned")}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default AssignmentTab;
