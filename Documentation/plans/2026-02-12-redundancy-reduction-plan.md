# Redundancy Reduction Plan (2026-02-12)

Comprehensive plan to eliminate ~1,350+ lines of duplicate code across the project, organized into 7 phases. Each phase builds on the previous one — complete phases in order.

## Execution Rules

- **One phase at a time.** Complete all steps in a phase before starting the next.
- **Test after each step.** Run `npm run test:unit` and `npx playwright test` after each non-trivial change.
- **Commit after each phase.** Each phase is a logical, reviewable unit.
- **No behavior changes.** This is a pure refactoring effort — no features, no UI changes.

---

## Phase 1: Foundation — Shared API Helpers & Auth Consolidation (COMPLETED)

**Goal:** Eliminate 25+ copies of auth boilerplate and 4 competing admin check patterns across API routes.

### Step 1.1: Create `lib/api/require-auth.ts`

Create a `requireAuth()` helper that returns `{ userId, supabase }` or `{ error: NextResponse }`:

```typescript
export async function requireAuth(): Promise<
  | { userId: string; supabase: ServerClient; error?: undefined }
  | { error: NextResponse; userId?: undefined; supabase?: undefined }
>;
```

- Creates server client internally
- Calls `supabase.auth.getUser()`
- Returns 401 on failure
- Returns `{ userId, supabase }` on success

### Step 1.2: Extend with `requireAdmin()` update

Update `lib/api/require-admin.ts` to use `requireAuth()` internally instead of duplicating auth logic. Keep the same external interface.

### Step 1.3: Migrate all API routes to `requireAuth()`

Replace the 5-line auth boilerplate in all API routes with a single call:

**Routes to migrate (25+):**

- `app/api/notifications/route.ts` (GET, POST)
- `app/api/notifications/[id]/route.ts` (PATCH, DELETE)
- `app/api/notifications/mark-all-read/route.ts`
- `app/api/notifications/fan-out/route.ts`
- `app/api/notification-settings/route.ts` (GET, PATCH)
- `app/api/messages/route.ts` (GET, POST)
- `app/api/messages/[id]/route.ts` (PATCH, DELETE)
- `app/api/messages/search-recipients/route.ts`
- `app/api/messages/broadcast/route.ts`
- `app/api/game-accounts/route.ts` (POST, GET, PATCH)
- `app/api/charts/route.ts`

### Step 1.4: Consolidate admin checks

Remove `verifyAdmin()` locals from:

- `app/api/site-list-items/route.ts`
- `app/api/site-content/route.ts`

Replace with `requireAdmin()` from `lib/api/require-admin.ts`.

Replace inline `rpc("is_any_admin")` calls in:

- `app/api/data-import/commit/route.ts`

Standardize design-system routes to use `requireAdmin()` instead of `getIsAdminAccess()`:

- `app/api/design-system/ui-elements/route.ts`
- `app/api/design-system/assignments/route.ts`
- `app/api/design-system/assets/route.ts`
- `app/api/design-system/preview-upload/route.ts`

**Note:** Keep `getIsAdminAccess()` in `proxy.ts` (different context — middleware, not API route).

### Step 1.5: Create `useSupabase()` hook

Create `app/hooks/use-supabase.ts`:

```typescript
export function useSupabase() {
  const [supabase] = useState(() => createSupabaseBrowserClient());
  return supabase;
}
```

Replace 22 direct `createSupabaseBrowserClient()` calls across client components with `useSupabase()`.

### Step 1.6: Consolidate auth state hooks

Update `app/components/sidebar-shell.tsx` and `app/components/public-auth-actions.tsx` to use `useAuth()` from `app/hooks/use-auth.ts` instead of their own `onAuthStateChange` subscriptions.

**Estimated reduction:** ~200 lines across 30+ files.

---

## Phase 2: Shared Domain Types & Constants (COMPLETED)

**Goal:** Eliminate 8+ duplicate type definitions and 5+ duplicate constants.

### Step 2.1: Extend `lib/types/domain.ts`

Add missing shared types:

