# Total Battle UI Redesign — Design Plan

**Date**: 2026-02-11
**Branch**: `design-test`
**Status**: Phases 1–7 COMPLETE (Night Abyss Multi-Page Expansion)

---

## 1. Goal

Transform the current "Fortress Sanctum" design (modern dark-mode dashboard with gold accents) into an immersive **in-game Total Battle UI** that feels like a natural extension of the game itself. Keep the same page layout and navigation structure, but overhaul every visual surface, border, and interaction to match the ornate medieval fantasy style seen in the game screenshots.

---

## 2. Current State vs. Target

| Aspect           | Current ("Fortress Sanctum")           | Target ("Total Battle UI")                                                                                                           |
| ---------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Background**   | Flat dark gradient (`#080d14`)         | Textured parchment + dark wood panels                                                                                                |
| **Cards/Panels** | CSS gradient with rgba borders         | Real texture images: `backs_18.png` (parchment), `backs_1.png` (leather), ornate gold borders via `border-image`                     |
| **Tabs**         | Segmented control, CSS glow            | Game tab assets: `components_tab_up/down_2.png` (copper active / parchment inactive)                                                 |
| **Buttons**      | CSS gradient with gold border          | Real button textures: `button_green.png` (CTA), `button_yellow.png` (secondary), `button_blue.png` (info), with `_over` hover states |
| **Sidebar**      | `back_left.png` texture, CSS nav items | Sidebar tabs using `backs_31.png` (arrow-shaped items), `backs_23.png` (active indicator)                                            |
| **Headers**      | `header_3.png` background, CSS text    | `components_ribbon_13.png` (blue satin ribbon), `backs_25.png` (gold gradient bar), `drapery_tir_hero_1.png` (gold silk banner)      |
| **Tables**       | CSS alternating rows                   | Parchment-textured rows, `shadow_scroll.png` edges, tier-colored arrows                                                              |
| **Frames**       | None                                   | `frame_256x253_*` for cards, `frame_94x92_*` for icons, `frame_battler_*` for avatars                                                |
| **Typography**   | Cinzel headings, Inter body            | Keep Fontin Sans / Cinzel for headings; parchment-compatible body font                                                               |
| **Cursors**      | Default browser cursor                 | Custom medieval cursors from `cursor/` folder                                                                                        |

---

## 3. Design System — "Fortress Sanctum v2"

### 3.1 Color Palette

Keep the existing gold palette but shift surface colors toward warmer browns and parchment tones:

```
Primary Gold:     #c9a34a (unchanged — gold accents)
Gold Light:       #e4c778 (text, highlights)
Gold Glow:        rgba(228, 199, 120, 0.15)

Parchment:        #f0e6d2 (light panel fills)
Parchment Dark:   #d4c4a8 (inactive tabs, secondary areas)
Parchment Shadow: #3a3020 (text on parchment)

Wood Dark:        #2a1f14 (dark panel backgrounds)
Wood Medium:      #4a3828 (secondary panels)
Leather:          #352a1e (button/card fills)

Accent Green:     #3d7a3e (CTA buttons — from button_green.png)
Accent Red:       #8b3030 (danger — from drapery_tir_capt)
Accent Blue:      #2a5a7a (info — from components_ribbon_13.png)
Accent Violet:    #6a3a8a (premium — from button_violet.png)

Text on Dark:     #f2e6c9 (gold/cream text — unchanged)
Text on Light:    #3a3020 (dark text on parchment)
```

### 3.2 Typography

| Role                | Font                    | Weight | Style                                              |
| ------------------- | ----------------------- | ------ | -------------------------------------------------- |
| **Page titles**     | Fontin Sans SC / Cinzel | 700    | Uppercase, letter-spacing: 0.1em, gold text-shadow |
| **Section headers** | Cinzel                  | 600    | Title case, on ribbon/drapery backgrounds          |
| **Tab labels**      | Cinzel                  | 500    | Uppercase, small, on tab textures                  |
| **Body text**       | Inter                   | 400    | Dark on parchment, light on dark panels            |
| **Data/mono**       | PerfectDOS VGA 437      | 400    | Numbers, scores, data tables (pixel-art game feel) |

### 3.3 Asset-Driven Component Mapping

Each UI component maps to specific game assets:

#### Panels & Cards

- **Background**: `backs_18.png` (parchment with inset border) via `border-image-slice`
- **Dark variant**: `backs_1.png` (leather with gold stitching)
- **Border**: Gold ornate border from frame assets
- **Header area**: `backs_25.png` (gold gradient bar) as header separator

