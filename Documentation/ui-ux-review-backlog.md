# UI/UX Review Backlog (Design + Layout)

Last updated: 2026-02-18
Direction: **Refined Command Table** (preserve medieval identity, improve hierarchy, density, and mobile usability)

## Scope

Pages reviewed via Playwright screenshots (desktop + mobile): public auth/home, dashboard, news, events, messages, analytics, settings, profile, bugs, members, forum, admin, design-system.

---

## P1 — High Impact Quick Wins (start now)

Target outcome: improve first impression, reduce visual clutter, and remove recurring runtime warnings.

### P1.1 Top Chrome Compaction (shared)

- **Goal:** reduce repeated top-area height (top bar + hero) on small screens.
- **Files:** `app/styles/layout.css`, `app/styles/components.css`
- **Acceptance criteria:**
  - Mobile pages show more actionable content above the fold.
  - Hero/title remains readable without clipping.
  - No horizontal overflow regressions.
- **Status:** Completed (2026-02-17).

### P1.2 Auth Content Progressive Disclosure

- **Goal:** keep login/register/forgot actions dominant while preserving explanatory text.
- **Files:** `app/auth/login/page.tsx`, `app/auth/register/page.tsx`, `app/auth/forgot/page.tsx`, `app/auth/components/auth-info-card.tsx`, `app/styles/components.css`
- **Acceptance criteria:**
  - Long explanatory blocks are collapsed by default in a consistent card pattern.
  - Auth forms remain fully visible on first load.
  - No loss of existing content.
- **Status:** Completed (2026-02-17).

### P1.3 Next/Image Warning Cleanup

- **Goal:** remove repeated console warning for `/assets/vip/back_left.png`.
- **Files:** `app/components/sidebar-shell.tsx`
- **Acceptance criteria:**
  - No width/height mismatch warnings for that asset during nav-heavy sessions.
- **Status:** Completed (2026-02-17).

### P1 Review Step (required)

- Run Playwright screenshot sweep on changed routes.
- Check console warnings/errors.
- Self-review for visual regressions (desktop + mobile).
- Verify focus/keyboard behavior on newly introduced collapsible sections.

---

## P2 — Structural UI Hierarchy & Density Improvements

Target outcome: stronger readability and clearer action hierarchy on content-heavy pages.

### P2.1 Surface Hierarchy Tokens

- **Goal:** create clearer elevation tiers (base, panel, card, active card).
- **Files:** `app/styles/theme.css`, `app/styles/components.css`, `app/styles/layout.css`
- **Acceptance criteria:**
  - Primary content areas are visually distinct from secondary metadata blocks.
  - Gold accents are reserved for high-priority actions/state.

### P2.2 List/Card Density Pass

- **Goal:** improve scanability on `news`, `forum`, `bugs`, `admin users`.
- **Files:** `app/styles/news.css`, `app/styles/forum.css`, `app/styles/bugs.css`, `app/styles/tables.css`, related page clients
- **Acceptance criteria:**
  - Better line-height/spacing for row titles + metadata.
  - Reduced crowding of chips/actions in list rows.
- **Status:** In progress (2026-02-17).
- **Progress:** Completed first density + hierarchy styling pass on list-heavy surfaces (`news`, `forum`, `bugs`, member/admin table rows), including desktop/mobile spacing refinements and metadata readability tuning.

### P2.3 Admin IA Clarity

- **Goal:** clearer tab context and reduced control overload.
- **Files:** `app/admin/admin-client.tsx`, `app/admin/tabs/*`, `app/styles/components.css`, `app/styles/tables.css`
- **Acceptance criteria:**
  - Active section context is explicit.
  - Filter/action rows remain understandable on mobile.
- **Status:** In progress (2026-02-17).
- **Progress:** Implemented phase-1 and phase-2 IA refinement for `/admin`: explicit active-section context in the tab panel, standardized responsive toolbar/filter action patterns across users/clans/logs/approvals, and visual action-priority hierarchy (primary/secondary/danger emphasis) in dense users/clans row action clusters.

### P2 Review Step (required)

- Self-audit each touched page for hierarchy consistency.
- Compare before/after screenshots side by side.
- Check role-specific pages (`member`, `owner/admin`) for regressions.

---

## P3 — UX Polish, Motion, and Accessibility Hardening

Target outcome: production polish and reduced interaction friction.

### P3.1 Unified Loading Skeletons

