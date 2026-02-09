# CMS System Refactoring — Design Document

**Date**: 2026-02-07
**Branch**: `refactor/cms-overhaul`
**Status**: Complete (all phases implemented, 40 Playwright tests passing)
**Skills used**: brainstorming, playwright, webapp-testing, frontend-design, ui-ux-pro-max, supabase-postgres-best-practices

## Problem Summary

The current CMS has 6 core problems:

1. **`normalizeContent()` destroys Markdown** — Every single newline is converted to `"  \n"` (trailing spaces = forced `<br>`), which prevents `react-markdown` from correctly parsing paragraphs and breaks inline formatting like `**bold**` at line boundaries.

2. **`markdown` prop is ignored** — The prop is accepted (line 41/68 of `editable-text.tsx`) but never checked in the rendering code. All multi-line text always goes through `ForumMarkdown`, regardless of whether `markdown={true}` is set.

3. **Inconsistent page implementations** — Each page (home, about, contact, privacy) has different patterns for fallbacks, list management, and CMS integration. The homepage has inline `EditableList` logic with `deriveItems()`, while other pages have complex inline-constructed Markdown fallback strings.

4. **Missing error handling** — `saveField()` optimistically updates local state even if the API call fails. API errors are silently swallowed in `loadContent()`.

5. **Permission mismatch** — Client uses `getIsContentManager()` (allows moderators/editors), but server PATCH handler only checks `is_admin`. Moderators see edit UI but get 403 errors.

6. **Forum-specific Markdown component** — `ForumMarkdown` has YouTube embed detection, video links, thumbnail extraction — features designed for the forum, not CMS page content. CSS conflicts between `.forum-md` and CMS contexts require override rules.

## Architecture (New)

### Database Layer

**Existing table** — `site_content` (text fields, bilingual DE/EN):

| Column | Type | Purpose |
|--------|------|---------|
| page | text | Page identifier (e.g. "home", "about") |
| section_key | text | Section within page (e.g. "aboutUs", "mission") |
| field_key | text | Specific field (e.g. "title", "text") |
| content_de | text | German content |
| content_en | text | English content |

**New table** — `site_list_items` (structured list items with icons, badges, links):

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | Primary key |
| page | text | Page identifier |
| section_key | text | Section (e.g. "whyJoin", "publicNews") |
| sort_order | integer | Display order |
| text_de | text | German text (Markdown supported) |
| text_en | text | English text (Markdown supported) |
| badge_de | text | German badge text (optional) |
| badge_en | text | English badge text (optional) |
| link_url | text | Link URL (optional) |
| icon | text | Preset identifier or custom SVG storage URL |
| icon_type | text | "preset" or "custom" |

Composite index on `(page, section_key, sort_order)`.
RLS: Public read, admin-only write via `is_any_admin()`.

**New storage bucket** — `cms-icons`:
- SVG files only, max 50KB
- Public read, admin-only upload
- Naming: `{page}_{section}_{uuid}.svg`

### API Layer

- `GET /api/site-content?page=X` — Public (service role), returns all text content
- `PATCH /api/site-content` — Admin-only, upsert/delete text content
- `GET /api/site-list-items?page=X` — Public (service role), returns all list items sorted
- `PATCH /api/site-list-items` — Admin-only, create/update/delete/reorder list items

Both `/api/site-content` and `/api/site-list-items` MUST be in `isPublicPath()` in `proxy.ts`.

### Component Layer

**New components:**