#### Tabs (Horizontal)

- **Active state**: `components_tab_up_2.png` (copper/orange with ornate border)
- **Inactive state**: `components_tab_down_2.png` (light parchment)
- **Implementation**: `border-image` with 9-slice from JSON `m_Border` data

#### Tabs (Sidebar)

- **Active item**: `components_tab_up_5.png` (light parchment) + `backs_23.png` (teal indicator)
- **Inactive item**: `components_tab_down_5.png` (dark brown)

#### Buttons

- **Primary CTA**: `button_green.png` + `button_green_over.png` (hover)
- **Secondary**: `button_yellow.png` + `button_yellow_over.png`
- **Info/View**: `button_blue.png` + `button_blue_over.png`
- **Danger**: `button_violet.png` or red-tinted variant
- **Disabled**: `button_gray.png`
- **Implementation**: `background-image` with `background-size: 100% 100%` (stretching) or `border-image` for elastic widths

#### Section Headers

- **Primary header**: `drapery_tir_hero_1.png` (gold silk banner) behind title text
- **Secondary header**: `components_ribbon_13.png` (teal satin ribbon)
- **Divider**: `backs_25.png` (gold gradient bar with chevron ends)

#### Frames (Card Borders)

- **Featured cards**: `frame_icon_256x253_gold.png` as overlay
- **Active/selected**: `frame_icon_256x253_blue.png`
- **Locked/disabled**: `frame_icon_256x253_gray.png`
- **Icon frames**: `frame_icon_thing_94x92_gold.png` around thumbnails
- **Avatar frames**: `frame_battler_gold.png` for member portraits

#### Tables & Lists

- **Row background**: Alternating `backs_15.png` / `backs_18.png` textures
- **Table edges**: `shadow_scroll.png` for parchment edge glow
- **Sort arrows**: `table_arrow_1.png` etc.
- **Row dividers**: Dotted gold lines (CSS) matching game screenshot pattern

#### Tooltips

- **Dark tooltip**: `backs_tooltip_default.png` (charcoal with gold border)
- **Blue tooltip**: `backs_tooltip_blue.png`

---

## 4. Page-by-Page Redesign Strategy

### 4.1 Sidebar

- **Background**: Keep `back_left.png` texture (already game-authentic)
- **Nav items**: Replace CSS-only items with `backs_31.png` (arrow-shaped dark tab with gold border)
- **Active indicator**: Add `backs_23.png` (teal pill) as left-side glow
- **Section dividers**: Gold ornamental line
- **Bottom user card**: Frame with `frame_battler_gold.png` around avatar

### 4.2 Top Bar / Header

- **Background**: Keep `header_3.png` (already game-authentic)
- **Page title**: Overlaid on `drapery_tir_hero_1.png` (gold silk banner)
- **Breadcrumb**: Gold text on subtle dark bar

### 4.3 Dashboard

- **Announcement cards**: `backs_18.png` parchment panel, banner image in `frame_256x253_gold.png` border
- **Stat cards**: `backs_1.png` leather background, gold numbers
- **Quick links**: `button_blue.png` style buttons in a grid

### 4.4 News / CMS Pages

- **Article cards**: Parchment panels with `frame_256x253` colored borders based on category
- **Category tabs**: `components_tab_up/down_2.png` horizontal tabs
- **Read More button**: `button_green.png` styled CTA

### 4.5 Data Tables (Chest Database, Admin)

- **Table container**: `backs_18.png` parchment with `shadow_scroll.png` edges
- **Header row**: `backs_25.png` gold gradient bar
- **Data rows**: Alternating warm/cool parchment tones
- **Action buttons**: Small `button_green.png` / `button_blue.png`
- **Tier indicators**: `icons_tir_*` badges

### 4.6 Member Directory

- **Member cards**: `back_icon_units_228x255_*` colored backgrounds behind portraits
- **Avatar frame**: `frame_battler_*` colored by rank
- **Rank badge**: `icons_rating_*` numbered badges
- **Role filter tabs**: `components_tab_up/down_4.png`

### 4.7 Events Calendar

- **Event cards**: Banner images from `banners/` folder as card headers
- **Event type badges**: Tier-colored `icons_tir_*`
- **Create button**: `button_green.png` CTA

### 4.8 Auth Pages (Login, Register, Forgot Password)

