# Code Quality & Optimization Plan

**Date:** 2026-02-11 (updated 2026-02-11 — security audit fixes applied)
**Scope:** Full codebase audit findings — error handling, performance, security, accessibility, code quality
**Branches from:** `design-test` at `71a19bf`

---

## Security Audit — Applied Fixes (2026-02-11)

Comprehensive audit via SquirrelScan (surface scan, score 51 → issues found) + deep code-level review of all 20 API routes, client-side code, and infrastructure config. The following fixes were applied:

### High Priority — Fixed

| Issue                                                                                                      | Severity | Fix                                                                                 | Files                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **XSS in markdown renderer** — `javascript:`, `vbscript:`, `data:` protocols in user-authored links/images | High     | Added `isSafeUrl()` gate blocking dangerous protocols in `<a href>` and `<img src>` | `app/components/markdown-renderers.tsx`                                                                                |
| **Open redirect in auth callback** — `next` query param not validated, allows `//evil.com`                 | High     | Added `isSafeRedirectPath()` requiring `/` prefix, blocking `//` and `:`            | `app/auth/callback/route.ts`                                                                                           |
| **Missing rate limiting on 7 API routes**                                                                  | High     | Added `standardLimiter` or `strictLimiter`                                          | `messages/[id]`, `notification-settings`, `notifications/[id]`, `notifications/fan-out`, `notifications/mark-all-read` |
| **Information leakage in 500 responses** — Supabase `error.message` exposed to clients                     | High     | Replaced with generic messages, log originals server-side via `console.error`       | 5 API route files                                                                                                      |
| **LIKE wildcard injection** — `%` and `_` in search input alter LIKE behavior                              | Medium   | Escape `%`, `_`, `\` before interpolation                                           | `messages/search-recipients/route.ts`                                                                                  |
| **Missing input validation** — `reference_id` and `clan_id` not validated as UUID                          | Medium   | Added `uuidSchema` check                                                            | `notifications/fan-out/route.ts`                                                                                       |

### Medium Priority — Fixed

| Issue                                                                            | Severity | Fix                                                                       | Files                           |
| -------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------- | ------------------------------- |
| **CSP missing Turnstile domains** — Cloudflare Turnstile blocked by CSP          | Medium   | Added `https://challenges.cloudflare.com` to `script-src` and `frame-src` | `next.config.js`                |
| **useEffect race conditions** — setState after unmount in 3 data-loading effects | Medium   | Added `cancelled` flag + cleanup return                                   | `app/events/use-events-data.ts` |
| **Cookie missing Secure flag** — locale cookie set without `secure` in proxy     | Medium   | Added `secure: process.env.NODE_ENV === "production"`                     | `proxy.ts`                      |

### Remaining (not yet fixed)

| Issue                                                                   | Severity | Notes                                                                       |
| ----------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------- |
| **CSP `'unsafe-inline'`** in `script-src` and `style-src`               | Low      | Would require nonce/hash; breaks dev; track for production hardening        |
| **ESLint security plugin** missing                                      | Low      | Add `eslint-plugin-security` for `no-eval`, `no-implied-eval`               |
| **Sentry breadcrumbs** — no `beforeBreadcrumb` to redact sensitive URLs | Low      | Add callback to filter auth/token URLs from breadcrumbs                     |
| **Client-set cookies** (`document.cookie`) cannot be `httpOnly`         | Info     | Expected browser limitation; non-sensitive cookies only                     |
| **SquirrelScan a11y** — `<select>` without label on all pages           | Low      | Likely Radix Select hidden element; RadixSelect already passes `aria-label` |

### SquirrelScan Report Summary (localhost, surface scan)

| Category        | Score  |
| --------------- | ------ |
| Overall         | 51 (F) |
| Accessibility   | 82     |
| Security        | 70     |
| Performance     | 74     |
| Content         | 69     |
| Images          | 95     |
| Links           | 87     |
| Crawlability    | 98     |
| Core SEO        | 95     |
| Structured Data | 100    |
| Mobile          | 100    |
| i18n            | 100    |

