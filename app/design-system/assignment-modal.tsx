"use client";

import { useState, useEffect, useCallback, type ReactElement } from "react";
import Image from "next/image";
import type { DesignAsset, UiElement, AssetAssignment } from "./design-system-types";
import { ASSET_CATEGORIES, ASSIGNMENT_ROLES, RENDER_TYPE_LABELS, formatFileSize } from "./design-system-types";
import ThumbnailSizePicker, { ASSET_SIZES } from "./thumbnail-size-picker";

/* ------------------------------------------------------------------ */
/*  Assignment Modal — Full-screen overlay                             */
/* ------------------------------------------------------------------ */

interface AssignmentModalProps {
  readonly element: UiElement;
  readonly onClose: () => void;
  readonly onAssignmentsChange?: () => void;
}

const PAGE_SIZE = 200;

function AssignmentModal({ element, onClose, onAssignmentsChange }: AssignmentModalProps): ReactElement {
  /* ── Assets ── */
  const [assets, setAssets] = useState<DesignAsset[]>([]);
  const [totalAssets, setTotalAssets] = useState(0);
  const [assetOffset, setAssetOffset] = useState(0);
  const [assetCategory, setAssetCategory] = useState("all");
  const [assetSearch, setAssetSearch] = useState("");
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [assetThumbSize, setAssetThumbSize] = useState(100);

  /* ── Assignments ── */
  const [assignments, setAssignments] = useState<AssetAssignment[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);
  const [assignRole, setAssignRole] = useState("default");

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

  /* ── Fetch assignments ── */

  const fetchAssignments = useCallback(async () => {
    setIsLoadingAssignments(true);
    try {
      const res = await fetch(`/api/design-system/assignments?ui_element_id=${element.id}`);
      const json = await res.json();
      setAssignments(json.data ?? []);
    } catch {
      setAssignments([]);
    } finally {
      setIsLoadingAssignments(false);
    }
  }, [element.id]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  /* ── Assign ── */

  async function handleAssign(asset: DesignAsset): Promise<void> {
    try {
      const res = await fetch("/api/design-system/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ui_element_id: element.id, asset_id: asset.id, role: assignRole }),
      });
      if (!res.ok) throw new Error("Failed");
      fetchAssignments();
      onAssignmentsChange?.();
    } catch {
      /* Silent */
    }
  }

  /* ── Remove assignment ── */

  async function handleRemove(assignmentId: string): Promise<void> {
    try {
      await fetch("/api/design-system/assignments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: assignmentId }),
      });
      fetchAssignments();
      onAssignmentsChange?.();
    } catch {
      /* Silent */
    }
  }

  /* ── Pagination ── */

  const totalPages = Math.ceil(totalAssets / PAGE_SIZE);
  const currentPage = Math.floor(assetOffset / PAGE_SIZE) + 1;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        flexDirection: "column",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 20px",
          background: "var(--color-surface-solid)",
          borderBottom: "1px solid var(--color-edge)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Inline preview in header if available */}
          {element.preview_html && (
            <div
              style={{
                padding: "4px 10px",
                borderRadius: 8,
                border: "1px solid var(--color-edge)",
                background: "var(--color-bg)",
                maxWidth: 200,
                overflow: "hidden",
                pointerEvents: "none",
              }}
              dangerouslySetInnerHTML={{ __html: element.preview_html }}
            />
          )}
          <div>
            <div
              style={{
                fontSize: "1.1rem",
                fontWeight: 600,
                color: "var(--color-gold)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              Assign Assets: {element.name}
              <span className="badge" style={{ fontSize: "0.6rem", padding: "0 6px" }}>
                {RENDER_TYPE_LABELS[element.render_type] ?? element.render_type}
              </span>
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--color-text-2)" }}>
              {element.category}
              {element.subcategory ? ` / ${element.subcategory}` : ""} — {element.description ?? ""}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <label style={{ fontSize: "0.8rem", color: "var(--color-text-2)" }}>Role:</label>
          <select value={assignRole} onChange={(e) => setAssignRole(e.target.value)} style={{ fontSize: "0.8rem" }}>
            {ASSIGNMENT_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button className="button" style={{ padding: "5px 16px", fontSize: "0.85rem" }} onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {/* Body: side-by-side */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "320px 1fr", overflow: "hidden" }}>
        {/* LEFT: Current assignments */}
        <div
          style={{
            borderRight: "1px solid var(--color-edge)",
            background: "var(--color-surface)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "10px 14px",
              borderBottom: "1px solid var(--color-edge)",
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "var(--color-text-2)",
            }}
          >
            Current Assignments ({assignments.length})
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 10 }}>
            {isLoadingAssignments ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="skeleton"
                  style={{ width: "100%", height: 56, marginBottom: 8, borderRadius: 8 }}
                />
              ))
            ) : assignments.length === 0 ? (
              <div style={{ padding: 16, textAlign: "center", color: "var(--color-text-muted)", fontSize: "0.8rem" }}>
                No assets assigned. Click an asset on the right to assign it.
              </div>
            ) : (
              assignments.map((a) => (
                <div
                  key={a.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: 8,
                    marginBottom: 6,
                    borderRadius: 8,
                    background: "var(--color-bg)",
                    border: "1px solid var(--color-edge)",
                  }}
                >
                  {a.design_assets && (
                    <Image
                      src={a.design_assets.public_path}
                      alt={a.design_assets.filename}
                      width={48}
                      height={48}
                      style={{ objectFit: "contain", flexShrink: 0 }}
                      unoptimized
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {a.design_assets?.filename ?? "Unknown"}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                      Role: {a.role} | {a.design_assets?.category ?? ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(a.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--color-accent-red)",
                      cursor: "pointer",
                      fontSize: "1.2rem",
                      padding: "4px 8px",
                    }}
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT: Asset browser with pagination */}
        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--color-bg)" }}>
          {/* Asset toolbar */}
          <div
            style={{
              padding: "8px 14px",
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
              borderBottom: "1px solid var(--color-edge)",
              flexShrink: 0,
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
              <option value="all">All Categories ({totalAssets})</option>
              {ASSET_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Search..."
              value={assetSearch}
              onChange={(e) => {
                setAssetSearch(e.target.value);
                setAssetOffset(0);
              }}
              style={{ fontSize: "0.8rem", flex: 1, minWidth: 140 }}
            />
            <ThumbnailSizePicker
              sizes={ASSET_SIZES}
              value={assetThumbSize}
              onChange={setAssetThumbSize}
              label="Size:"
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
                  Prev
                </button>
                <span>
                  {currentPage}/{totalPages}
                </span>
                <button
                  className="button"
                  style={{ padding: "3px 8px", fontSize: "0.75rem" }}
                  disabled={currentPage >= totalPages}
                  onClick={() => setAssetOffset(assetOffset + PAGE_SIZE)}
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* Asset grid */}
          <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
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
                      onClick={() => handleAssign(asset)}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 2,
                        padding: 6,
                        borderRadius: 6,
                        cursor: "pointer",
                        border: isAssigned ? "2px solid var(--color-accent-green)" : "1px solid var(--color-edge)",
                        background: isAssigned ? "rgba(74, 153, 96, 0.1)" : "var(--color-surface)",
                        transition: "border-color 0.15s",
                      }}
                      title={`${asset.filename}\n${asset.width ?? "?"}x${asset.height ?? "?"} | ${formatFileSize(asset.file_size_bytes)}`}
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
                          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
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
                        <span style={{ fontSize: "0.55rem", color: "var(--color-accent-green)" }}>assigned</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AssignmentModal;