- **Background**: `medieval_background.png` or `preloader_background_default.png` (castle scene)
- **Form panel**: `backs_technologies_1.png` (ornate dark teal Baroque panel) centered
- **Submit button**: `button_green.png`
- **Input fields**: Dark background with gold border (existing style, refined)

### 4.9 Profile / Settings

- **Avatar frame**: Large `frame_battler_gold.png`
- **Info panel**: `backs_18.png` parchment
- **Edit buttons**: `button_yellow.png`
- **Save button**: `button_green.png`

### 4.10 Forum

- **Post cards**: Parchment panels with category-colored left border
- **Vote column**: `icons_tir_shield_*` style indicators
- **Markdown toolbar**: Dark bar with gold icon buttons
- **Thread detail**: `backs_18.png` parchment panel, `backs_25.png` title bar

---

## 5. Technical Implementation Plan

### 5.1 Asset Pipeline

1. **Copy selected assets** from `Design/Resources/` to `public/assets/game/` organized by the structure in the asset library
2. **Optimize images**: Convert large PNGs to WebP, compress, generate srcsets
3. **Extract 9-slice data** from JSON `m_Border` values for CSS `border-image-slice`
4. **Create CSS custom properties** for each texture reference

### 5.2 CSS Architecture

```css
/* New texture-based component system */
:root {
  /* Texture references */
  --tex-panel-parchment: url("/assets/game/backs/backs_18.png");
  --tex-panel-leather: url("/assets/game/backs/backs_1.png");
  --tex-tab-active: url("/assets/game/tabs/components_tab_up_2.png");
  --tex-tab-inactive: url("/assets/game/tabs/components_tab_down_2.png");
  --tex-btn-green: url("/assets/game/buttons/button_green.png");
  --tex-btn-green-hover: url("/assets/game/buttons/button_green_over.png");
  --tex-header-ribbon: url("/assets/game/ribbons/components_ribbon_13.png");
  --tex-header-gold: url("/assets/game/backs/backs_25.png");
  --tex-drapery-gold: url("/assets/game/drapery/drapery_tir_hero_1.png");
  --tex-frame-gold: url("/assets/game/frames/large/frame_icon_256x253_gold.png");
  --tex-scroll-shadow: url("/assets/game/table/shadow_scroll.png");
  --tex-sidebar-item: url("/assets/game/backs/backs_31.png");
  --tex-sidebar-active: url("/assets/game/backs/backs_23.png");
  --tex-cursor-default: url("/assets/game/cursors/cursor_arrow_n_32.png");
  --tex-cursor-grab: url("/assets/game/cursors/cursor_arm_n_32_.png");
}
```

### 5.3 Implementation Order

| Phase       | Scope                                                                               | Effort    |
| ----------- | ----------------------------------------------------------------------------------- | --------- |
| **Phase 1** | Asset pipeline — copy, organize, optimize assets into `public/assets/game/`         | 1-2 hours |
| **Phase 2** | Global foundation — backgrounds, custom cursors, typography, color variables        | 2-3 hours |
| **Phase 3** | Core components — buttons, tabs, panels/cards, section headers                      | 4-6 hours |
| **Phase 4** | Layout pieces — sidebar, top bar, table styles                                      | 3-4 hours |
| **Phase 5** | Page-specific — dashboard, news, data tables, auth pages                            | 4-6 hours |
| **Phase 6** | Polish — animations, hover transitions, responsive adjustments, accessibility audit | 3-4 hours |

---

## 6. Accessibility Considerations

- **Contrast**: Ensure parchment backgrounds maintain 4.5:1 contrast with dark text
- **Focus states**: Gold glow focus rings (existing system, keep)
- **Keyboard nav**: Preserve tab order, visible focus indicators on textured elements
- **Reduced motion**: Respect `prefers-reduced-motion` for hover transitions
- **Image text**: Never bake text into textures — always use real text overlaid on texture images
- **Alt text**: Decorative textures get `role="presentation"`, meaningful icons get alt text

---

## 7. Design Decisions (Resolved)

| Decision              | Choice                           | Rationale                                                                                                 |
| --------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Custom cursors**    | Yes — full immersion, everywhere | Medieval cursors from `cursor/` folder replace default browser cursors site-wide                          |
| **Button approach**   | Pure `background-image`          | Pixel-perfect match to game assets. Buttons use actual PNG textures with up/over/down states              |
| **Parchment density** | Content areas only               | Parchment textures for content panels and cards; dark panels for navigation/sidebar (matches game layout) |
| **Frame overlays**    | Real PNG overlays                | Actual `frame_256x253_*` PNG overlays on cards — true to the game look                                    |
| **Data font**         | Yes — PerfectDOS VGA 437         | Pixel font for all numbers, scores, and data tables — adds game authenticity                              |