Note: Many performance/security issues are dev-mode artifacts (no HTTPS, unminified JS, source maps). Production scores will be significantly higher.

---

## Phase 1: Error Handling & Data Safety (Critical)

These issues cause silent failures, stuck loading states, or data loss.

### 1.1 Add try/catch to all async data loaders

Wrap every async data-fetching function in try/catch with a finally block that resets loading state. Surface errors to the user via toast or inline message.

**Files:**

- `app/messages/messages-client.tsx` — `loadMessages`
- `app/components/notification-bell.tsx` — `loadNotifications`, `loadPrefs`
- `app/profile/game-account-manager.tsx` — `refreshAccounts`
- `app/settings/settings-client.tsx` — `handleNotifToggle`, initial load
- `app/admin/forum-category-admin.tsx` — create/update/delete calls

**Pattern:**

```typescript
async function loadData(): Promise<void> {
  try {
    setIsLoading(true);
    // ... fetch logic
  } catch (err) {
    console.error("[loadData]", err);
    // show toast or set error state
  } finally {
    setIsLoading(false);
  }
}
```

### 1.2 Add Supabase error checks (~20 locations)

Every `.from().select()`, `.insert()`, `.update()`, `.delete()`, `.upsert()` must destructure and handle `error`.

**Files:**

- `app/forum/forum-client.tsx` — votes, posts, comments, pin, lock (~10 mutations)
- `app/members/members-client.tsx` — `loadClans`
- `app/profile/page.tsx` — profile, game accounts, memberships, upsert
- `app/api/game-accounts/route.ts` — profile update after insert
- `app/api/charts/route.ts` — `accountResult.error` unchecked
- `app/api/notifications/route.ts` — settings query
- `app/api/notification-settings/route.ts` — existing settings query
- `app/api/messages/route.ts` — notification insert in `after()`
- `app/api/messages/broadcast/route.ts` — notification insert
- `app/admin/admin-context.tsx` — `clanData`, `defClan`
- `app/data-table/data-table-client.tsx` — `loadClans`, `loadAllRules`
- `app/forum/forum-utils.ts` — `resolveAuthorNames`

### 1.3 Add query limits to unbounded queries

Prevent runaway result sets as data grows.

| File                                   | Query                           | Suggested limit          |
| -------------------------------------- | ------------------------------- | ------------------------ |
| `app/api/charts/route.ts`              | `chest_entries`                 | `.limit(10000)`          |
| `app/api/messages/broadcast/route.ts`  | `profiles` (all)                | `.limit(5000)`           |
| `app/forum/forum-client.tsx`           | `forum_comments`                | `.limit(500)` + paginate |
| `app/members/members-client.tsx`       | `game_account_clan_memberships` | `.limit(500)`            |
| `app/events/use-events-data.ts`        | `events`, `event_templates`     | `.limit(200)`            |
| `app/admin/admin-context.tsx`          | `clans`                         | `.limit(100)`            |
| `app/data-table/data-table-client.tsx` | `clans`, rules                  | `.limit(500)`            |

### 1.4 Batch mark-read endpoint for messages

Replace the N+1 loop in `messages-client.tsx` (lines 373-375) with a single batch API call.

**Steps:**

1. Add `PATCH /api/messages/mark-read` accepting `{ messageIds: string[] }`
2. Update `messages-client.tsx` to call the batch endpoint
3. Delete the per-message loop

---

## Phase 2: Performance Optimization (High Impact)

### 2.1 Stabilize Supabase browser client

Ensure `createSupabaseBrowserClient()` is called once per component mount, not every render.

**Pattern:** Replace `const supabase = createSupabaseBrowserClient()` with:

```typescript
const [supabase] = useState(() => createSupabaseBrowserClient());
```

**Files to update:** All client components that put `supabase` in `useEffect` dependencies:

- `app/dashboard-client.tsx`
- `app/messages/messages-client.tsx`
- `app/news/news-client.tsx`
- `app/forum/forum-client.tsx`
- `app/events/use-events-data.ts`
- `app/members/members-client.tsx`
- `app/charts/charts-client.tsx`
- `app/profile/game-account-manager.tsx`
- `app/components/notification-bell.tsx`
- `app/components/clan-access-gate.tsx`
- `app/components/sidebar-shell.tsx`
- `app/admin/admin-context.tsx`

