/**
 * UI Element Scanner Script
 *
 * Scans the codebase (globals.css + components) to discover UI patterns,
 * supplements with a comprehensive checklist of standard web UI elements,
 * and upserts rows into the ui_elements Supabase table.
 *
 * Usage: npx tsx scripts/scan-ui-elements.ts
 *
 * Flags:
 *   --dry-run    Log actions without writing to DB
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const PROJECT_ROOT = path.resolve(__dirname, "..");
const DRY_RUN = process.argv.includes("--dry-run");

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type RenderType = "css" | "asset" | "hybrid" | "icon" | "typography" | "composite";

interface UiElementRecord {
  name: string;
  description: string;
  category: string;
  subcategory: string | null;
  component_file: string | null;
  current_css: string | null;
  status: "active" | "planned" | "deprecated";
  notes: string | null;
  render_type: RenderType;
  preview_html: string | null;
}

/* ------------------------------------------------------------------ */
/*  CSS Scanner                                                        */
/* ------------------------------------------------------------------ */

interface CssPattern {
  pattern: RegExp;
  category: string;
  subcategory: string;
  name: string;
  description: string;
  render_type: RenderType;
  preview_html: string | null;
}

const CSS_PATTERNS: CssPattern[] = [
  {
    pattern: /^\.button\s*\{/,
    category: "button",
    subcategory: "primary",
    name: "Button (base)",
    description: "Base button style with gold border and dark gradient fill",
    render_type: "css",
    preview_html: '<button class="button">Button</button>',
  },
  {
    pattern: /^\.button\.primary/,
    category: "button",
    subcategory: "primary",
    name: "Button Primary",
    description: "Primary variant with deeper warm gradient",
    render_type: "css",
    preview_html: '<button class="button primary">Primary</button>',
  },
  {
    pattern: /^\.button\.danger/,
    category: "button",
    subcategory: "danger",
    name: "Button Danger",
    description: "Red-accented danger/destructive button",
    render_type: "css",
    preview_html: '<button class="button danger">Danger</button>',
  },
  {
    pattern: /^\.button\.leather/,
    category: "button",
    subcategory: "leather",
    name: "Button Leather",
    description: "VIP leather-textured button with game asset background",
    render_type: "hybrid",
    preview_html: '<button class="button leather" style="position:relative;min-width:120px">Leather</button>',
  },
  {
    pattern: /^\.icon-button/,
    category: "button",
    subcategory: "icon-only",
    name: "Icon Button",
    description: "Icon-only button without text label",
    render_type: "css",
    preview_html: '<button class="icon-button" style="width:32px;height:32px">&#x2715;</button>',
  },
  {
    pattern: /^\.editable-button/,
    category: "button",
    subcategory: "editable",
    name: "Editable Button",
    description: "Inline edit trigger button for CMS content",
    render_type: "css",
    preview_html: '<button class="editable-button">Edit me</button>',
  },
  {
    pattern: /^\.badge\s*\{/,
    category: "badge",
    subcategory: "default",
    name: "Badge",
    description: "Status badge with gradient background",
    render_type: "css",
    preview_html: '<span class="badge">Default</span>',
  },
  {
    pattern: /^\.badge\.success/,
    category: "badge",
    subcategory: "success",
    name: "Badge Success",
    description: "Green success status badge",
    render_type: "css",
    preview_html: '<span class="badge success">Active</span>',
  },
  {
    pattern: /^\.badge\.warning/,
    category: "badge",
    subcategory: "warning",
    name: "Badge Warning",
    description: "Amber warning status badge",
    render_type: "css",
    preview_html: '<span class="badge warning">Warning</span>',
  },
  {
    pattern: /^\.badge\.danger/,
    category: "badge",
    subcategory: "danger",
    name: "Badge Danger",
    description: "Red danger status badge",
    render_type: "css",
    preview_html: '<span class="badge danger">Danger</span>',
  },
  {
    pattern: /^\.badge\.info/,
    category: "badge",
    subcategory: "info",
    name: "Badge Info",
    description: "Blue informational status badge",
    render_type: "css",
    preview_html: '<span class="badge info">Info</span>',
  },
  {
    pattern: /^\.tabs\s*\{/,
    category: "navigation",
    subcategory: "tabs",
    name: "Tab Bar",
    description: "Segmented control tab bar with gold active glow",
    render_type: "css",
    preview_html:
      '<div class="tabs" style="display:inline-flex"><button class="tab active">Active</button><button class="tab">Other</button></div>',
  },
  {
    pattern: /^\.tab\s*\{/,
    category: "navigation",
    subcategory: "tab",
    name: "Tab Item",
    description: "Individual tab button",
    render_type: "css",
    preview_html: '<button class="tab active">Tab</button>',
  },
  {
    pattern: /^\.card\s*\{/,
    category: "card",
    subcategory: "default",
    name: "Card",
    description: "Dark gradient card with gold-tinted border",
    render_type: "css",
    preview_html:
      '<div class="card" style="max-width:220px"><div class="card-header"><div class="card-title">Card Title</div></div><div style="padding:12px;font-size:0.8rem;color:var(--color-text-2)">Card content</div></div>',
  },
  {
    pattern: /^\.table\s*\{/,
    category: "table",
    subcategory: "default",
    name: "Data Table",
    description: "Dark gradient header with gold divider, alternating rows",
    render_type: "css",
    preview_html: null,
  },
  {
    pattern: /^\.sidebar\s*\{/,
    category: "navigation",
    subcategory: "sidebar",
    name: "Sidebar",
    description: "Collapsible sidebar with medieval theme",
    render_type: "hybrid",
    preview_html: null,
  },
  {
    pattern: /^\.nav\s*\{/,
    category: "navigation",
    subcategory: "nav-list",
    name: "Nav List",
    description: "Sidebar navigation link list",
    render_type: "css",
    preview_html: null,
  },
  {
    pattern: /^\.nav a\s*\{/,
    category: "navigation",
    subcategory: "nav-link",
    name: "Nav Link",
    description: "Sidebar navigation link with icon and label",
    render_type: "css",
    preview_html: null,
  },
  {
    pattern: /^\.top-bar\s*\{/,
    category: "layout",
    subcategory: "header",
    name: "Top Bar",
    description: "Page header bar with gold divider pseudo-element",
    render_type: "hybrid",
    preview_html: null,
  },
  {
    pattern: /^\.modal/,
    category: "modal",
    subcategory: "default",
    name: "Modal Overlay",
    description: "Modal dialog with dark backdrop",
    render_type: "css",
    preview_html:
      '<div style="position:relative;width:220px;padding:16px;border-radius:12px;border:1px solid var(--color-edge);background:var(--color-surface)"><div style="font-weight:600;margin-bottom:8px">Modal Title</div><div style="font-size:0.8rem;color:var(--color-text-2)">Content here</div></div>',
  },
  {
    pattern: /^\.toast/,
    category: "feedback",
    subcategory: "toast",
    name: "Toast Notification",
    description: "Temporary status message popup",
    render_type: "css",
    preview_html: '<div class="toast" style="position:relative;opacity:1">Action completed</div>',
  },
  {
    pattern: /^\.skeleton/,
    category: "loading",
    subcategory: "skeleton",
    name: "Skeleton Loader",
    description: "Animated placeholder during content loading",
    render_type: "css",
    preview_html: '<div class="skeleton" style="width:180px;height:20px;border-radius:6px"></div>',
  },
  {
    pattern: /^\.pagination/,
    category: "navigation",
    subcategory: "pagination",
    name: "Pagination",
    description: "Page navigation controls",
    render_type: "css",
    preview_html: null,
  },
  {
    pattern: /^\.select-trigger/,
    category: "select",
    subcategory: "radix",
    name: "Select Trigger",
    description: "RadixSelect dropdown trigger button",
    render_type: "css",
    preview_html: '<select style="min-width:160px"><option>Select option</option></select>',
  },
  {
    pattern: /^\.select-content/,
    category: "select",
    subcategory: "radix",
    name: "Select Dropdown",
    description: "RadixSelect dropdown panel",
    render_type: "css",
    preview_html: null,
  },
  {
    pattern: /^\.scrollbar/,
    category: "layout",
    subcategory: "scrollbar",
    name: "Custom Scrollbar",
    description: "Styled scrollbar with gold thumb",
    render_type: "css",
    preview_html: null,
  },
];

function scanCss(cssPath: string): UiElementRecord[] {
  const results: UiElementRecord[] = [];
  if (!fs.existsSync(cssPath)) return results;

  const content = fs.readFileSync(cssPath, "utf-8");
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    for (const { pattern, category, subcategory, name, description, render_type, preview_html } of CSS_PATTERNS) {
      if (pattern.test(trimmed)) {
        const cssClass = trimmed.replace(/\s*\{.*/, "");
        results.push({
          name,
          description,
          category,
          subcategory,
          component_file: "app/globals.css",
          current_css: cssClass,
          status: "active",
          notes: null,
          render_type,
          preview_html,
        });
      }
    }
  }

  return results;
}

/* ------------------------------------------------------------------ */
/*  Component Scanner                                                  */
/* ------------------------------------------------------------------ */

function scanComponentDir(dirPath: string, relBase: string): UiElementRecord[] {
  const results: UiElementRecord[] = [];
  if (!fs.existsSync(dirPath)) return results;

  const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".tsx"));

  for (const file of files) {
    const relPath = `${relBase}/${file}`;
    const name = file
      .replace(/\.tsx$/, "")
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    const content = fs.readFileSync(path.join(dirPath, file), "utf-8");

    let category = "layout";
    let subcategory: string | null = null;
    const lower = file.toLowerCase();

    if (lower.includes("button")) {
      category = "button";
    } else if (lower.includes("select") || lower.includes("combobox")) {
      category = "select";
      subcategory = lower.includes("combobox") ? "combobox" : "dropdown";
    } else if (lower.includes("input") || lower.includes("search")) {
      category = "input";
      subcategory = lower.includes("search") ? "search" : "text";
    } else if (lower.includes("modal") || lower.includes("dialog")) {
      category = "modal";
    } else if (lower.includes("toast")) {
      category = "feedback";
      subcategory = "toast";
    } else if (lower.includes("sidebar")) {
      category = "navigation";
      subcategory = "sidebar";
    } else if (lower.includes("nav")) {
      category = "navigation";
    } else if (lower.includes("table")) {
      category = "table";
    } else if (lower.includes("date") || lower.includes("picker")) {
      category = "input";
      subcategory = "date-picker";
    } else if (lower.includes("skeleton") || lower.includes("loading")) {
      category = "loading";
    } else if (lower.includes("markdown")) {
      category = "media";
      subcategory = "markdown";
    } else if (lower.includes("notification") || lower.includes("bell")) {
      category = "feedback";
      subcategory = "notification";
    } else if (lower.includes("editable")) {
      category = "input";
      subcategory = "editable";
    }

    let description = `Component: ${name}`;
    const jsdocMatch = content.match(/\/\*\*\s*\n\s*\*\s*(.+)/);
    const captured = jsdocMatch?.[1];
    if (captured) {
      description = captured.trim();
    }

    results.push({
      name,
      description,
      category,
      subcategory,
      component_file: relPath,
      current_css: null,
      status: "active",
      notes: null,
      render_type: "css",
      preview_html: null,
    });
  }

  return results;
}

/* ------------------------------------------------------------------ */
/*  Comprehensive UI Element Checklist                                 */
/* ------------------------------------------------------------------ */

const UI_CHECKLIST: UiElementRecord[] = [
  // ── Buttons ──
  {
    name: "Button Ghost",
    description: "Transparent button with border only, used for secondary actions",
    category: "button",
    subcategory: "ghost",
    component_file: null,
    current_css: null,
    status: "planned",
    notes: null,
    render_type: "css",
    preview_html:
      '<button class="button" style="background:transparent;border:1px solid var(--color-edge)">Ghost</button>',
  },
  {
    name: "Button Pill",
    description: "Rounded pill-shaped button (e.g. Weiterlesen on announcements)",
    category: "button",
    subcategory: "pill",
    component_file: "app/news/news-client.tsx",
    current_css: null,
    status: "active",
    notes: null,
    render_type: "css",
    preview_html:
      '<button class="button" style="border-radius:20px;padding:4px 16px;font-size:0.8rem">Weiterlesen</button>',
  },
  {
    name: "Button Close",
    description: "Close/dismiss button for modals and panels",
    category: "button",
    subcategory: "close",
    component_file: null,
    current_css: null,
    status: "active",
    notes: null,
    render_type: "css",
    preview_html: '<button class="icon-button" style="width:28px;height:28px;font-size:1.2rem">&#x2715;</button>',
  },
  {
    name: "Button Circular",
    description: "Circular icon button (e.g. calendar navigation chevrons)",
    category: "button",
    subcategory: "circular",
    component_file: "app/events/event-calendar.tsx",
    current_css: null,
    status: "active",
    notes: null,
    render_type: "css",
    preview_html: '<button class="icon-button" style="width:32px;height:32px;border-radius:50%">&#x276E;</button>',
  },

  // ── Inputs ──
  {
    name: "Text Input",
    description: "Standard text input field with gold-tinted border and focus ring",
    category: "input",
    subcategory: "text",
    component_file: null,
    current_css: "input, .editable-field",
    status: "active",
    notes: null,
    render_type: "css",
    preview_html: '<input type="text" placeholder="Enter text..." style="width:200px" />',
  },
  {
    name: "Textarea",
    description: "Multi-line text input for descriptions and content",
    category: "input",
    subcategory: "textarea",
    component_file: null,
    current_css: "textarea",
    status: "active",
    notes: null,
    render_type: "css",
    preview_html: '<textarea placeholder="Enter content..." style="width:200px;height:60px;resize:none"></textarea>',
  },
  {
    name: "Password Input",
    description: "Password field with autofill dark theme override",
    category: "input",
    subcategory: "password",
    component_file: null,
    current_css: "input[type=password]",
    status: "active",
    notes: null,
    render_type: "css",
    preview_html: '<input type="password" value="password" style="width:200px" />',
  },
  {
    name: "Search Input",
    description: "Search field with icon and clear button",
    category: "input",
    subcategory: "search",
    component_file: "app/components/ui/search-input.tsx",
    current_css: null,
    status: "active",
    notes: null,
    render_type: "css",
    preview_html: '<input type="text" placeholder="Search..." style="width:200px" />',
  },
  {
    name: "Date Picker",
    description: "Flatpickr-based date/datetime picker with Sanctum theme",
    category: "input",
    subcategory: "date-picker",
    component_file: "app/components/date-picker.tsx",
    current_css: null,
    status: "active",
    notes: null,
    render_type: "composite",
    preview_html: '<input type="text" placeholder="2026-02-11" style="width:200px" />',
  },
  {
    name: "Combobox Input",
    description: "Text input with filterable suggestion dropdown",
    category: "input",
    subcategory: "combobox",
    component_file: "app/components/ui/combobox-input.tsx",
    current_css: null,
    status: "active",
    notes: null,
    render_type: "composite",
    preview_html: '<input type="text" placeholder="Type to filter..." style="width:200px" />',
  },
  {
    name: "Checkbox",
    description: "Styled checkbox with gold accent",
    category: "input",
    subcategory: "checkbox",
    component_file: null,
    current_css: "input[type=checkbox]",
    status: "active",
    notes: null,
    render_type: "css",
    preview_html:
      '<label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" checked /> Checked option</label>',
  },
  {
    name: "Toggle Switch",
    description: "On/off toggle with gold gradient checked state",
    category: "input",
    subcategory: "toggle",
    component_file: null,
    current_css: ".toggle-switch",
    status: "active",
    notes: null,
    render_type: "css",
    preview_html:
      '<label class="toggle-switch"><input type="checkbox" checked /><span class="toggle-slider"></span></label>',
  },

  // ── Selects ──
  {
    name: "Native Select",
    description: "Native HTML select with dark-themed options",
    category: "select",
    subcategory: "native",
    component_file: null,
    current_css: "select, option",
    status: "active",
    notes: null,
    render_type: "css",
    preview_html:
      '<select style="min-width:160px"><option>Option 1</option><option>Option 2</option><option>Option 3</option></select>',
  },
  {
    name: "Radix Select",
    description: "Custom RadixSelect with search support and Sanctum styling",
    category: "select",
    subcategory: "radix",
    component_file: "app/components/ui/radix-select.tsx",
    current_css: ".select-trigger",
    status: "active",
    notes: null,
    render_type: "composite",
    preview_html: '<select style="min-width:160px"><option>Radix Select</option></select>',
  },
  {
    name: "Labeled Select",
    description: "Select with inline label",
    category: "select",
    subcategory: "labeled",
    component_file: "app/components/ui/labeled-select.tsx",
    current_css: null,
    status: "active",
    notes: null,
    render_type: "composite",
    preview_html:
      '<div style="display:flex;align-items:center;gap:8px"><label style="font-size:0.8rem;color:var(--color-text-muted)">Label:</label><select style="min-width:120px"><option>Value</option></select></div>',
  },

  // ── Navigation ──
  {
    name: "Sidebar Shell",
    description: "Collapsible sidebar with logo, nav, user status, and clan selector",
    category: "navigation",
    subcategory: "sidebar",
    component_file: "app/components/sidebar-shell.tsx",
    current_css: ".sidebar",
    status: "active",
    notes: null,
    render_type: "composite",
    preview_html: null,
  },
  {
    name: "Sidebar Nav",
    description: "Navigation links with icons in sidebar",
    category: "navigation",
    subcategory: "nav-links",
    component_file: "app/components/sidebar-nav.tsx",
    current_css: ".nav a",
    status: "active",
    notes: null,
    render_type: "hybrid",
    preview_html: null,
  },
  {
    name: "Sidebar Toggle",
    description: "Collapse/expand toggle at top of sidebar",
    category: "navigation",
    subcategory: "toggle",
    component_file: "app/components/sidebar-shell.tsx",
    current_css: ".sidebar-toggle",
    status: "active",
    notes: null,
    render_type: "css",
    preview_html: '<button class="button" style="padding:4px 8px;font-size:0.75rem">&#x276E; Toggle</button>',
  },
  {
    name: "Tab Bar (Admin)",
    description: "Segmented tab control for admin panel sections",
    category: "navigation",
    subcategory: "tabs",
    component_file: "app/admin/admin-client.tsx",
    current_css: ".tabs, .tab",
    status: "active",
    notes: null,
    render_type: "css",
    preview_html:
      '<div class="tabs" style="display:inline-flex"><button class="tab active">Users</button><button class="tab">Settings</button><button class="tab">Logs</button></div>',
  },
  {
    name: "Pagination Bar",
    description: "Page size, jump, prev/next pagination controls",
    category: "navigation",
    subcategory: "pagination",
    component_file: "app/admin/components/pagination-bar.tsx",
    current_css: ".pagination",
    status: "active",
    notes: null,
    render_type: "css",
    preview_html:
      '<div style="display:flex;align-items:center;gap:8px;font-size:0.8rem"><button class="button" style="padding:3px 8px;font-size:0.75rem">Prev</button><span style="color:var(--color-text-2)">Page 1 / 5</span><button class="button" style="padding:3px 8px;font-size:0.75rem">Next</button></div>',
  },
  {
    name: "Breadcrumb",
    description: "Top bar breadcrumb showing current page",
    category: "navigation",
    subcategory: "breadcrumb",
    component_file: null,
    current_css: ".top-bar-breadcrumb",
    status: "active",
    notes: null,
    render_type: "css",
    preview_html:
      '<div style="font-size:0.75rem;color:var(--color-text-muted)">Admin <span style="margin:0 4px">/</span> <span style="color:var(--color-gold)">Users</span></div>',
  },

  // ── Tables ──
  {
    name: "Data Table",
    description: "Full data table with sortable headers, selection, alternating rows",
    category: "table",
    subcategory: "data",
    component_file: "app/data-table/data-table-client.tsx",
    current_css: ".table",
    status: "active",
    notes: null,
    render_type: "css",
    preview_html: null,
  },
  {
    name: "Sortable Column Header",
    description: "Table header with sort direction indicator",
    category: "table",
    subcategory: "sort-header",
    component_file: "app/admin/components/sortable-column-header.tsx",
    current_css: null,
    status: "active",
    notes: null,
    render_type: "css",
    preview_html:
      '<div style="display:inline-flex;align-items:center;gap:4px;font-weight:600;font-size:0.8rem;color:var(--color-gold)">Name <span style="font-size:0.6rem">&#x25B2;</span></div>',
  },
  {
    name: "Table Row Selection",
    description: "Checkbox-based row selection in tables",
    category: "table",
    subcategory: "selection",
    component_file: null,
    current_css: null,
    status: "active",
    notes: null,
    render_type: "css",
    preview_html:
      '<label style="display:flex;align-items:center;gap:8px"><input type="checkbox" /> <span style="font-size:0.8rem">Row item</span></label>',
  },
  {
    name: "Expandable Row",
    description: "Table row that expands to show details (member directory)",
    category: "table",
    subcategory: "expandable",
    component_file: "app/members/members-client.tsx",
    current_css: null,
    status: "active",
    notes: null,
    render_type: "composite",
    preview_html: null,
  },
  {
    name: "Table Scroll",
    description: "Synced top/bottom horizontal scrollbar for wide tables",
    category: "table",
    subcategory: "scroll",
    component_file: "app/components/table-scroll.tsx",
    current_css: null,
    status: "active",
    notes: null,
    render_type: "composite",
    preview_html: null,
  },

  // ── Cards ──
  {
    name: "Content Card",
    description: "Generic card with dark gradient and gold border",
    category: "card",
    subcategory: "content",
    component_file: null,
    current_css: ".card",
    status: "active",
    notes: null,
    render_type: "css",
    preview_html:
      '<div class="card" style="max-width:220px"><div class="card-header"><div class="card-title">Card</div></div><div style="padding:12px;font-size:0.8rem;color:var(--color-text-2)">Content area</div></div>',
  },
  {
    name: "Announcement Card",
    description: "News card with banner header, title overlay, expandable content",
    category: "card",
    subcategory: "announcement",
    component_file: "app/news/news-client.tsx",
    current_css: null,
    status: "active",
    notes: null,
    render_type: "hybrid",
    preview_html: null,
  },
  {
    name: "Event Card",
    description: "Event card with date badge, metadata icons, recurrence pills",
    category: "card",
    subcategory: "event",
    component_file: "app/events/upcoming-events-sidebar.tsx",
    current_css: null,
    status: "active",
    notes: null,
    render_type: "composite",
    preview_html: null,
  },
  {
    name: "Forum Post Card",
    description: "Forum post card with thumbnail, votes, comment count",
    category: "card",
    subcategory: "forum-post",
    component_file: "app/forum/forum-post-list.tsx",
    current_css: null,
    status: "active",
    notes: null,
    render_type: "composite",
    preview_html: null,
  },
  {
    name: "Member Card",
    description: "Member row card with rank badge, score, expand for details",
    category: "card",
    subcategory: "member",
    component_file: "app/members/members-client.tsx",
    current_css: null,
    status: "active",
    notes: null,
    render_type: "composite",
    preview_html: null,
  },
  {
    name: "Message Card",
    description: "Conversation list item with sender, preview, timestamp",
    category: "card",
    subcategory: "message",
    component_file: "app/messages/messages-client.tsx",
    current_css: null,
    status: "active",
    notes: null,
    render_type: "composite",
    preview_html: null,
  },
  {
    name: "Stat Card",
    description: "Dashboard stat card with value, label, and trend indicator",
    category: "card",
    subcategory: "stat",
    component_file: "app/home/home-client.tsx",
    current_css: null,
    status: "active",
    notes: null,
    render_type: "hybrid",
    preview_html: null,
  },

  // ── Modals ──
  {
    name: "Confirm Modal",
    description: "Simple confirmation dialog with cancel/confirm buttons",
    category: "modal",
    subcategory: "confirm",
    component_file: null,
    current_css: ".modal",
    status: "active",
    notes: null,
    render_type: "css",
    preview_html:
      '<div style="width:220px;padding:16px;border-radius:12px;border:1px solid var(--color-edge);background:var(--color-surface)"><div style="font-weight:600;margin-bottom:8px">Confirm?</div><div style="font-size:0.8rem;color:var(--color-text-2);margin-bottom:12px">Are you sure?</div><div style="display:flex;gap:8px;justify-content:flex-end"><button class="button" style="padding:3px 10px;font-size:0.75rem">Cancel</button><button class="button primary" style="padding:3px 10px;font-size:0.75rem">Confirm</button></div></div>',
  },
  {
    name: "Danger Confirm Modal",
    description: "Two-step destructive action confirmation modal",
    category: "modal",
    subcategory: "danger-confirm",
    component_file: "app/admin/components/danger-confirm-modal.tsx",
    current_css: null,
    status: "active",
    notes: null,
    render_type: "css",
    preview_html:
      '<div style="width:220px;padding:16px;border-radius:12px;border:1px solid rgba(220,50,50,0.3);background:var(--color-surface)"><div style="font-weight:600;margin-bottom:8px;color:var(--color-accent-red)">Delete?</div><div style="font-size:0.8rem;color:var(--color-text-2);margin-bottom:12px">This cannot be undone.</div><div style="display:flex;gap:8px;justify-content:flex-end"><button class="button" style="padding:3px 10px;font-size:0.75rem">Cancel</button><button class="button danger" style="padding:3px 10px;font-size:0.75rem">Delete</button></div></div>',
  },
  {
    name: "Form Modal",
    description: "Modal containing a form (e.g. assign to clan)",
    category: "modal",
    subcategory: "form",
    component_file: null,
    current_css: null,
    status: "active",
    notes: null,
    render_type: "css",
    preview_html:
      '<div style="width:220px;padding:16px;border-radius:12px;border:1px solid var(--color-edge);background:var(--color-surface)"><div style="font-weight:600;margin-bottom:8px">Form</div><input type="text" placeholder="Field..." style="width:100%;margin-bottom:8px" /><button class="button primary" style="padding:3px 10px;font-size:0.75rem;width:100%">Submit</button></div>',
  },
  {
    name: "Import Modal",
    description: "CSV/TXT import preview modal with validation",
    category: "modal",
    subcategory: "import",
    component_file: "app/admin/components/rule-import-modal.tsx",
    current_css: null,
    status: "active",
    notes: null,
    render_type: "composite",
    preview_html: null,
  },

  // ── Badges ──
  {
    name: "Status Badge",
    description: "Colored status indicator (success, warning, danger, info)",
    category: "badge",
    subcategory: "status",
    component_file: null,
    current_css: ".badge",
    status: "active",
    notes: null,
    render_type: "css",
    preview_html:
      '<div style="display:flex;gap:6px;flex-wrap:wrap"><span class="badge success">Active</span><span class="badge warning">Pending</span><span class="badge danger">Error</span><span class="badge info">Info</span></div>',
  },
  {
    name: "Rank Badge",
    description: "Color-coded rank display (Leader, Officer, Soldier, etc.)",
    category: "badge",
    subcategory: "rank",
    component_file: "app/members/members-client.tsx",
    current_css: null,
    status: "active",
    notes: null,
    render_type: "css",
    preview_html:
      '<span class="badge" style="background:linear-gradient(135deg,rgba(201,163,74,0.3),rgba(201,163,74,0.1));border:1px solid rgba(201,163,74,0.3)">Leader</span>',
  },
  {
    name: "Count Badge",
    description: "Numeric count indicator (notification bell, nav items)",
    category: "badge",
    subcategory: "count",
    component_file: null,
    current_css: ".nav-badge",
    status: "active",
    notes: null,
    render_type: "css",
    preview_html:
      '<span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:var(--color-accent-red);color:white;font-size:0.65rem;font-weight:700">3</span>',
  },
  {
    name: "Role Badge",
    description: "Website role display (admin, moderator, editor)",
    category: "badge",
    subcategory: "role",
    component_file: null,
    current_css: null,
    status: "active",
    notes: null,
    render_type: "css",
    preview_html: '<span class="badge info" style="font-size:0.7rem">Admin</span>',
  },

  // ── Loading States ──
  {
    name: "Loading Skeleton",
    description: "Animated placeholder skeleton during content loading",
    category: "loading",
    subcategory: "skeleton",
    component_file: "app/components/cms-shared.tsx",
    current_css: ".skeleton",
    status: "active",
    notes: null,
    render_type: "css",
    preview_html:
      '<div style="display:flex;flex-direction:column;gap:6px"><div class="skeleton" style="width:180px;height:14px;border-radius:6px"></div><div class="skeleton" style="width:140px;height:14px;border-radius:6px"></div><div class="skeleton" style="width:100px;height:14px;border-radius:6px"></div></div>',
  },
  {
    name: "Loading Spinner",
    description: "Spinning indicator for async operations",
    category: "loading",
    subcategory: "spinner",
    component_file: null,
    current_css: null,
    status: "active",
    notes: null,
    render_type: "css",
    preview_html:
      '<div style="width:24px;height:24px;border:3px solid var(--color-edge);border-top-color:var(--color-gold);border-radius:50%;animation:spin 0.8s linear infinite"></div>',
  },

  // ── Layout ──
  {
    name: "Content Panel",
    description: "Main content area with constrained width",
    category: "layout",
    subcategory: "panel",
    component_file: null,
    current_css: ".content-inner, .content-constrained",
    status: "active",
    notes: null,
    render_type: "css",
    preview_html: null,
  },
  {
    name: "Section Divider",
    description: "Gold gradient divider line between sections",
    category: "layout",
    subcategory: "divider",
    component_file: null,
    current_css: ".top-bar::after",
    status: "active",
    notes: null,
    render_type: "css",
    preview_html:
      '<div style="width:200px;height:2px;background:linear-gradient(90deg,transparent,var(--color-gold),transparent)"></div>',
  },
  {
    name: "Grid Layout",
    description: "CSS grid with responsive columns",
    category: "layout",
    subcategory: "grid",
    component_file: null,
    current_css: ".grid, .admin-grid, .grid-12",
    status: "active",
    notes: null,
    render_type: "css",
    preview_html: null,
  },
  {
    name: "Custom Scrollbar",
    description: "Styled thin scrollbar with gold accent",
    category: "layout",
    subcategory: "scrollbar",
    component_file: null,
    current_css: "::-webkit-scrollbar",
    status: "active",
    notes: null,
    render_type: "css",
    preview_html: null,
  },

  // ── Media ──
  {
    name: "Banner Header",
    description: "Full-width banner image at top of cards (news, events)",
    category: "media",
    subcategory: "banner",
    component_file: null,
    current_css: null,
    status: "active",
    notes: null,
    render_type: "asset",
    preview_html: null,
  },
  {
    name: "Avatar",
    description: "User avatar circle with online status dot",
    category: "media",
    subcategory: "avatar",
    component_file: null,
    current_css: ".sidebar-avatar",
    status: "active",
    notes: null,
    render_type: "css",
    preview_html:
      '<div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,rgba(201,163,74,0.3),rgba(100,80,40,0.3));border:2px solid var(--color-gold);display:flex;align-items:center;justify-content:center;font-size:0.8rem;color:var(--color-gold)">U</div>',
  },
  {
    name: "Logo",
    description: "Clan logo in sidebar header",
    category: "media",
    subcategory: "logo",
    component_file: null,
    current_css: ".sidebar-logo",
    status: "active",
    notes: null,
    render_type: "asset",
    preview_html: null,
  },
  {
    name: "Thumbnail",
    description: "Forum post thumbnail (140x100px media preview)",
    category: "media",
    subcategory: "thumbnail",
    component_file: "app/forum/forum-thumbnail.ts",
    current_css: null,
    status: "active",
    notes: null,
    render_type: "asset",
    preview_html: null,
  },

  // ── Typography ──
  {
    name: "Heading H1",
    description: "Primary page heading in Cinzel serif font",
    category: "typography",
    subcategory: "h1",
    component_file: null,
    current_css: "h1",
    status: "active",
    notes: null,
    render_type: "typography",
    preview_html: '<h1 style="margin:0;font-size:1.4rem">Page Heading</h1>',
  },
  {
    name: "Heading H2",
    description: "Section heading",
    category: "typography",
    subcategory: "h2",
    component_file: null,
    current_css: "h2",
    status: "active",
    notes: null,
    render_type: "typography",
    preview_html: '<h2 style="margin:0;font-size:1.15rem">Section Heading</h2>',
  },
  {
    name: "Heading H3",
    description: "Subsection heading",
    category: "typography",
    subcategory: "h3",
    component_file: null,
    current_css: "h3",
    status: "active",
    notes: null,
    render_type: "typography",
    preview_html: '<h3 style="margin:0;font-size:1rem">Subsection</h3>',
  },
  {
    name: "Body Text",
    description: "Standard body text in Inter font",
    category: "typography",
    subcategory: "body",
    component_file: null,
    current_css: "body",
    status: "active",
    notes: null,
    render_type: "typography",
    preview_html:
      '<p style="margin:0;font-size:0.9rem;line-height:1.5;color:var(--color-text)">The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.</p>',
  },
  {
    name: "Label Text",
    description: "Form labels and small descriptive text",
    category: "typography",
    subcategory: "label",
    component_file: null,
    current_css: "label",
    status: "active",
    notes: null,
    render_type: "typography",
    preview_html: '<label style="font-size:0.85rem;font-weight:500">Field Label</label>',
  },
  {
    name: "Link",
    description: "Gold-colored hyperlinks with hover underline",
    category: "typography",
    subcategory: "link",
    component_file: null,
    current_css: "a",
    status: "active",
    notes: null,
    render_type: "typography",
    preview_html:
      '<a href="#" style="color:var(--color-gold);text-decoration:none;font-size:0.9rem" onclick="return false">Click here to learn more</a>',
  },
  {
    name: "Muted Text",
    description: "Secondary text in muted gold tone",
    category: "typography",
    subcategory: "muted",
    component_file: null,
    current_css: null,
    status: "active",
    notes: "Uses --color-text-muted",
    render_type: "typography",
    preview_html: '<span style="font-size:0.85rem;color:var(--color-text-muted)">Secondary information</span>',
  },

  // ── Decorative ──
  {
    name: "Gold Divider",
    description: "Decorative gold gradient line used as section separator",
    category: "decoration",
    subcategory: "divider",
    component_file: null,
    current_css: null,
    status: "active",
    notes: null,
    render_type: "css",
    preview_html:
      '<div style="width:200px;height:2px;background:linear-gradient(90deg,transparent,var(--color-gold),transparent)"></div>',
  },
  {
    name: "Border Frame",
    description: "Gold-tinted border around panels and cards",
    category: "decoration",
    subcategory: "border",
    component_file: null,
    current_css: null,
    status: "active",
    notes: "Uses --color-edge",
    render_type: "css",
    preview_html:
      '<div style="width:160px;height:80px;border:1px solid var(--color-edge);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:0.75rem;color:var(--color-text-muted)">Gold border frame</div>',
  },
  {
    name: "Background Texture",
    description: "Dark gradient surface backgrounds with subtle texture",
    category: "decoration",
    subcategory: "background",
    component_file: null,
    current_css: null,
    status: "active",
    notes: null,
    render_type: "asset",
    preview_html: null,
  },
  {
    name: "Glow Effect",
    description: "Gold glow on hover and active states",
    category: "decoration",
    subcategory: "glow",
    component_file: null,
    current_css: null,
    status: "active",
    notes: "Uses --shadow-glow",
    render_type: "css",
    preview_html:
      '<div style="width:100px;height:40px;border-radius:8px;background:var(--color-surface);border:1px solid var(--color-gold);box-shadow:0 0 12px rgba(201,163,74,0.4);display:flex;align-items:center;justify-content:center;font-size:0.75rem;color:var(--color-gold)">Glow</div>',
  },
  {
    name: "Nav Active Arrow",
    description: "Decorative arrow/highlight behind active nav item",
    category: "decoration",
    subcategory: "nav-arrow",
    component_file: "app/components/sidebar-nav.tsx",
    current_css: ".nav-active-arrow",
    status: "active",
    notes: "Uses backs_31.png VIP asset",
    render_type: "asset",
    preview_html: null,
  },

  // ── Feedback ──
  {
    name: "Toast Provider",
    description: "Global toast notification system for status messages",
    category: "feedback",
    subcategory: "toast",
    component_file: "app/components/toast-provider.tsx",
    current_css: ".toast",
    status: "active",
    notes: null,
    render_type: "css",
    preview_html:
      '<div style="padding:10px 16px;border-radius:8px;background:var(--color-surface);border:1px solid var(--color-edge);font-size:0.85rem;color:var(--color-text)">Action completed successfully</div>',
  },
  {
    name: "Error Banner",
    description: "Inline error display with retry action",
    category: "feedback",
    subcategory: "error",
    component_file: "app/components/cms-shared.tsx",
    current_css: null,
    status: "active",
    notes: null,
    render_type: "css",
    preview_html:
      '<div style="padding:10px 16px;border-radius:8px;background:rgba(220,50,50,0.1);border:1px solid rgba(220,50,50,0.3);font-size:0.85rem;color:var(--color-accent-red)">Something went wrong. <a href="#" style="color:var(--color-gold);text-decoration:underline" onclick="return false">Retry</a></div>',
  },
  {
    name: "Notification Bell",
    description: "Header notification bell with unread count and dropdown",
    category: "feedback",
    subcategory: "notification",
    component_file: "app/components/notification-bell.tsx",
    current_css: null,
    status: "active",
    notes: null,
    render_type: "composite",
    preview_html: null,
  },

  // ── Markdown / Media ──
  {
    name: "Markdown Renderer",
    description: "Rich markdown content renderer with media embeds",
    category: "media",
    subcategory: "markdown-renderer",
    component_file: "lib/markdown/app-markdown.tsx",
    current_css: ".cms-md, .forum-md",
    status: "active",
    notes: null,
    render_type: "composite",
    preview_html: null,
  },
  {
    name: "Markdown Toolbar",
    description: "Formatting toolbar for markdown editors",
    category: "input",
    subcategory: "markdown-toolbar",
    component_file: "lib/markdown/app-markdown-toolbar.tsx",
    current_css: null,
    status: "active",
    notes: null,
    render_type: "composite",
    preview_html: null,
  },
];

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

async function main(): Promise<void> {
  console.log("=== UI Element Scanner ===");
  if (DRY_RUN) console.log("** DRY RUN — no DB writes **");
  console.log("");

  // 1. Scan globals.css
  const cssPath = path.join(PROJECT_ROOT, "app/globals.css");
  const cssElements = scanCss(cssPath);
  console.log(`CSS scan found: ${cssElements.length} elements`);

  // 2. Scan component directories
  const uiComponents = scanComponentDir(path.join(PROJECT_ROOT, "app/components/ui"), "app/components/ui");
  const sharedComponents = scanComponentDir(path.join(PROJECT_ROOT, "app/components"), "app/components");
  console.log(`Component scan found: ${uiComponents.length + sharedComponents.length} components`);

  // 3. Merge with checklist (checklist takes priority on name+category conflicts)
  const allElements: UiElementRecord[] = [];
  const seen = new Set<string>();

  for (const el of UI_CHECKLIST) {
    const key = `${el.category}:${el.name}`;
    if (!seen.has(key)) {
      seen.add(key);
      allElements.push(el);
    }
  }

  for (const el of cssElements) {
    const key = `${el.category}:${el.name}`;
    if (!seen.has(key)) {
      seen.add(key);
      allElements.push(el);
    }
  }

  for (const el of [...uiComponents, ...sharedComponents]) {
    const key = `${el.category}:${el.name}`;
    if (!seen.has(key)) {
      seen.add(key);
      allElements.push(el);
    }
  }

  console.log(`\nTotal unique UI elements: ${allElements.length}`);

  // Print category summary
  const categoryStats: Record<string, number> = {};
  for (const el of allElements) {
    categoryStats[el.category] = (categoryStats[el.category] ?? 0) + 1;
  }
  console.log("\nCategory breakdown:");
  const sorted = Object.entries(categoryStats).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
  for (const [cat, count] of sorted) {
    console.log(`  ${cat}: ${count}`);
  }

  // Print render_type summary
  const renderStats: Record<string, number> = {};
  for (const el of allElements) {
    renderStats[el.render_type] = (renderStats[el.render_type] ?? 0) + 1;
  }
  console.log("\nRender type breakdown:");
  for (const [rt, count] of Object.entries(renderStats).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))) {
    console.log(`  ${rt}: ${count}`);
  }

  // 4. Upsert to Supabase
  if (!DRY_RUN) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
      process.exit(1);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    console.log("\nUpserting to Supabase...");

    const BATCH_SIZE = 100;
    let upserted = 0;

    for (let i = 0; i < allElements.length; i += BATCH_SIZE) {
      const batch = allElements.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from("ui_elements").upsert(batch, { onConflict: "name,category" });

      if (error) {
        console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, error.message);
      } else {
        upserted += batch.length;
        console.log(`  Upserted ${upserted}/${allElements.length}`);
      }
    }

    console.log(`\nDone. ${upserted} records upserted.`);
  } else {
    console.log("\nDB upsert skipped (dry run).");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
