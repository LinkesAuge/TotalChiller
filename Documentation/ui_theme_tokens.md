# UI Theme Tokens (Dark Blue / Gold)

This file captures the reusable theme tokens derived from the Total Battle-inspired style preview. These tokens can be used in Tailwind config, CSS variables, or design tools.

## CSS Variables
```css
:root {
  --color-bg: #0b1622;
  --color-surface: #12273a;
  --color-surface-2: #0f2233;
  --color-edge: #1f3c57;
  --color-gold: #c9a34a;
  --color-gold-2: #e4c778;
  --color-text: #f2e6c9;
  --color-text-2: #b8a98a;
  --color-accent-red: #a33b2b;
  --color-parchment: #e6dcc2;
  --color-parchment-2: #d8ccb1;
}
```

## Tailwind Theme Extension (Suggested)
```js
module.exports = {
  theme: {
    extend: {
      colors: {
        bg: "#0b1622",
        surface: "#12273a",
        "surface-2": "#0f2233",
        edge: "#1f3c57",
        gold: "#c9a34a",
        "gold-2": "#e4c778",
        text: "#f2e6c9",
        "text-2": "#b8a98a",
        "accent-red": "#a33b2b",
        parchment: "#e6dcc2",
        "parchment-2": "#d8ccb1",
      },
      boxShadow: {
        panel: "0 10px 18px rgba(0, 0, 0, 0.35)",
      },
      borderRadius: {
        panel: "14px",
      },
    },
  },
};
```

## Component Usage Notes
- Panels: `bg-surface border border-edge shadow-panel rounded-panel`
- Primary buttons: `border border-gold text-gold-2 bg-surface-2 hover:text-gold-2`
- Data tables: `bg-parchment text-[#3a2f1c]` with `bg-parchment-2` header rows
- Tabs: `bg-surface-2 border border-edge rounded-full`

## Status Styling Notes (Current UI)
- Validation states: `validation-valid`, `validation-invalid`, and `validation-cell-invalid`
- Correction highlight: `correction-cell-corrected`
- Row hover is disabled for non-interactive containers (cards/rows/lists)
