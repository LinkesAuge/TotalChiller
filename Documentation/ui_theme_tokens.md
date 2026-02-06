# UI Theme Tokens — Fortress Sanctum Design System

This file captures the reusable theme tokens from the Fortress Sanctum design system. These tokens are defined as CSS variables in `app/globals.css`.

## CSS Variables
```css
:root {
  /* Sidebar */
  --sidebar-width: 236px;
  --sidebar-collapsed: 60px;

  /* Fonts */
  --font-heading: "Fontin Sans", serif;
  --font-body: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;

  /* Core colors */
  --color-bg: #080d14;
  --color-bg-gradient: radial-gradient(ellipse at 30% 0%, #152238 0%, #0a1220 50%, #080d14 100%);
  --color-surface: rgba(18, 39, 58, 0.7);
  --color-surface-solid: #12273a;
  --color-surface-2: rgba(15, 34, 51, 0.8);
  --color-surface-hover: rgba(25, 50, 75, 0.8);
  --color-edge: rgba(201, 163, 74, 0.15);
  --color-edge-glow: rgba(201, 163, 74, 0.3);

  /* Gold palette */
  --color-gold: #c9a34a;
  --color-gold-2: #e4c778;
  --color-gold-3: #f5dda3;
  --color-gold-dark: #8a6d2f;
  --color-gold-glow: rgba(228, 199, 120, 0.15);

  /* Text */
  --color-text: #f2e6c9;
  --color-text-2: #b8a888;
  --color-text-muted: #6b5e4a;

  /* Accents */
  --color-accent-red: #c94a3a;
  --color-accent-green: #4a9960;
  --color-accent-blue: #4a6ea0;

  /* Parchment table */
  --color-parchment: #f0e6d2;
  --color-parchment-2: #e5d9c3;
  --color-parchment-dark: #3a3020;

  /* Shadows */
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.03);
  --shadow-glow: 0 0 20px var(--color-gold-glow);
  --shadow-inner: inset 0 1px 0 rgba(255, 255, 255, 0.05);

  /* Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-full: 999px;

  /* Transitions */
  --transition-fast: 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  --scrollbar-size: 8px;
}
```

## Gradient Patterns (Commonly Used)

- **Card background**: `linear-gradient(180deg, rgba(22, 44, 66, 0.9), rgba(14, 30, 45, 0.92))`
- **Table header**: `linear-gradient(180deg, rgba(28, 50, 72, 0.98), rgba(18, 36, 54, 0.98))`
- **Input/Select trigger**: `linear-gradient(180deg, rgba(14, 24, 38, 0.85), rgba(8, 16, 26, 0.9))`
- **Dropdown panel**: `linear-gradient(180deg, rgba(14, 24, 38, 0.97), rgba(8, 16, 26, 0.98))`
- **Button default**: `linear-gradient(180deg, rgba(15, 34, 51, 0.9), rgba(10, 25, 40, 0.95))`
- **Button primary**: `linear-gradient(180deg, #3d2d12, #261a0a)`
- **Button danger**: `linear-gradient(180deg, rgba(60, 25, 20, 0.9), rgba(40, 15, 12, 0.95))`
- **Toggle checked**: `linear-gradient(180deg, rgba(201, 163, 74, 0.35), rgba(138, 109, 47, 0.25))`

## VIP Assets

- **Heading font**: `/fonts/fontin_sans_cr_sc_regular.otf` (Fontin Sans)
- **Top bar background**: `/assets/vip/header_3.png`
- **Admin crown icon**: `/assets/vip/button_vip_crown_22x33.png`
- **Sidebar background**: `/assets/vip/back_left.png`
- **Sidebar decoration**: `/assets/vip/components_decor_7.png`

## Component Usage Notes

- Cards: dark gradient background with `--color-edge` border, gold hover border.
- Buttons: `--color-gold` border, gold text, gradient fill. Primary uses warm dark gradient.
- Tables: dark gradient header with gold text-shadow, alternating row backgrounds.
- Tabs: segmented control with dark inner background, gold active glow.
- Selects: gradient trigger, gold-accented dropdown items.
- Inputs: gradient background, gold-tinted border, gold focus ring with glow.
- Badges: gold gradient background with gold border and glow.
- Status indicators: dark background with colored border/glow (not light-background pills).
- Toggles: dark gradient track, gold gradient checked state.
- Scrollbars: `--color-edge` thumb, `--color-gold-dark` hover.

## Z-Index Layers

- Sidebar: `100`
- User actions bar / Notification bell panel / User menu panel: `200`
- Select content dropdowns: `200`
- Modal backdrop: `300`