```typescript
export interface GameAccountView {
  readonly id: string;
  readonly game_username: string;
  readonly approval_status: string;
  readonly created_at: string;
}

export interface ClanOption {
  readonly id: string;
  readonly name: string;
  readonly rank?: string | null;
}

export interface ValidationRuleRow {
  readonly id: string;
  readonly clan_id: string | null;
  readonly field: string;
  readonly match_value: string;
  readonly is_regex: boolean;
  readonly status?: string;
}

export interface CorrectionRuleRow {
  readonly id: string;
  readonly clan_id: string | null;
  readonly field: string;
  readonly match_value: string;
  readonly replacement_value: string;
  readonly is_regex: boolean;
  readonly status?: string;
}
```

### Step 2.2: Update consumers to import from `lib/types/domain.ts`

Remove local type definitions and import from domain:

- `app/profile/page.tsx` — remove local `GameAccountView`
- `app/profile/game-account-manager.tsx` — remove local `GameAccountView`
- `app/messages/messages-client.tsx` — remove local `ClanOption`
- `app/components/sidebar-shell.tsx` — remove local `ClanOption`
- `app/data-import/data-import-client.tsx` — remove local `ValidationRuleRow`, `CorrectionRuleRow`
- `app/data-table/data-table-client.tsx` — remove local `ValidationRuleRow`, `CorrectionRuleRow`
- `app/api/charts/route.ts` — use `GameAccountSummary` instead of local `GameAccountRow`

### Step 2.3: Create `lib/constants.ts`

Consolidate shared constants:

```typescript
export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const DATE_STRING_SCHEMA = z.string().regex(DATE_REGEX);
```

Update `data-import-client.tsx`, `data-table-client.tsx`, and `lib/api/validation.ts` to import from here.

### Step 2.4: Consolidate RANK_LABELS, ROLE_LABELS, and formatters

`app/admin/admin-types.ts` is already the canonical source. Update:

- `app/components/sidebar-shell.tsx` — remove local `RANK_LABELS`, `RANK_ORDER`, `formatRank`; import from `admin-types.ts`
- `app/members/members-client.tsx` — remove local `RANK_ORDER`; derive from `rankOptions` in `admin-types.ts`
- `app/profile/page.tsx` — remove local `formatRole`; import from `admin-types.ts`

### Step 2.5: Consolidate utility functions

- `app/profile/page.tsx` — replace inline `buildFallbackUserDb` logic with import from `admin-types.ts`
- `app/settings/settings-client.tsx` — same
- `app/events/events-utils.ts` — replace `toDateKey()` with `toDateString()` from `lib/dashboard-utils.ts` (identical logic)
- Rename `formatNumber` in `lib/dashboard-utils.ts` to `formatCompactNumber` to avoid confusion with `formatNumber` in `chart-components.tsx`

**Estimated reduction:** ~150 lines across 12+ files.

---

## Phase 3: Promote Admin Hooks & Components to Shared (COMPLETED)

**Goal:** Make `usePagination`, `PaginationBar`, `useSortable`, `SortableColumnHeader` available project-wide.

### Step 3.1: Move hooks to `lib/hooks/`

Move (with re-exports from old locations for backward compat):

- `app/admin/hooks/use-pagination.ts` → `lib/hooks/use-pagination.ts`
- `app/admin/hooks/use-sortable.ts` → `lib/hooks/use-sortable.ts`

Leave re-export stubs in `app/admin/hooks/` so existing admin code doesn't break.

### Step 3.2: Move components to `app/components/`

Move (with re-exports from old locations):

- `app/admin/components/pagination-bar.tsx` → `app/components/pagination-bar.tsx`
- `app/admin/components/sortable-column-header.tsx` → `app/components/sortable-column-header.tsx`

### Step 3.3: Update `PaginationBar` i18n

Currently `PaginationBar` hardcodes `useTranslations("admin")` and accesses `admin.common.pageSize`, etc. Refactor to accept a `translations` namespace prop or move pagination keys to `common` namespace.

Add pagination keys to `common` in `messages/en.json` and `messages/de.json`:

```json
"common": {
  "pageSize": "Per page",
  "showing": "Showing",
  "of": "of",
  "page": "Page",
  "previousPage": "Previous page",
  "nextPage": "Next page"
}
```

### Step 3.4: Update all admin tab imports

Update existing admin consumers to import from new locations (or use the re-export stubs).