### 2.2 Parallelize independent awaits

**`app/members/page.tsx`:**

```typescript
const [
  {
    data: { user },
  },
  t,
] = await Promise.all([supabase.auth.getUser(), getTranslations("members")]);
```

**`app/dashboard-client.tsx`:** Combine three `useEffect`s (announcements, events, stats) into one that fires when `clanId` changes and fetches all three with `Promise.all`.

**`app/events/use-events-data.ts`:** Combine events, templates, and game-accounts effects similarly.

### 2.3 Narrow `select("*")` to explicit columns

Reduce payload size and improve query performance.

| File                                 | Table              | Columns needed                                                                                       |
| ------------------------------------ | ------------------ | ---------------------------------------------------------------------------------------------------- |
| `app/forum/forum-client.tsx`         | `forum_categories` | `id, name, slug, sort_order`                                                                         |
| `app/forum/forum-client.tsx`         | `forum_posts`      | `id, title, content, author_id, category_id, score, is_pinned, is_locked, created_at, comment_count` |
| `app/forum/forum-client.tsx`         | `forum_comments`   | `id, post_id, author_id, content, score, parent_comment_id, created_at`                              |
| `app/events/use-events-data.ts`      | `event_templates`  | `id, name, description, default_*` fields                                                            |
| `app/events/use-events-data.ts`      | `events`           | explicit needed columns                                                                              |
| `app/admin/forum-category-admin.tsx` | `forum_categories` | `id, name, slug, sort_order`                                                                         |

### 2.4 Split large client components

Extract subcomponents from monolithic files for smaller bundles and better maintainability.

| File                                     | Size        | Extract into                                                             |
| ---------------------------------------- | ----------- | ------------------------------------------------------------------------ |
| `app/data-import/data-import-client.tsx` | ~2000 lines | `ImportPreview`, `ImportMapping`, `ImportProgress`, `ImportHistory`      |
| `app/data-table/data-table-client.tsx`   | ~1600 lines | `DataTableHeader`, `DataTableRow`, `DataTableFilters`, `BatchOperations` |
| `app/admin/tabs/users-tab.tsx`           | ~1400 lines | `UserRow`, `GameAccountEditor`, `CreateUserModal`                        |
| `app/admin/tabs/clans-tab.tsx`           | ~1300 lines | `ClanRow`, `MembershipEditor`, `CreateClanModal`                         |

---

## Phase 3: Code Quality & Safety (Medium)

### 3.1 Replace unsafe type assertions

Replace `as unknown as Array<Record<string, unknown>>` with typed interfaces for PostgREST join responses.

**Steps:**

1. Define types in `lib/types/supabase-joins.ts`:
   ```typescript
   interface ProfileJoin {
     readonly display_name: string | null;
     readonly username: string | null;
   }
   interface ArticleWithAuthor {
     // ... explicit fields
     author: ProfileJoin | null;
     editor: ProfileJoin | null;
   }
   ```
2. Update Supabase queries to use typed generics
3. Remove all `as unknown as` double casts

**Files:** `dashboard-client.tsx`, `news-client.tsx`, `members-client.tsx`, `sidebar-shell.tsx`, `clan-access-gate.tsx`, `notifications/fan-out/route.ts`, `messages/broadcast/route.ts`

### 3.2 Fix setTimeout memory leaks

Store timeout IDs in refs and clear them on unmount.

**Files:**

- `app/components/toast-provider.tsx` — store timeout IDs, clear on unmount
- `app/auth/update/page.tsx` — clear redirect timeout
- `app/profile/game-account-manager.tsx` — clear status reset timeout
- `app/settings/settings-client.tsx` — clear status reset timeout
- `app/events/event-calendar.tsx` — clear scroll timeout

**Pattern:**

```typescript
const timerRef = useRef<ReturnType<typeof setTimeout>>();
useEffect(() => () => clearTimeout(timerRef.current), []);
// then: timerRef.current = setTimeout(...);
```

