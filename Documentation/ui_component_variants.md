# UI Component Variants And States — Fortress Sanctum

This document defines the core UI components, their variants, and states for the Fortress Sanctum design system.

## Buttons
### Variants
- **Default**: gold border + dark gradient fill, gold text.
- **Primary**: warm dark gradient (brown tones) with gold border and inner glow.
- **Danger**: red accent border with dark red gradient.
- **Leather**: VIP texture background image with relative-positioned text.
- **Icon button**: compact padding, same styling as default.

### States
- Default
- Hover (brighter gold, slight lift, gold glow shadow)
- Active (pressed, reduced shadow, no lift)
- Disabled (muted opacity, no cursor)

## Badges
### Variants
- **Default**: gold gradient background with gold border and glow.
- **Success**: green-tinted gradient with green border.
- **Warning**: amber-tinted gradient with amber border.
- **Danger**: red-tinted gradient with red border.
- **Info**: blue-tinted gradient with blue border.

## Tabs
### Variants
- **Segmented control**: dark inner background, flex-wrap for many items.
- **Compact** (filter tabs): reduced padding.

### States
- Active (gold border, gold text, gradient background, text-shadow glow)
- Hover (lighter text, subtle gold background tint)
- Default (muted text, transparent background)

## Cards
### Variants
- **Standard card**: dark gradient background, gold-tinted edge border, hover lifts with gold border.
- **Full-width card**: `gridColumn: 1 / -1` for spanning grid.
- **Card with header**: `card-header` has gold-tinted bottom border and heading font.
- **Card body**: padded content area for forms and lists.

## Tables
### Variants
- **Sanctum table**: dark gradient background with gold border.
- **Data table**: full-width with horizontal scroll sync.

### Header
- Dark gradient background with gold text, letter-spacing, text-shadow.
- Decorative `::after` gold gradient divider line.

### Rows
- Alternating backgrounds (darker odd, slightly lighter even).
- Gold-tinted hover (`rgba(201, 163, 74, 0.08)`).
- Selected: gold left border indicator.
- Validation status cells (valid/invalid).
- Correction status cells (corrected highlight).

## Select Dropdowns
### Trigger
- Gradient background with gold-tinted border.
- Gold chevron icon.
- Focus: gold border with glow ring.

### Content Panel
- Gradient background, gold border, elevated shadow.
- z-index: 200.

### Items
- Gold-highlighted on hover with gold border.
- Checked state: subtle gold background with gold text.
- Gold checkmark indicator.

## Inputs / Textareas
- Gradient background with gold-tinted border.
- Focus: gold border with glow ring.
- Placeholder: muted text color.
- Disabled: reduced opacity.

## Combobox
- Same input styling as standard inputs.
- Dropdown: gradient background, gold border, gold-highlighted options.

## Status Indicators
### Variants
- **Default**: gold-tinted gradient on dark background.
- **Success**: green-tinted gradient with green border/glow.
- **Warning**: amber-tinted gradient with amber border.
- **Error**: red-tinted gradient with red border.

Note: All status indicators use dark backgrounds (not light-background pills) to match the Sanctum theme.

## Toggle Switches
- **Off**: dark gradient track with muted knob.
- **On**: gold gradient track with gold knob and glow.
- Focus: gold ring.

## Checkboxes
- Custom appearance: gold border, dark background.
- Checked: gold gradient background with gold checkmark.
- Hover: gold border glow.

## Alerts
### Variants
- **Info**: blue-tinted background with blue border.
- **Success**: green-tinted background with green border.
- **Warning**: amber-tinted background with amber border.
- **Error**: red-tinted background with red border.

## Modals
- Backdrop: dark overlay with blur (z-index: 300).
- Card-based content panel.
- **Danger modal**: red-tinted border and background.

## Notification Bell
- Trigger: gradient background with gold border.
- Badge: red gradient with glow.
- Panel: gradient background, gold border, z-index: 200.
- Header: gold gradient tint with gold title.
- Items: gold border on unread, gold hover.
- Footer: gold text, gradient background.

## User Menu
- Summary: gradient background with gold border, avatar with gold initials.
- Panel: gradient background, gold border, z-index: 200.
- Links: icon + text, gold hover.
- Dividers: subtle gold gradient lines.

## Sidebar
- Background: VIP `back_left.png` with dark gradient overlay.
- Logo section with decorative VIP element.
- Collapsible toggle (top of nav bar).
- Nav items: icon + text, gold active state with left border indicator.
- Bottom: user avatar, name, status/rank, clan selector dropdown.

## Pagination
- Compact buttons, muted text.
- Page size select with compact trigger.
- Input for page number.

## Scrollbars
- Track: dark transparent.
- Thumb: gold-tinted (`--color-edge`).
- Hover: `--color-gold-dark`.