**Estimated reduction:** ~0 net lines (restructure), but enables Phase 4.

---

## Phase 4: Deduplicate data-import & data-table (COMPLETED)

**Goal:** Extract ~400+ shared lines from the two largest files in the project.

### Step 4.1: Create `lib/hooks/use-validation-correction-rules.ts`

Extract shared hook that:

- Loads validation rules and correction rules from Supabase
- Initializes `ValidationEvaluator` and `CorrectionApplicator`
- Computes `playerSuggestions`, `sourceSuggestions`, `chestSuggestions` from valid rules
- Returns `{ validationRules, correctionRules, evaluator, applicator, suggestions, isLoading }`

Currently duplicated in:

- `data-import-client.tsx` (~lines 296–420)
- `data-table-client.tsx` (~lines 160–340)

### Step 4.2: Create shared rule modals

Extract from both files into `app/components/`:

- `AddCorrectionRuleModal` — the "add correction rule" form modal (~70 lines each)
- `AddValidationRuleModal` — the "add validation rule" form modal (~60 lines each)
- `BatchEditModal` — the batch edit form with preview table (~90 lines each)

### Step 4.3: Replace inline pagination in both files

Replace inline pagination UI in both files with `usePagination` + `PaginationBar` from Phase 3.

### Step 4.4: Replace inline sort buttons in both files

Replace `renderSortButton` / `renderImportSortButton` with `useSortable` + `SortableColumnHeader` from Phase 3.

### Step 4.5: Extract shared filter state

Create `lib/hooks/use-chest-entry-filters.ts`:

- Manages filter state: `filterPlayer`, `filterSource`, `filterChest`, `filterClan`, `filterDateFrom`, `filterDateTo`, `filterScoreMin`, `filterScoreMax`, `filterRowStatus`, `filterCorrectionStatus`
- Provides `resetFilters()` and `setFilterWithPageReset()` helpers

**Estimated reduction:** ~400 lines across 2 files.

---

## Phase 5: Deduplicate Pagination & Sorting Across Remaining Pages (COMPLETED)

**Goal:** Replace inline pagination in news and forum; replace inline loading/empty states everywhere.

### Step 5.1: Replace news-client pagination

Replace inline pagination in `app/news/news-client.tsx` (~38 lines) with `usePagination` + `PaginationBar`.

**Note:** News uses server-side pagination (Supabase `.range()`), so `usePagination` may need a `serverSide` mode or the component simply uses `PaginationBar` with manual state. Evaluate and adapt.

### Step 5.2: Replace forum pagination

Replace inline pagination in `app/forum/forum-post-list.tsx` (~27 lines) with `PaginationBar`.

### Step 5.3: Create shared `DataState` component

Create `app/components/data-state.tsx`:

```typescript
interface DataStateProps {
  readonly isLoading: boolean;
  readonly error?: string | null;
  readonly isEmpty?: boolean;
  readonly emptyMessage?: string;
  readonly onRetry?: () => void;
  readonly children: React.ReactNode;
}
```

Renders loading skeleton, error banner (reusing CMS `ErrorBanner`), empty state, or children.

### Step 5.4: Replace inconsistent loading/empty states

Update these files to use `DataState`:

- `app/news/news-client.tsx`
- `app/events/events-client.tsx`
- `app/members/members-client.tsx`
- `app/charts/charts-client.tsx`
- `app/forum/forum-post-list.tsx`
- `app/dashboard-client.tsx`
- `app/messages/messages-client.tsx`

### Step 5.5: Consolidate i18n pagination/empty keys

Move pagination keys from `dataImport`, `dataTable`, `news`, `members` namespaces to `common`. Update all references.

Move empty-state keys (`noData`, `noDataAvailable`, `noRowsFound`, etc.) to `common`. Update all references.

**Estimated reduction:** ~200 lines across 8+ files.

---

## Phase 6: Consolidate Zod Schemas & Utility Cleanup (COMPLETED)

**Goal:** Clean up duplicate Zod schemas, utility functions, and test helpers.

### Step 6.1: Create `lib/api/schemas.ts`

Move shared schemas:

