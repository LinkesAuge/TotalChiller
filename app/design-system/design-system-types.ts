/** Shared types for the Design System Asset Manager. */

export interface DesignAsset {
  readonly id: string;
  readonly filename: string;
  readonly original_path: string;
  readonly public_path: string;
  readonly category: string | null;
  readonly tags: string[];
  readonly width: number | null;
  readonly height: number | null;
  readonly file_size_bytes: number | null;
  readonly notes: string | null;
  readonly created_at: string;
}

export type RenderType = "css" | "asset" | "hybrid" | "icon" | "typography" | "composite";

export interface UiElement {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly category: string;
  readonly subcategory: string | null;
  readonly component_file: string | null;
  readonly current_css: string | null;
  readonly status: "active" | "planned" | "deprecated";
  readonly render_type: RenderType;
  readonly preview_html: string | null;
  readonly preview_image: string | null;
  readonly notes: string | null;
  readonly created_at: string;
}

export interface AssetAssignment {
  readonly id: string;
  readonly ui_element_id: string;
  readonly asset_id: string;
  readonly role: string;
  readonly notes: string | null;
  readonly created_at: string;
  readonly design_assets?: DesignAsset;
  readonly ui_elements?: UiElement;
}

export type DesignSystemTab = "assets" | "inventory" | "assignments";

export const ASSET_CATEGORIES = [
  "arrow",
  "background",
  "badge",
  "banner",
  "button",
  "character",
  "chest",
  "clan",
  "cursor",
  "decoration",
  "drapery",
  "effect",
  "flag",
  "fort-unit",
  "frame",
  "icon",
  "map",
  "progress",
  "ribbon",
  "scroll",
  "shield",
  "tab-panel",
  "tech",
  "weapon",
  "widget",
  "uncategorized",
] as const;

export const UI_ELEMENT_CATEGORIES = [
  "button",
  "input",
  "select",
  "navigation",
  "table",
  "card",
  "modal",
  "badge",
  "loading",
  "layout",
  "media",
  "typography",
  "decoration",
  "feedback",
] as const;

export const RENDER_TYPES = ["css", "asset", "hybrid", "icon", "typography", "composite"] as const;

/** Render types that can have game assets assigned. */
export const ASSIGNABLE_RENDER_TYPES: readonly RenderType[] = ["asset", "hybrid", "composite"];

export const ASSIGNMENT_ROLES = [
  "default",
  "hover",
  "pressed",
  "disabled",
  "active",
  "background",
  "icon",
  "border",
  "overlay",
] as const;

/** Human-readable labels for render types. */
export const RENDER_TYPE_LABELS: Record<RenderType, string> = {
  css: "CSS Only",
  asset: "Asset-Based",
  hybrid: "Hybrid",
  icon: "Icon",
  typography: "Typography",
  composite: "Composite",
} as const;

/** Color hints for render type badges. */
export const RENDER_TYPE_COLORS: Record<RenderType, string> = {
  css: "info",
  asset: "success",
  hybrid: "warning",
  icon: "",
  typography: "",
  composite: "danger",
} as const;

/** Format bytes into human-readable string. */
export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