---

## 8. Asset Library Reference

See `Design/asset-library.md` for the complete catalog of **2,671 verified assets** with:

- Screenshot-to-asset mapping matrix
- 9-slice border implementation notes
- Recommended production file organization
- UI use-case tables for every asset category

---

## 9. Implementation Log

### Phase 1: Asset Pipeline (Completed 2026-02-11)

**Production asset directory**: `public/assets/game/` — **363 selected PNGs** across 15 categories:

| Category          | Files | Purpose                                                       |
| ----------------- | ----- | ------------------------------------------------------------- |
| `backs/`          | 30    | Panel backgrounds, tooltips, leather, parchment               |
| `banners/`        | 51    | Event and promotional banners                                 |
| `buttons/`        | 52    | Green/orange/red/blue/purple buttons with up/over/down states |
| `cursors/`        | 3     | Medieval arrow cursors                                        |
| `decorations/`    | 20    | Ornamental elements, shields, decor lights                    |
| `delimiters/`     | 29    | Gold divider lines, dots                                      |
| `drapery/`        | 17    | Fabric banner textures                                        |
| `frames/large/`   | —     | 256x253 card overlay frames                                   |
| `frames/small/`   | —     | 94x92 icon overlay frames                                     |
| `frames/battler/` | —     | Battler avatar frames                                         |
| `icons/`          | 260   | Navigation, status, action icons                              |
| `progress/`       | 57    | Progress bars (colors + empty/full states)                    |
| `ribbons/`        | 15    | Decorative ribbon banners                                     |
| `table/`          | 35    | Table line elements                                           |
| `tabs/`           | 15    | Tab up/down states (3-part and single)                        |
| `unit-bgs/`       | 11    | Colored unit icon backgrounds                                 |

**Fonts added to** `public/fonts/`:

- `PerfectDOSVGA437.ttf` — Pixel font for data/numbers
- `fontin_sans_cr_sc_regular.otf` — Game small-caps heading font

### Phase 2: CSS Foundation (Completed 2026-02-11)

Changes to `app/globals.css`:

1. **Font registration**: `@font-face` for PerfectDOS and Fontin Sans SC
2. **CSS variables**: `--font-data`, `--font-game`, `--cursor-default`, `--cursor-pointer`
3. **Custom cursors**: Applied site-wide via `body` and all interactive elements
4. **Sidebar**: Game texture overlay, delimiter dividers, game font for titles/nav labels
5. **Cards**: `border-image` using `backs_3.png` 9-slice, removed border-radius for game look
6. **Panels**: Same 9-slice treatment as cards
7. **Tables**: Game-textured borders, delimiter header dividers, game font for headers
8. **Buttons**: Real PNG button textures (green default, orange primary, red danger) with up/over/down states
9. **Inputs**: `border-image` tooltip texture for all form fields
10. **Typography**: Game font applied to headings, nav labels, stat values, stat labels
11. **Stat values**: PerfectDOS pixel font for all numbers/scores
12. **Hero banner**: Game font with enhanced text shadow
13. **Utility classes**: `.game-panel`, `.game-tooltip-panel`, `.game-parchment`, `.game-delimiter`, `.game-ribbon`, `.game-frame-large`, `.game-frame-small`, `.game-drapery-top`, `.font-data`, `.font-game`

### Phase 2b: Parchment & Visual Verification (Completed 2026-02-11)

Playwright-driven screenshot review identified critical issues and fixes:

**Key fix**: Game panels use **light parchment interiors** with ornate frames, not dark fills.

1. **Cards**: Switched to `backs_10.png` (gold ornate frame, no fill) + `background: var(--color-parchment)` — 16px border
2. **Card headers**: Dark wood gradient (`#6b3a1a` to `#4a2510`) with gold text and gold delimiter
3. **Card body text**: Dark brown `#3a2a18` on parchment — readable
4. **Card links**: Brown `#6b3a1a` with underlines (not gold)
5. **Tables**: Parchment background + gold frame + dark wood header
6. **Table rows**: Transparent with subtle brown alternating rows
7. **Home page sections**: Updated sub-sections, intro text, section titles from dark theme to parchment-compatible
8. **Sidebar overrides**: Selects/inputs inside sidebar keep dark theme (`!important`)
9. **Panel**: Same parchment + gold frame treatment as cards

