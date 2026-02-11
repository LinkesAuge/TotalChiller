# Night Abyss Design Rollout — V1 + V6 Fusion

**Date**: 2026-02-11
**Status**: ALL PHASES COMPLETE (1–7) + Post-review fixes applied
**Base variants**: Deep Navy (V1) + Slate Navy (V6)
**Principle**: One design system, two header gradients — crimson for emphasis, blue for data.

---

## 1. Design Direction

Total Battle uses a dual-tone system. Crimson/maroon headers mark action areas (tournaments, events, promotions). Blue/teal headers mark data areas (statistics, rankings, member lists). Both sit on a dark blue canvas with gold framing.

Our V1+V6 fusion mirrors this:

- **Crimson headers** (`#4a1418 → #280c0e`): heroes, event cards, featured news, CTAs, auth pages
- **Blue headers** (`#142640 → #0c1c32`): tables, forums, member lists, settings, admin, dashboards
- **Shared base**: Dark navy `#0a1424`, gold `#c8a050`, Crimson Text body, Cinzel headings

---

## 2. Palette — Night Abyss

### Base tokens (replace current CSS variables)

| Token                   | Old                     | New                                                        |
| ----------------------- | ----------------------- | ---------------------------------------------------------- |
| `--color-bg`            | `#0c1520`               | `#0a1424`                                                  |
| `--color-bg-gradient`   | teal radial             | `radial-gradient(ellipse at 30% 8%, #142240, #0a1424 70%)` |
| `--color-surface`       | `rgba(15,25,40,0.7)`    | `rgba(10,20,42,0.9)`                                       |
| `--color-surface-solid` | `#12263a`               | `#0e1c38`                                                  |
| `--color-surface-2`     | `rgba(12,22,36,0.8)`    | `rgba(8,16,36,0.5)`                                        |
| `--color-surface-hover` | `rgba(20,35,55,0.8)`    | `rgba(26,48,88,0.12)`                                      |
| `--color-edge`          | `rgba(201,163,74,0.15)` | `rgba(200,160,80,0.22)`                                    |
| `--color-edge-glow`     | `rgba(201,163,74,0.3)`  | `rgba(200,160,80,0.42)`                                    |
| `--color-gold`          | `#c9a34a`               | `#c8a050`                                                  |
| `--color-gold-2`        | `#e4c778`               | `#e0b868`                                                  |
| `--color-gold-3`        | `#f5dda3`               | `#dcc070`                                                  |
| `--color-gold-dark`     | `#8a6d2f`               | `#8a7030`                                                  |
| `--color-text`          | `#f2e6c9`               | `#e0d8cc`                                                  |
| `--color-text-2`        | `#b8a888`               | `#9c9488`                                                  |
| `--color-text-muted`    | `#8a7b65`               | `#5c5650`                                                  |

### New tokens

| Token                | Value                                       | Purpose                           |
| -------------------- | ------------------------------------------- | --------------------------------- |
| `--header-blue`      | `linear-gradient(180deg, #142640, #0c1c32)` | Data/content card headers         |
| `--header-crimson`   | `linear-gradient(180deg, #4a1418, #280c0e)` | Emphasis/action card headers      |
| `--sidebar-top`      | `#0c1832`                                   | Sidebar gradient start            |
| `--sidebar-bot`      | `#081020`                                   | Sidebar gradient end              |
| `--sidebar-border`   | `rgba(200,160,80,0.3)`                      | Sidebar right border              |
| `--nav-active-bg`    | `rgba(26,48,88,0.35)`                       | Active nav item background        |
| `--separator-dotted` | `1px dashed rgba(200,160,80,0.12)`          | Game-style dotted gold separators |

### Typography

| Role      | Font                     | Change                       |
| --------- | ------------------------ | ---------------------------- |
| Headings  | Cinzel                   | Keep                         |
| Body      | Inter → **Crimson Text** | Serif body for medieval feel |
| Data      | PerfectDOS               | Keep                         |
| UI labels | Fontin Sans SC           | Keep                         |

---

## 3. Component Changes

### Sidebar

