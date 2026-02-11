"use client";

import { useState, useEffect, useCallback, useRef, type ReactElement } from "react";
import Image from "next/image";
import type { DesignAsset } from "./design-system-types";
import { ASSET_CATEGORIES, formatFileSize } from "./design-system-types";
import ThumbnailSizePicker, { ASSET_SIZES } from "./thumbnail-size-picker";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 200;

/* ------------------------------------------------------------------ */
/*  Asset Library Tab                                                  */
/* ------------------------------------------------------------------ */

function AssetLibraryTab(): ReactElement {
  const [assets, setAssets] = useState<DesignAsset[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Filters */
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [darkBg, setDarkBg] = useState(true);
  const [thumbSize, setThumbSize] = useState(100);

  /* Preview modal */
  const [selectedAsset, setSelectedAsset] = useState<DesignAsset | null>(null);
  const [editTags, setEditTags] = useState("");

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Fetch assets ── */

  const fetchAssets = useCallback(async (cat: string, q: string, off: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (cat !== "all") params.set("category", cat);
      if (q) params.set("search", q);
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(off));

      const res = await fetch(`/api/design-system/assets?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setAssets(json.data ?? []);
      setTotalCount(json.count ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load assets");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets(category, search, offset);
  }, [category, search, offset, fetchAssets]);

  /* ── Debounced search ── */

  function handleSearchChange(value: string): void {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(value);
      setOffset(0);
    }, 300);
  }

  /* ── Tag editing ── */

  async function handleSaveTags(): Promise<void> {
    if (!selectedAsset) return;
    const tags = editTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    try {
      const res = await fetch("/api/design-system/assets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedAsset.id, tags }),
      });
      if (!res.ok) throw new Error("Failed to update tags");
      const updated = (await res.json()) as DesignAsset;
      const updatedId = updated?.id;
      setAssets((prev) => prev.map((a) => (updatedId != null && a.id === updatedId ? updated : a)));
      setSelectedAsset(updated);
    } catch {
      /* Silent */
    }
  }

  /* ── Category reassignment ── */

  async function handleChangeCategory(assetId: string, newCategory: string): Promise<void> {
    try {
      const res = await fetch("/api/design-system/assets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: assetId, category: newCategory }),
      });
      if (!res.ok) throw new Error("Failed to update category");
      const updated = (await res.json()) as DesignAsset;
      const updatedId = updated?.id;
      setAssets((prev) => prev.map((a) => (updatedId != null && a.id === updatedId ? updated : a)));
      if (selectedAsset?.id === assetId) setSelectedAsset(updated);
    } catch {
      /* Silent */
    }
  }

  /* ── Pagination ── */

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  /* ── Render ── */

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Asset Library</div>
          <div className="card-subtitle">
            {totalCount} assets{category !== "all" ? ` in "${category}"` : ""}
            {search ? ` matching "${search}"` : ""}
          </div>
        </div>
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
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setOffset(0);
          }}
          style={{ minWidth: 160 }}
        >
          <option value="all">All Categories ({totalCount})</option>
          {ASSET_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search by filename..."
          onChange={(e) => handleSearchChange(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />

        <ThumbnailSizePicker sizes={ASSET_SIZES} value={thumbSize} onChange={setThumbSize} label="Size:" />

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: "0.85rem",
            color: "var(--color-text-2)",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          <input type="checkbox" checked={!darkBg} onChange={(e) => setDarkBg(!e.target.checked)} />
          Light bg
        </label>

        {totalPages > 1 && (
          <div
            style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem", color: "var(--color-text-2)" }}
          >
            <button
              className="button"
              style={{ padding: "4px 10px", fontSize: "0.8rem" }}
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              Prev
            </button>
            <span>
              Page {currentPage}/{totalPages}
            </span>
            <button
              className="button"
              style={{ padding: "4px 10px", fontSize: "0.8rem" }}
              disabled={currentPage >= totalPages}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: 16, color: "var(--color-accent-red)" }}>
          Error: {error}
          <button className="button" style={{ marginLeft: 12 }} onClick={() => fetchAssets(category, search, offset)}>
            Retry
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(auto-fill, minmax(${thumbSize}px, 1fr))`,
            gap: 8,
            padding: 16,
          }}
        >
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ width: "100%", aspectRatio: "1", borderRadius: 8 }} />
          ))}
        </div>
      )}

      {/* Asset grid */}
      {!isLoading && assets.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(auto-fill, minmax(${thumbSize}px, 1fr))`,
            gap: 8,
            padding: 16,
            maxHeight: "calc(100vh - 340px)",
            overflowY: "auto",
          }}
        >
          {assets.map((asset) => (
            <button
              key={asset.id}
              type="button"
              onClick={() => {
                setSelectedAsset(asset);
                setEditTags((asset.tags ?? []).join(", "));
              }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                padding: 8,
                borderRadius: 8,
                border: selectedAsset?.id === asset.id ? "2px solid var(--color-gold)" : "1px solid var(--color-edge)",
                background: darkBg ? "var(--color-surface)" : "rgba(200, 200, 200, 0.9)",
                cursor: "pointer",
                transition: "border-color 0.15s, transform 0.15s",
                textAlign: "center",
              }}
              title={`${asset.filename}\n${asset.width ?? "?"}x${asset.height ?? "?"} | ${formatFileSize(asset.file_size_bytes)}`}
            >
              <div
                style={{
                  width: "100%",
                  aspectRatio: "1",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Image
                  src={asset.public_path}
                  alt={asset.filename}
                  width={thumbSize}
                  height={thumbSize}
                  style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                  unoptimized
                />
              </div>
              <span
                style={{
                  fontSize: "0.65rem",
                  color: darkBg ? "var(--color-text-2)" : "#333",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  width: "100%",
                }}
              >
                {asset.filename}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && assets.length === 0 && !error && (
        <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-muted)" }}>
          No assets found. Run the scanner script first:
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
            npx tsx scripts/scan-design-assets.ts
          </code>
        </div>
      )}

      {/* Detail panel */}
      {selectedAsset && (
        <div
          style={{
            borderTop: "1px solid var(--color-edge)",
            padding: 16,
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: 24,
          }}
        >
          <div
            style={{
              width: 240,
              minHeight: 160,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: darkBg ? "var(--color-bg)" : "rgba(220, 220, 220, 1)",
              borderRadius: 8,
              border: "1px solid var(--color-edge)",
              padding: 12,
            }}
          >
            <Image
              src={selectedAsset.public_path}
              alt={selectedAsset.filename}
              width={selectedAsset.width ?? 200}
              height={selectedAsset.height ?? 200}
              style={{ maxWidth: "100%", maxHeight: 200, objectFit: "contain" }}
              unoptimized
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{selectedAsset.filename}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "4px 12px", fontSize: "0.85rem" }}>
              <span style={{ color: "var(--color-text-muted)" }}>Dimensions:</span>
              <span>
                {selectedAsset.width ?? "?"}x{selectedAsset.height ?? "?"}
              </span>
              <span style={{ color: "var(--color-text-muted)" }}>File size:</span>
              <span>{formatFileSize(selectedAsset.file_size_bytes)}</span>
              <span style={{ color: "var(--color-text-muted)" }}>Original path:</span>
              <span style={{ fontSize: "0.75rem", wordBreak: "break-all" }}>{selectedAsset.original_path}</span>
              <span style={{ color: "var(--color-text-muted)" }}>Public path:</span>
              <span style={{ fontSize: "0.75rem" }}>{selectedAsset.public_path}</span>
              <span style={{ color: "var(--color-text-muted)" }}>Category:</span>
              <select
                value={selectedAsset.category ?? "uncategorized"}
                onChange={(e) => handleChangeCategory(selectedAsset.id, e.target.value)}
                style={{ fontSize: "0.85rem", padding: "2px 6px" }}
              >
                {ASSET_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginTop: 8 }}>
              <label
                style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", display: "block", marginBottom: 4 }}
              >
                Tags (comma-separated):
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="e.g. ui, button, gold"
                  style={{ flex: 1, fontSize: "0.85rem" }}
                />
                <button
                  className="button"
                  style={{ padding: "4px 12px", fontSize: "0.85rem" }}
                  onClick={handleSaveTags}
                >
                  Save Tags
                </button>
              </div>
              {(selectedAsset.tags?.length ?? 0) > 0 && (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                  {(selectedAsset.tags ?? []).map((tag) => (
                    <span key={tag} className="badge info" style={{ fontSize: "0.7rem", padding: "1px 8px" }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              className="button"
              style={{ padding: "4px 12px", fontSize: "0.85rem", alignSelf: "flex-start", marginTop: 8 }}
              onClick={() => setSelectedAsset(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default AssetLibraryTab;