Verified via Playwright screenshots: `output/playwright/home.png`, `sidebar-expanded.png`

### Phase 3: Game UI Consistency Pass (Completed 2026-02-11)

Systematic audit of `globals.css` identified **25+ component groups** still using old dark-blue theme colors. All were updated to use the new brown-dark game palette.

**Core changes:**

1. **Page background**: Changed `--color-bg` from `#080d14` (navy) to `#0e0a04` (dark brown), `--color-bg-gradient` from blue radial to brown radial
2. **Sidebar background**: Changed from blue gradient `rgba(10,17,26)` to dark brown `#1a1208` → `#0e0a04`, texture blend mode changed to `overlay` at 45% opacity
3. **Game palette CSS variables**: Added `--color-game-dark`, `--color-game-surface`, `--color-game-border`, `--color-game-wood`, `--color-game-text-dark` and variants
4. **Core theme vars**: Updated `--color-surface`, `--color-surface-solid`, `--color-surface-2`, `--color-edge` from blue to brown tints (both `@theme` and `:root`)

**Tier 1 — High impact (visible on most pages):** 5. **`.news-card`**: Parchment background + `backs_10.png` gold ornate frame, dark brown text, brown fade gradient 6. **`.list-item`**: Parchment-compatible background with brown borders, dark text 7. **`.stat-cell`**: Parchment background, brown text (was dark blue `rgba(10,21,32)`) 8. **`.tooltip-head`**: Dark wood gradient background with overlay-blended texture, gold text 9. **`.status` badges**: Brown tones instead of gold-on-dark (warn/error/success adjusted for parchment readability)

**Tier 2 — Medium impact (specific pages):** 10. **`.notification-bell__*`**: Trigger, panel, header, items all switched from blue to brown-dark gradients 11. **`.forum-*`**: ~20 classes updated — sort group, post cards, vote columns, detail cards, forms, editor, markdown toolbar, code blocks, blockquotes, tables 12. **`.user-menu__panel`**: Brown-dark gradient floating menu 13. **`.select-content` / `.combobox-dropdown`**: Brown-dark dropdown panels 14. **`.alert`**: Brown-tinted alert backgrounds 15. **`.toast`**: Brown-dark floating notification 16. **`.modal-backdrop`**: Brown-tinted overlay 17. **Admin bars**: `.admin-clan-row`, `.filter-bar`, `.rule-bar` switched from blue to brown

**Tier 3 — Lower impact:** 18. **`.chart-empty`**: Brown-tinted dashed border empty state 19. **`.cms-error-banner`**: Updated border-radius 20. **`.editable-text-*`**: Editor, inputs, tabs, preview all updated to brown borders and backgrounds 21. **`.editable-list-item`**: Brown tint backgrounds and drop targets 22. **`.editable-list-modal`**: Brown-dark modal 23. **`.messages-email-card`**: Brown-dark email cards 24. **CMS markdown**: Code blocks, tables switched to brown tints 25. **Input focus styles**: Brown gradient instead of blue on focus

**Border-radius audit:**

- Structural containers (cards, panels, tabs, forms, editors, dropdowns, modals) → `2px` (sharp game corners)
- Pills, badges, toggles, avatars → preserved `var(--radius-full)` (rounded)
- Small interactive buttons → preserved small radius

Verified via Playwright screenshots: `output/playwright/home.png`, `sidebar-expanded.png`, and 5 additional page captures.

### Phase 4: Dark Teal Palette Redesign (Completed 2026-02-11)

User feedback: The brown/wood palette felt like "turd" colors. Requested shift back to dark blue/teal tones inspired by the Total Battle game background (Screenshot_18.jpg), with parchment reserved only for small feature cards and highlights.

**Color palette shift:**

1. **`--color-bg`**: `#0e0a04` (brown) → `#0c1520` (dark navy)
2. **`--color-bg-gradient`**: Brown radial → `radial-gradient(ellipse at 30% 0%, #1a3348 0%, #0f2030 50%, #0c1520 100%)`
3. **`--color-surface*`**: All brown `rgba(26,18,8,...)` → teal `rgba(15,25,40,...)`
4. **`--color-surface-solid`**: `#1a1208` → `#12263a`
5. **`--color-edge*`**: Brown gold `rgba(139,109,63,...)` → true gold `rgba(201,163,74,...)`
6. **`--color-game-*` variables**: All brown tints → dark teal equivalents
7. **`--color-game-wood` / `--color-game-wood-light`**: Renamed to `--color-game-header` / `--color-game-header-light` with values `#1a3348` / `#254050`