- `uuidSchema` (from `lib/api/validation.ts` — already exists)
- `dateStringSchema` (new — uses `DATE_REGEX` from `lib/constants.ts`)
- `SEND_MESSAGE_SCHEMA` (extract from `app/api/messages/route.ts`)
- `COMMIT_ROW_SCHEMA` base (shared between client and API)

Update API routes to import from `lib/api/schemas.ts` (or keep in `lib/api/validation.ts` and add to it).

### Step 6.2: Update `deduplicateOutgoing`

Export from a shared location (e.g. `lib/messages-utils.ts`). Import in both `app/api/messages/route.ts` and test file.

### Step 6.3: Fix permission tests

Update `tests/permissions-unit.spec.ts` to import `toRole`, `hasPermission`, `canDo`, `isAdmin` from `lib/permissions.ts` instead of redefining them locally.

### Step 6.4: Rename ambiguous `formatNumber`

- `lib/dashboard-utils.ts`: `formatNumber` → `formatCompactNumber`
- Update `app/dashboard-client.tsx` import
- `app/charts/chart-components.tsx`: keep as `formatNumber` (locale-aware, different purpose)

### Step 6.5: Consolidate date helpers

- `app/events/events-utils.ts`: replace `toDateKey()` with import of `toDateString()` from `lib/dashboard-utils.ts`
- `app/profile/game-account-manager.tsx`: use `formatLocalDateTime` from `lib/date-format.ts` instead of inline `toLocaleDateString`

**Estimated reduction:** ~80 lines across 8+ files.

---

## Phase 7: Modal & Form Pattern Cleanup (COMPLETED)

**Goal:** Reduce inline modal and form patterns across events, data views, and admin.

### Step 7.1: Create `app/components/confirm-modal.tsx`

Generalized confirmation modal:

```typescript
interface ConfirmModalProps {
  readonly isOpen: boolean;
  readonly title: string;
  readonly message: string | React.ReactNode;
  readonly variant?: "danger" | "warning" | "info";
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly confirmPhrase?: string; // For 2-step confirmation
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly isLoading?: boolean;
}
```

### Step 7.2: Migrate event modals

Update `app/events/event-modals.tsx` (`EventDeleteModal`, `TemplateDeleteModal`) to use `ConfirmModal`.

### Step 7.3: Migrate data-import and data-table modals

Replace inline confirmation modals in:

- `app/data-import/data-import-client.tsx` (commit warning modal)
- `app/data-table/data-table-client.tsx` (batch delete confirm)

### Step 7.4: (Optional) Create `FormModal` wrapper

If modals with forms are common enough, create:

```typescript
interface FormModalProps {
  readonly isOpen: boolean;
  readonly title: string;
  readonly onClose: () => void;
  readonly children: React.ReactNode;
  readonly actions?: React.ReactNode;
  readonly variant?: "default" | "wide";
}
```

Apply to rule modals, batch edit modals, and create-user/create-game-account modals in admin.

**Estimated reduction:** ~200 lines across 6+ files.

---

## Summary

| Phase     | Focus                            | Files Touched  | Est. Lines Saved       |
| --------- | -------------------------------- | -------------- | ---------------------- |
| 1         | API auth + Supabase client       | 35+            | ~200                   |
| 2         | Types, constants, utilities      | 12+            | ~150                   |
| 3         | Promote admin hooks/components   | 8+             | ~0 (enables Phase 4-5) |
| 4         | data-import + data-table dedup   | 5+             | ~400                   |
| 5         | Pagination, loading states, i18n | 10+            | ~200                   |
| 6         | Zod schemas, test helpers        | 8+             | ~80                    |
| 7         | Modals & forms                   | 6+             | ~200                   |
| **Total** |                                  | **~50+ files** | **~1,230 lines**       |

## Risk Mitigation

- **Phases 1-2** are low-risk (utility extraction, no UI changes).
- **Phase 3** is medium-risk (file moves with re-exports).
- **Phases 4-5** are higher-risk (refactoring the two largest client files). Run full E2E suite after each step.
- **Phases 6-7** are low-risk (cleanup and pattern normalization).
- If any phase introduces test failures, fix before proceeding.

## Dependencies

- Phase 3 must complete before Phase 4 (data-import/data-table need shared pagination/sorting).
- Phase 2 must complete before Phase 4 (shared types needed for extracted hooks).
- All other phases are sequential but logically independent.