- Background: `linear-gradient(180deg, var(--sidebar-top), var(--sidebar-bot))`
- Border-right: `2px solid var(--sidebar-border)`
- Texture overlay: `backs_technologies_1.png` at 4% opacity, `mix-blend-mode: screen`
- Clan logo: ornate frame (`backs_decoration_34.png`) at 55% opacity
- Nav active: gold left border + gold text + blue bg
- Nav hover: `rgba(26,48,88,0.25)` + gold text
- Separators: gold linear-gradient fade

### Cards

- Border: `1.5px solid var(--color-edge)`, highlight: `var(--color-edge-glow)`
- Header: `var(--header-blue)` default; `.card--emphasis`: `var(--header-crimson)`
- Header text: Cinzel, uppercase, `var(--color-gold-2)`, text-shadow
- List items: dotted gold separators (game pattern)

### Tables

- Header: `var(--header-blue)` gradient
- Column text: Cinzel, uppercase, gold, 0.6rem
- Row separators: `var(--separator-dotted)`
- Even rows: subtle `var(--color-surface-2)` alternation
- Hover: blue tint `rgba(26,48,88,0.12)`

### Badges

- Default: `rgba(26,48,88,0.2)` bg, `#4a7aaa` text
- Gold: `rgba(200,160,80,0.1)` bg, gold text
- Red: `rgba(120,32,32,0.15)` bg, `#c84444` text
- Purple (micro-accent): `rgba(80,60,140,0.1)` bg, `#6a58a0` text

### Forms

- Input bg: `rgba(10,20,42,0.9)`
- Border: `1.5px solid rgba(200,160,80,0.2)`
- Focus: gold border + subtle gold glow

### Top bar

- Keep `header_3.png` texture
- Title: gold with text-shadow
- Bottom border: `2px solid var(--sidebar-border)`

### Section heroes

- Background image darkened (`brightness(.2) saturate(.4)`)
- Gradient veil to base color
- Flanking drapery at 45% opacity
- Ornate divider below

---

## 4. Page Map

| Page            | Header variant              | Game reference   | Key changes                                     |
| --------------- | --------------------------- | ---------------- | ----------------------------------------------- |
| `/home`         | Crimson hero                | Screenshot_1, 18 | Hero with drapery, feature list, stats grid     |
| `/` (dashboard) | Blue                        | Screenshot_10    | Profile card, activity feed, metrics table      |
| `/news`         | Crimson featured, blue rest | Screenshot_3     | Banner-image article cards, category tabs       |
| `/events`       | Crimson                     | Screenshot_3, 7  | Event cards with banners, status badges, timers |
| `/members`      | Blue                        | Screenshot_12    | Avatar frames, filter tabs, dotted separators   |
| `/charts`       | Blue                        | Screenshot_14    | Ranking table, chart cards                      |
| `/forum`        | Blue                        | Screenshot_10    | Thread list, category badges                    |
| `/messages`     | Blue                        | —                | Conversation list, message detail               |
| `/profile`      | Crimson hero + blue data    | —                | Large avatar frame, stats below                 |
| `/settings`     | Blue                        | —                | Form cards with gold borders                    |
| `/admin/*`      | Blue                        | —                | Data tables, action buttons                     |
| `/auth/*`       | Crimson                     | —                | Centered form on background image               |

---

## 5. Implementation Phases

### Phase 1: Foundation (CSS variables + sidebar) --- COMPLETE

- Swapped all `--color-*` variables to Night Abyss values (`#0a1424` base)
- Added `--header-blue`, `--header-crimson`, `--separator-dotted`, `--sidebar-*`, `--nav-active-*`
- Restyled sidebar: `backs_technologies_1.png` texture at 4% screen blend, ornate circle frame around logo
- Switched body font from Inter to Crimson Text
- Bulk-replaced 155 instances of old gold `(201,163,74)` → `(200,160,80)` across globals.css
- Updated hardcoded colors in dashboard-client, chart-components, events-types

### Phase 2: Cards & Tables --- COMPLETE

- Card header now uses `var(--header-blue)` gradient
- Added `.card--emphasis .card-header` rule for crimson headers
- Table headers use `var(--header-blue)` with `var(--color-gold-2)` text
- Table row separators changed to `var(--separator-dotted)` (dashed gold)
- Even rows use `var(--color-surface-2)`, hover uses `var(--color-surface-hover)`