**Per-component changes:**

- **Sidebar**: `linear-gradient(180deg, #0f1a28, #0a1018)` — dark navy, no brown
- **Card headers / tooltip-head**: `linear-gradient(180deg, #254050, #1a3348)` — dark teal
- **Cards / panels / tables / news-cards**: Reverted from `var(--color-parchment)` to `var(--color-surface)` — dark surfaces with light text
- **Text colors**: All `#3a2a18` (brown text) → `var(--color-text-2)` (light on dark)
- **Links**: Card links now `var(--color-gold-2)` instead of brown
- **Status badges**: Updated to lighter colors (`#e4c060`, `#e05a4a`, `#5cc970`) for dark-bg contrast
- **News-card-fade**: Gradient updated from parchment to dark teal `rgba(15,25,40,...)`
- **~50+ rgba replacements**: All `rgba(26,18,8,...)`, `rgba(14,10,4,...)`, `rgba(32,22,10,...)`, `rgba(42,30,14,...)`, `rgba(107,58,26,...)` → teal equivalents

**Selective parchment preservation:**

- `.list-item` (home page features): Keeps `rgba(240,230,210,0.5)` parchment bg with dark text `#3a2a18`
- `.stat-cell`: Keeps parchment tint for data emphasis
- `.game-parchment` utility class: Preserved for selective JSX use

Verified via Playwright screenshots: all 6 pages + sidebar confirm consistent dark teal palette.

### Phase 5: Design Showcase & Variant Pages (Completed 2026-02-11)

Replaced 14 old `/redesign` variant pages with a streamlined design iteration system:

**UI Element Showcase (`/redesign/page.tsx`)**

- 15 element categories: Palette, Typography, Buttons, Cards/Panels, Forms/Inputs, Tables, Tabs, Lists/Stats, Status/Feedback, Modals, Sidebar Mocks, Progress Bars, Decorative Assets, Backgrounds, Icons
- 50+ game assets displayed across categories
- Quick-nav links, variant palette swatches, all button textures, 8+ panel frame styles, 5 tooltip backs, 10+ delimiters, 9 drapery variants, 11 ribbons, 8 large frames, 6 small frames, 7 chest frames, 4 battler frames, 14 decorative elements, 6 backgrounds, 11 unit backgrounds, 7 progress bar styles

**Three Maximalist Design Variants:**

1. **Dark Sapphire (`/redesign/v1`)** — Navy `#0a1628` + sapphire `#1a4070` + gold `#c9a34a`
   - `backs_header_1.png` sidebar texture (screen blend)
   - `heroes_back_abstract.png` hero background with `drapery_tir_hero_1` overlay
   - `backs_10.png` ornate gold card frames
   - Gold drapery on card headers (`hero_2`, `hero_3`)
   - `components_progress_bar_1/2` + `hp_bar_menu_green`
   - Gold frames, ribbons (`01`, `5`), decorations (`backs_decoration_1`, `decor_light_1/2`)
   - 30+ unique assets

2. **Emerald Bastion (`/redesign/v2`)** — Teal `#0a1820` + emerald `#1a4a38` + bronze `#b88a4a`
   - `backs_leather_1.png` sidebar leather texture
   - `medieval_background.png` hero with `drapery_tir_V_1` overlay
   - `backs_18.png` green-tinted card frames + leather card variant
   - Green accent nav items, emerald active tabs
   - `components_progress_bar_3/4` + `hp_bar_menu_green`
   - Green frames (`256x253_green`, `greenII`), ribbons (`3`, `4`)
   - 30+ unique assets

3. **Crimson Keep (`/redesign/v3`)** — Charcoal `#121018` + crimson `#5a1a1a` + gold `#e4c778`
   - `backs_technologies_1.png` sidebar texture
   - `preloader_background_default.png` hero with dual `drapery_tir_capt_1` flanking
   - `backs_25.png` + `backs_31.png` dramatic card frames
   - Crimson card headers, red active tabs/nav
   - `components_progress_bar_red` + `Progressbar_hp_full_red` + `Progressbar_energy_full`
   - Red/violet frames, ribbons (`7`, `8`), decorations (`backs_decoration_5`, `components_decor_5`)
   - 30+ unique assets