- `CmsMarkdown` — Configurable Markdown renderer with optional embed support (YouTube, images, videos). Uses shared renderers extracted from `ForumMarkdown`. CSS class `.cms-md` inherits parent styles.
- `CmsMarkdownToolbar` — CMS-specific editing toolbar (bold, italic, heading, link, image, lists, quote, code). Configurable storage bucket for image uploads.
- `EditableList` — Standalone list component with drag-and-drop sorting, preset/custom SVG icons, Markdown text, inline-editable badges, and optional links.
- `TopBar` — Shared header component (currently duplicated in every page).
- `LoadingSkeleton` — Consistent loading UI (skeleton screens instead of "Laden...").
- `ErrorBanner` — Error display with retry button.
- `CmsSection` — Card wrapper with header + body + optional footer.
- `markdown-renderers.tsx` — Shared embed utilities used by both `CmsMarkdown` and `ForumMarkdown`.

**Refactored components:**

- `EditableText` — `markdown` prop is now explicitly checked. Four rendering paths: children, singleLine, markdown (CmsMarkdown), plain multi-line. `normalizeContent()` removed. Error handling added.
- `useSiteContent(page)` — Extended with list management (`lists`, `addListItem`, `updateListItem`, `removeListItem`, `reorderListItems`), error state, parallel loading, `is_admin` check (replacing `getIsContentManager`).

### Page Layer

All CMS pages follow the same pattern:

```typescript
const { content, lists, canEdit, locale, isLoaded, error, c, cEn, saveField, ... } = useSiteContent("page");

if (!isLoaded) return <LoadingSkeleton />;
if (error) return <ErrorBanner message={error} />;

// Text fields:
<EditableText value={c("section", "field", fallback)} markdown canEdit={canEdit} ... />

// Lists:
<EditableList page="page" section="section" items={lists["section"]} canEdit={canEdit} ... />
```

Pages affected: Home, About, Contact, Privacy, Auth pages.

### Testing Layer

Playwright tests (5 scenarios):

1. Markdown rendering (bold → `<strong>`, lists → `<ul>/<li>`, links → `<a>`)
2. Admin edit flow (login → pencil → edit → save → verify)
3. List CRUD (add → set badge → choose icon → reorder → delete)
4. Public visibility (no login → all content visible, no edit buttons)
5. Responsive (375px, 768px, 1440px viewports)

## UX Requirements (ui-ux-pro-max)

- Touch targets: Minimum 44x44px for all interactive elements
- Contrast: 4.5:1 minimum for text (WCAG AA)
- Focus states: Visible focus rings on all interactive elements
- `aria-label` on all icon-only buttons
- `prefers-reduced-motion` respected for animations
- Transitions: 150-300ms for micro-interactions
- Loading buttons: Disabled during async operations
- Error feedback: Inline near the problem, not just toasts
- `cursor-pointer` on all clickable elements

## Design Decisions Log

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Markdown component | New CmsMarkdown (configurable) | ForumMarkdown has forum-specific features (thumbnails, preview truncation) that interfere with CMS |
| Embeds in CMS | YouTube/Image/Video supported | User confirmed CMS should support embeds for Clan-News etc. |
| Permission model | Admin-only (is_admin) | Simpler, more secure; eliminates client/server mismatch |
| List storage | Separate `site_list_items` table | Most flexible; proper sort_order, icons, badges, links per item |
| List item text | Markdown supported | User confirmed list items should support formatting |
| List item icons | Preset + Custom SVG upload | User confirmed custom SVGs should be supported from Phase 1 |
| Drag-and-drop | Native HTML Drag API | No extra package dependency |
| Custom SVG timing | Phase 1 (immediate) | User chose "direkt in Phase 1 einbauen" |
| normalizeContent | Remove completely | Root cause of Markdown rendering issues |

## Implementation Phases

See `.cursor/plans/cms_system_refactoring_e1caf120.plan.md` for the full 10-phase implementation plan with todos.

## Migration Strategy

1. New `site_list_items` table created alongside existing `site_content`
2. SQL migration script moves list-type entries from `site_content` to `site_list_items`
3. Old list entries in `site_content` can be deleted after migration
4. One-time normalization of existing `site_content` text (Windows line endings, bullet chars)
5. All pages updated to use new components in a single branch (`refactor/cms-overhaul`)