### 3.3 Consolidate duplicate utilities

`extractAuthorName` / `extractName` exists in three places. Deduplicate.

| File                            | Action                            |
| ------------------------------- | --------------------------------- |
| `lib/dashboard-utils.ts`        | Keep as single source of truth    |
| `app/news/news-client.tsx`      | Import from `lib/dashboard-utils` |
| `app/events/use-events-data.ts` | Import from `lib/dashboard-utils` |

### 3.4 Security: service role for public endpoints

Review and restrict service role usage.

| File                                     | Issue             | Fix                                                            |
| ---------------------------------------- | ----------------- | -------------------------------------------------------------- |
| `app/api/site-content/route.ts` (GET)    | Uses service role | Switch to RLS-compliant server client                          |
| `app/api/site-list-items/route.ts` (GET) | Uses service role | Same                                                           |
| `app/api/notification-settings/route.ts` | No rate limiting  | ~~Add `standardLimiter`~~ **DONE** (2026-02-11 security audit) |

### 3.5 Batch reorder endpoint

`app/api/site-list-items/route.ts` (lines 203-209) runs N separate UPDATE queries in a loop for reordering. Replace with a single RPC or batched update.

---

## Phase 4: Accessibility & Polish (Low Priority)

### 4.1 Add aria-labels to icon-only buttons

~15 buttons across the codebase lack labels. Add `aria-label` to each.

**Files:** `news-client.tsx`, `event-calendar.tsx`, `notification-bell.tsx`, `auth-actions.tsx`, `forum/markdown-toolbar.tsx`, `admin/components/sortable-column-header.tsx`, `admin/components/danger-confirm-modal.tsx`, `redesign/preview/page.tsx`

### 4.2 Fix modal backdrop keyboard support

`app/redesign/preview/page.tsx` — `<div onClick>` for modal backdrop needs `role="button"`, `tabIndex={0}`, and `onKeyDown` handler (or use `<dialog>`).

### 4.3 Add descriptive alt text to content images

| File                               | Fix                              |
| ---------------------------------- | -------------------------------- |
| `app/news/news-client.tsx`         | `alt={article.title}` for banner |
| `app/components/editable-list.tsx` | `alt={"Icon for " + item.label}` |
| `app/forum/forum-icons.tsx`        | `alt="Post thumbnail"`           |

### 4.4 Replace `<img>` with `next/image`

Where applicable in `news-client.tsx` (banner preview), `markdown-renderers.tsx`, `forum-icons.tsx`, `editable-list.tsx`.

### 4.5 Convert PageTopBar to Server Component

`app/components/page-top-bar.tsx` uses `"use client"` but has no hooks, state, or browser APIs. Remove the directive.

---

## Execution Order

| Order | Phase   | Tasks                       | Est. effort      |
| ----- | ------- | --------------------------- | ---------------- |
| 1     | 1.1     | try/catch on async loaders  | Small            |
| 2     | 1.2     | Supabase error checks       | Medium           |
| 3     | 1.3     | Query limits                | Small            |
| 4     | 1.4     | Batch mark-read endpoint    | Small            |
| 5     | 2.1     | Stabilize Supabase client   | Small            |
| 6     | 2.2     | Parallelize awaits          | Small            |
| 7     | 3.2     | Fix setTimeout leaks        | Small            |
| 8     | 3.3     | Consolidate duplicate utils | Small            |
| 9     | 2.3     | Narrow select columns       | Medium           |
| 10    | 3.1     | Typed PostgREST joins       | Medium           |
| 11    | 3.4     | Security fixes              | Small            |
| 12    | 3.5     | Batch reorder endpoint      | Small            |
| 13    | 4.1-4.5 | Accessibility & polish      | Medium           |
| 14    | 2.4     | Split large components      | Large (optional) |

---

## Out of Scope

- SEO improvements (per project rule)
- UI redesign (tracked separately in `2026-02-11-total-battle-ui-redesign.md`)
- Forum PostgREST join refactor (tracked in `solution_overview.md`)