**Technical approach:**

- Each variant page is self-contained with scoped CSS variables (inline `<style>`)
- No modifications to `globals.css`
- Sticky sidebars (height: 100vh, position: sticky)
- All pages use `"use client"` for client-side rendering
- Reuses existing `app/redesign/layout.tsx` (hides main sidebar/footer)

**Verified via Playwright:** Screenshots of all 4 pages (`showcase.png`, `v1-dark-sapphire.png`, `v2-emerald-bastion.png`, `v3-crimson-keep.png`) in `output/playwright/`.

### Phase 6: 5-Variant Expansion (Completed 2026-02-11)

Replaced old 3-variant system with 5 new variants, all based on the Crimson Keep direction (dark blue + red + dark purple). Introduced a **shared variant template** (`app/redesign/variant-template.tsx`) to eliminate code duplication.

**Architecture:**

- `VariantConfig` interface defines palette (20+ CSS variables) and asset selections
- `VariantPage` component renders the full layout from a config object
- Each variant page (`v1/page.tsx` through `v5/page.tsx`) provides only configuration data
- All variants share identical layout structure with zero code duplication

**Asset review findings:**

- 51 event banners (708x123px) cataloged; each variant now shows 3 banners as content headers
- 43 frame variants across 3 sizes (256x253, 94x92, battler) with proper dark backgrounds
- 58 component assets (tabs, progress bars, battler UI, rating icons)
- 17 drapery/silk banner overlays — each variant uses different drapery choices
- Footer decorations now displayed with dark background containers to prevent transparency issues

**The 5 variants (Iteration 2 — blue-dominant, regal/elegant):**

All variants anchored in dark blue with classic gold highlights. Red and dark purple used only as supporting accents. Ornate decorative elements added: `backs_decoration_34.png` (gold circular frame around logo), `backs_decoration_25.png` (wide ornate scrollwork band), `backs_decoration_11.png` (baroque frame), `backs_decoration_33.png` (medallion), additional line dividers.

| Variant | Name           | Base                 | Headers             | Gold              | Hero BG                 | Key Banners                           |
| ------- | -------------- | -------------------- | ------------------- | ----------------- | ----------------------- | ------------------------------------- |
| V1      | Sovereign Blue | `#0a1428` dark navy  | Blue `#0e1c38`      | `#d4a844`         | Preloader default       | Throne, Gold Dragon, Captain          |
| V2      | Royal Forge    | `#0c1630` sapphire   | Dark red `#6a1818`  | `#e4c060` warm    | Heroes abstract         | Ragnarok, Destruction, Equipment      |
| V3      | Iron Crown     | `#0e1624` steel blue | Blood red `#5a1414` | `#f0d070` bright  | Halloween (hue-shifted) | Destruction, Hellforge, Doomsday      |
| V4      | Azure Throne   | `#081428` deep azure | Blue `#0c1c36`      | `#c8a040` classic | Gacha back              | Gold Dragon, King Treasury, Scientist |
| V5      | Night Citadel  | `#080e1c` near-black | Deep red `#601818`  | `#d0a848` refined | Winter preloader        | Doomsday, Army Training, Monster Kill |

**Verified via Playwright:** Screenshots at `output/playwright/v1-sovereign-blue.png` through `v5-night-citadel.png`.

### Phase 6b: Purple-Blue Refinement (Completed 2026-02-11)

User feedback: previous variants too pink/purple-dominant (round 1) then too brown/yellow/warm (round 2). Wanted dark purple-blue tones with elegant feel.

**Template v3 improvements:**