- **Goal:** replace generic loading text with page-specific skeleton patterns.
- **Files:** page-level loading components and related feature styles
- **Acceptance criteria:**
  - Consistent loading states for list/table/detail/dashboard surfaces.
- **Status:** In progress (2026-02-17).
- **Progress:** Implemented phase-1 shared loading variants in `app/components/page-skeleton.tsx` and mapped route/Suspense fallbacks to surface-specific patterns (`dashboard`, `list`, `table`, `detail`, `article`, `auth`, `messages`, `admin`) across primary routes.

### P3.2 Navigation Pattern Refinements (mobile)

- **Goal:** reduce small-screen nav dominance and improve tap efficiency.
- **Files:** `app/components/sidebar-shell.tsx`, `app/components/sidebar-nav.tsx`, `app/styles/layout.css`
- **Acceptance criteria:**
  - Primary tasks require fewer scroll/tap interruptions.
  - Touch targets remain >= 44px where relevant.
- **Status:** In progress (2026-02-17).
- **Progress:** Implemented phase-1 compact-nav refinement: mobile sidebar now prioritizes a single admin entry (instead of all admin sub-links), in-flyout profile/messages/settings navigation now uses `Link` transitions, and compact interactive targets (toggle/nav links/flyout links/actions) were normalized to >=44px-oriented sizing and touch-action behavior.

### P3.3 Interaction + Focus Polish

- **Goal:** stronger hover/focus/active affordances without noise.
- **Files:** `app/styles/components.css`, feature styles
- **Acceptance criteria:**
  - Consistent focus-visible treatment across interactive controls.
  - Clearer CTA hierarchy in all major forms and toolbars.
- **Status:** In progress (2026-02-17).
- **Progress:** Implemented phase-1 shared focus/interaction pass across primary controls (buttons, tabs, user-menu controls, form fields, notification controls, dashboard thread actions, sidebar/nav controls), plus CTA hierarchy refinement for dense admin filter/toolbar action rows (`primary` prominence and quieter secondary actions).

### P3 Review Step (required)

- Accessibility self-review (focus order, visible focus, contrast hotspots).
- Reduced-motion sanity check for transitions.
- Console warning/error pass after interaction-heavy walkthrough.
- **Status:** Completed (2026-02-18).
- **Review outcomes:**
  - Accessibility sweep passed: `npx playwright test tests/accessibility.spec.ts --project=chromium` (`17 passed`).
  - Keyboard focus-order + visible-focus sanity passed: `output/playwright/focus-visible-p3-review.json` shows visible focus indicators across reviewed `/home`, `/messages`, `/settings`, and `/admin?tab=users` tab sequences.
  - Reduced-motion sanity pass completed: `output/playwright/reduced-motion-p3-review.json` shows `prefers-reduced-motion` respected on all reviewed routes with no overflow regressions.
  - Follow-up warning cleanup completed: post-review audit (`console-warning-fix-public.log`) now reports `Errors: 0, Warnings: 0` for `/auth/login`, `/auth/register`, `/auth/forgot`, and `/home`; owner follow-up audit removed prior NotificationBell/CSP/LCP noise and now only shows occasional automation-driven `429` responses on `/api/admin/email-confirmations` during rapid admin route churn.

---

## Final Review + Thorough Test Plan (required)

1. `npm run lint`
2. `npm run type-check`
3. Route walkthrough (desktop + mobile): `/home`, `/auth/login`, `/`, `/news`, `/events`, `/messages`, `/forum`, `/bugs`, `/settings`, `/profile`, `/members`, `/admin`, `/design-system`
4. Admin tab walkthrough with owner state: users, clans, approvals, forum, logs
5. Console sweep (warnings/errors) during navigation and filter interactions
6. Visual compare against baseline screenshots in `output/playwright`

If any regression appears, block rollout and move fix to the same phase before proceeding.

**Status:** Completed (2026-02-18).
**Validation snapshot:**

- `npm run lint` passed.
- `npm run type-check` passed.
- Route walkthroughs passed on desktop/mobile using `node scripts/playwright/ui-audit.mjs` (public + owner state), with zero redirects/overflow/checkbox anomalies on covered routes.
- Owner admin tab walkthrough passed: `npx playwright test tests/admin.spec.ts --project=chromium` (`18 passed`).
- Artifacts refreshed in `output/playwright` (`ui-audit-report-owner-p3.*`, `ui-audit-report-public-p3.*`, `console-*-p3.log`, `focus-visible-p3-review.json`, `reduced-motion-p3-review.json`, and route screenshots).