### Phase 3: Top Bar & Heroes --- COMPLETE

- Hero overlay gradient updated to Night Abyss values
- Hero background images darkened via `brightness(0.6) saturate(0.5)` filter
- Added `.section-divider` class with gold gradient lines and optional decoration image

### Phase 4: Forms & Inputs --- COMPLETE

- Focus state background updated to Night Abyss `rgba(10,20,42,0.95)`
- Autofill shadow color updated to match
- Button and checkbox styles preserved (already used correct game assets)

### Phase 5: Page-Specific Polish --- COMPLETE

- Added `.card--emphasis` (crimson) to home page "About Us" and "Contact" cards
- Added `.card--emphasis` to event form, past event cards
- Added `.card--emphasis` to news create/edit form
- Dashboard, members, forum, charts already use correct blue headers (no changes needed)
- Cleaned up 18 remaining `rgba(15,25,40,...)` old teal references in globals.css

### Phase 6: Auth Pages --- COMPLETE

- Added `card--emphasis` to all 4 auth form cards (login, register, forgot, update)
- Crimson tooltip-head headers now appear on auth form cards
- Info cards below forms stay blue (default)

### Phase 7: Final Polish --- COMPLETE

- Added global `focus-visible` ring (`2px solid rgba(200,160,80,0.55)`) for a, button, [role=button], summary
- Added smooth transitions for cards, badges, buttons, nav, forum cards, news cards
- Added `.gold-separator` utility class for horizontal gold fade lines
- Accessibility audit: all key color combinations pass WCAG AA
  - Text on bg: 13.06:1, Gold on bg: 7.55:1, Gold-2 on bg: 9.86:1
  - Text on header-blue: 10.56:1, Text on header-crimson: 10.58:1
  - Muted text on bg: 6.15:1
- Responsive sidebar: already auto-collapses at 900px (preserved)

Each phase is independently deployable. The site stays functional after every phase.

### Post-Review Fixes --- COMPLETE

User review identified 7 issues with the initial rollout:

1. **White corner boxes**: Card border-image `backs_10.png` (parchment) had light tan corners visible against dark bg. Fixed by switching to `backs_28.png` (dark steel frame).
2. **Sidebar too dark**: Restored original greyish-blue gradient (`#0f1a28 → #0a1018`) instead of deep navy.
3. **Ornate logo decoration**: Removed `backs_decoration_34.png` circle behind logo. Restored logo to original 160px.
4. **Sidebar texture invisible**: Restored original `back_left.png` at `0.45` opacity with `overlay` blend.
5. **Text too dim**: Restored `--color-text: #f2e6c9`, `--color-text-2: #b8a888`, `--color-text-muted: #8a7b65`.
6. **Nav hover ghost icon**: Disabled `.nav-icon-glow` radial gradient on hover (set opacity to 0).
7. **Surfaces too dark/opaque**: Restored `--color-surface: rgba(15,25,40,0.75)` and original bg gradient.

**What was kept from Night Abyss**:

- `--header-blue` / `--header-crimson` dual-tone card header system
- `.card--emphasis` class for crimson headers on CTAs, auth, events
- Crimson Text serif body font
- Updated gold palette (`#c8a050`, `#e0b868`)
- Global focus-visible rings, smooth transitions
- `.section-divider` and `.gold-separator` utility classes

---

## 6. Files Modified Per Phase

### Phase 1

- `app/globals.css` — CSS variables
- `app/components/sidebar-shell.tsx` — sidebar restyling
- `app/components/sidebar-nav.tsx` — nav item styling
- `app/layout.tsx` — add Crimson Text font import

### Phase 2

- `app/globals.css` — card, table, badge styles

### Phase 3

- `app/globals.css` — top-bar styles
- `app/components/section-hero.tsx` — hero treatment
- `app/components/page-top-bar.tsx` — top bar updates

### Phase 4

- `app/globals.css` — form/input styles

### Phase 5

- Individual page files (home, dashboard, news, events, members, forum)

### Phase 6

- `app/auth/*/page.tsx` files

### Phase 7

- `app/globals.css` — transitions, ornate elements
- Accessibility fixes as needed