- **CSS filter tinting**: All parchment-colored ornate decorations (`backs_decoration_*`) tinted via `sepia(1) saturate(.4-.5) hue-rotate(200-220deg) brightness(.6-.7)` to match dark purple-blue palette
- **Banner integration**: Game banners used as section backgrounds with gradient overlays + text ("Aktuelles Event", "Community Events"), not stacked as standalone images
- **No asset boxes**: Footer decorative row uses natural opacity blending, no dark container boxes
- **Purple accents**: Badges, active nav, borders all use deep indigo/violet tones
- **Font upgrade**: Body font changed to Crimson Text (serif) for more refined/regal feel
- **Cooler gold**: Gold shifted from warm (#d4a844) to cooler (#b0a080 — #c8a858) across variants

**The 6 variants:**

| #   | Name             | Family         | Base      | Accent Purple           | Headers            | Gold                  |
| --- | ---------------- | -------------- | --------- | ----------------------- | ------------------ | --------------------- |
| V1  | Sovereign Deep   | Sovereign Blue | `#0a1428` | `#6a5aaa` indigo        | Blue `#141e40`     | `#c0a870` cool        |
| V2  | Sovereign Indigo | Sovereign Blue | `#0a1428` | `#7868b8` bright indigo | Indigo `#1a1848`   | `#b0a080` silver-gold |
| V3  | Sovereign Violet | Sovereign Blue | `#0c1428` | `#8060c0` violet        | Violet `#281848`   | `#c8a858` warm        |
| V4  | Night Abyss      | Night Citadel  | `#080e1c` | `#5c4c98` deep indigo   | Dark red `#4a1418` | `#b8a068` cool        |
| V5  | Night Plum       | Night Citadel  | `#080c1e` | `#7460b0` plum          | Purple `#201840`   | `#a89878` muted       |
| V6  | Night Eclipse    | Night Citadel  | `#06091a` | `#6050a0` indigo        | Deep red `#501818` | `#c8a850` bright      |

**Verified via Playwright:** Screenshots at `output/playwright/v1-sovereign-deep.png` through `v6-night-eclipse.png`.

### Phase 7: Night Abyss Multi-Page Expansion (Completed 2026-02-11)

User chose **Night Abyss** as the winner. Requested 6 variants with **stronger blue**, no purple dominance, and **varied page types** (not just home).

**Architecture overhaul:**

- Replaced monolithic `variant-template.tsx` with a new `variant-shell.tsx` layout component
- Shell provides sidebar + hero header; each page supplies its own children
- `ShellConfig` with `PaletteOverrides` allows per-variant palette customization
- Different page types share the same shell but render completely different content

**Game-reference corrections (from Total Battle screenshots):**

- The game uses **zero purple** — pure blue and gold. Purple now micro-accent only (badges)
- Sidebar gradient now firmly `#0c1832 → #081020` (dark navy, no purple bleed)
- Nav active state uses blue (`rgba(26,48,88,.35)`) not purple
- Gold more prominent: thicker borders (1.5px), gold2 in headers, text-shadow on headings
- Ornate circle around clan logo: larger (122px), higher opacity (.55), stronger glow

**The 6 page-type variants (all Night Abyss family):**

| #   | Name       | Page Type | Base BG                 | Headers                | Distinct Character                                                               |
| --- | ---------- | --------- | ----------------------- | ---------------------- | -------------------------------------------------------------------------------- |
| V1  | Deep Navy  | Home      | `#0a1424` warm navy     | Crimson `#4a1418`      | Classic overview: about, features, stats, progress, top players                  |
| V2  | Steel Blue | Dashboard | `#0c1628` brighter blue | Blue `#14284a`         | Data-focused: profile stats, 4 progress bars, activity log, weekly metrics table |
| V3  | Midnight   | News      | `#080e20` deepest dark  | Dark crimson `#581820` | Editorial: 4 banner-image articles with category badges, high contrast           |
| V4  | Royal Blue | Members   | `#0a1830` richest blue  | Blue `#162e52`         | Data table: 10-member ranking with roles, scores, chests, status indicators      |
| V5  | Dark Azure | Events    | `#081420` azure tint    | Crimson `#501820`      | Event cards: 4 events with status badges (gold/purple/red), banner images        |
| V6  | Slate Navy | Forum     | `#0c1424` grey-blue     | Blue `#142640`         | Thread list: 8 discussions, pinned indicators, category badges, softer contrast  |

**Key palette differences across variants:**

- V2 Steel Blue is noticeably brighter/lighter than V1
- V3 Midnight is the deepest/darkest
- V4 Royal Blue has the richest blue saturation
- V5 Dark Azure has subtle teal undertone
- V6 Slate Navy has grey-blue tones for reading comfort

**Verified via Playwright:** Screenshots at `output/playwright/v1-home.png` through `v6-forum.png`.

### Next Steps (Phase 8+)

- [ ] User selects preferred variant + page-type combinations for full site rollout
- [ ] Apply chosen Night Abyss palette to `globals.css`
- [ ] Implement actual page routing (not demo pages)
- [ ] Frame overlays on member/event cards (`.game-frame-large`)
- [ ] Drapery decoration on page headers
- [ ] Login/auth page restyling
- [ ] Game-styled loading/skeleton states
- [ ] Image optimization (WebP, srcset)
- [ ] Mobile/responsive verification via Playwright
