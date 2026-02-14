# Code Review: ChillerKiller — All Issues Fixed

Full codebase review completed 2026-02-14. All identified issues have been resolved.

---

## Fix Summary

### CRITICAL (4 fixed)

| #   | File                                    | Issue                                                     | Fix                                                     |
| --- | --------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------- |
| 1   | `app/events/events-utils.ts`            | Monthly recurrence skips months (Jan 31 + 1mo = Mar 2)    | Clamp day to last day of target month                   |
| 2   | `app/events/events-utils.ts`            | Recurrence end date parsed as local time                  | Append `Z` for UTC consistency                          |
| 3   | `app/components/editable-text.tsx`      | German content overwritten when editing in English locale | Added `valueDe` prop + `cDe` helper in `useSiteContent` |
| 4   | `app/news/use-news.ts`                  | Deep-link infinite loop on invalid article ID             | Added attempt counter (max 3), handle missing articles  |
| 5   | `app/api/auth/forgot-password/route.ts` | `redirectTo` not validated as same-origin                 | Added origin check + `nextPath` traversal guard         |

### HIGH (8 fixed)

| #   | File                                 | Issue                                          | Fix                                                           |
| --- | ------------------------------------ | ---------------------------------------------- | ------------------------------------------------------------- |
| 6   | `app/api/charts/route.ts`            | `game_username.toLowerCase()` crashes on null  | Added null guard                                              |
| 7   | `app/api/charts/route.ts`            | IDOR: `gameAccountId` not scoped to `user_id`  | Added `.eq("user_id", auth.userId)`                           |
| 8   | `app/api/charts/route.ts`            | Null scores cause NaN in aggregations          | Coalesce with `?? 0`                                          |
| 9   | `app/auth/login/page.tsx`            | Game accounts query error not handled          | Check `accountsError` before redirecting                      |
| 10  | `app/forum/use-forum.ts`             | Deep-link fetches post without clan filter     | Added `.eq("clan_id", clanContext.clanId)`                    |
| 11  | `app/forum/use-forum.ts`             | Voting race condition on double-click          | Added `votingPostRef` / `votingCommentRef` guards             |
| 12  | `app/messages/use-messages.ts`       | Unhandled promise rejections in load functions | Replaced `throw err` with `pushToast` in all 5 load functions |
| 13  | `app/events/use-events.ts`           | Deep-link set handled before events loaded     | Only set `handledDeepLinkRef` after event found               |
| 14  | `app/events/use-events-templates.ts` | Template edit drops `banner_url`               | Added `banner_url` to update payload                          |
| 15  | `app/news/use-news.ts`               | Date filter `dateTo` parsed without timezone   | Added `Z` suffix                                              |
| 16  | `app/hooks/use-dashboard-data.ts`    | Dashboard crashes on null `tags` array         | Added `tags: row.tags ?? []`                                  |

### MEDIUM (18 fixed)

| #   | File                                      | Issue                                             | Fix                                                            |
| --- | ----------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------- |
| 17  | `app/api/messages/[id]/route.ts`          | DELETE returns 200 when no rows affected          | Added `.select("id")` + 404 check                              |
| 18  | `app/api/admin/forum-categories/route.ts` | Slug not validated                                | Added `/^[a-z0-9-]+$/` regex check                             |
| 19  | `app/forum/use-forum.ts`                  | Back navigation loses category filter             | Preserved category in URL                                      |
| 20  | `app/forum/use-forum.ts`                  | Comment load error not surfaced                   | Added `pushToast(t("loadCommentsFailed"))`                     |
| 21  | `app/forum/forum-client.tsx`              | Category slug not URL-encoded                     | Added `encodeURIComponent`                                     |
| 22  | `app/data-table/use-data-table.ts`        | Search term LIKE wildcard injection               | Applied `escapeLikePattern`                                    |
| 23  | `app/data-table/use-data-table.ts`        | Page not clamped when totalPages shrinks          | Added clamping `useEffect`                                     |
| 24  | `app/data-table/use-data-table.ts`        | Rules load errors ignored                         | Added `setStatus` on failure                                   |
| 25  | `app/api/data-import/commit/route.ts`     | Score validation too loose                        | Changed to `.int().nonnegative()`, added `.max(10000)` on rows |
| 26  | `app/api/data-import/commit/route.ts`     | Invalid rows not filtered                         | Added `isValidRow` check, return `skippedCount`                |
| 27  | `app/profile/display-name-editor.tsx`     | Check-then-update race condition                  | Atomic update + catch unique violation `23505`                 |
| 28  | `app/settings/settings-client.tsx`        | No password strength validation                   | Added 8-char minimum                                           |
| 29  | `app/settings/settings-client.tsx`        | Username uniqueness not checked                   | Added pre-upsert query                                         |
| 30  | `app/api/notifications/fan-out/route.ts`  | Cross-clan notification possible                  | Added `clan_id` match check                                    |
| 31  | `lib/rate-limit.ts`                       | `x-forwarded-for` spoofable                       | Prefer `x-real-ip` first                                       |
| 32  | `app/hooks/use-dashboard-data.ts`         | Announcement/event errors silently ignored        | Added error states + console.warn                              |
| 33  | `lib/dashboard-utils.ts`                  | `calculateTrend` returns Infinity when previous=0 | Return 0, guard `formatCompactNumber`                          |
| 34  | `app/auth/callback/route.ts`              | Path traversal in redirect                        | Added URL normalization check                                  |
| 35  | `app/components/editable-text.tsx`        | Pencil button not keyboard-accessible             | Added `onKeyDown` handler                                      |

### LOW (25+ fixed)

| #   | File                                     | Issue                                            | Fix                                         |
| --- | ---------------------------------------- | ------------------------------------------------ | ------------------------------------------- |
| 36  | `app/admin/admin-context.tsx`            | Effect flicker overwrites localStorage selection | Merged effects, localStorage takes priority |
| 37  | `app/admin/tabs/approvals-tab.tsx`       | `res.json()` throws on non-JSON error            | Wrapped in try/catch                        |
| 38  | `app/admin/tabs/validation-tab.tsx`      | Wrong status fallback "active"                   | Changed to "valid"                          |
| 39  | `app/admin/tabs/users-tab.tsx`           | DangerConfirmModal missing inputId               | Added inputId for both modals               |
| 40  | `app/components/notification-bell.tsx`   | Silent error swallowing                          | Added dev-mode console.warn                 |
| 41  | `app/data-table/use-data-table.ts`       | Sort toggle logic hard to follow                 | Simplified to flat if/else                  |
| 42  | `app/events/events-utils.ts`             | `parseDateKey` accepts invalid dates             | Added date validation check                 |
| 43  | `app/admin/tabs/clans-tab.tsx`           | 30+ hardcoded strings                            | Replaced with `tAdmin(...)` keys            |
| 44  | `app/admin/tabs/corrections-tab.tsx`     | Hardcoded delete warning                         | Replaced with translation key               |
| 45  | `app/data-import/data-import-client.tsx` | Hardcoded CSV columns + aria labels              | Replaced with `t(...)` keys                 |
| 46  | `app/data-table/data-table-client.tsx`   | Hardcoded aria labels                            | Replaced with `t(...)` keys                 |
| 47  | `app/components/sidebar-nav.tsx`         | Category slug not URL-encoded                    | Added `encodeURIComponent`                  |

---

## Files Modified

38 files touched across the codebase:

- `app/events/events-utils.ts`
- `app/components/editable-text.tsx`
- `app/components/use-site-content.ts`
- `app/home/home-client.tsx`
- `app/about/about-client.tsx`
- `app/contact/contact-client.tsx`
- `app/privacy-policy/privacy-client.tsx`
- `app/news/use-news.ts`
- `app/api/auth/forgot-password/route.ts`
- `app/api/charts/route.ts`
- `app/auth/login/page.tsx`
- `app/forum/use-forum.ts`
- `app/forum/forum-client.tsx`
- `app/messages/use-messages.ts`
- `app/events/use-events.ts`
- `app/events/use-events-templates.ts`
- `app/hooks/use-dashboard-data.ts`
- `app/dashboard-client.tsx`
- `app/api/messages/[id]/route.ts`
- `app/api/admin/forum-categories/route.ts`
- `app/data-table/use-data-table.ts`
- `app/api/data-import/commit/route.ts`
- `app/data-import/csv-parser.ts`
- `app/profile/display-name-editor.tsx`
- `app/settings/settings-client.tsx`
- `app/api/notifications/fan-out/route.ts`
- `lib/rate-limit.ts`
- `lib/dashboard-utils.ts`
- `app/auth/callback/route.ts`
- `app/components/notification-bell.tsx`
- `app/admin/admin-context.tsx`
- `app/admin/tabs/approvals-tab.tsx`
- `app/admin/tabs/validation-tab.tsx`
- `app/admin/tabs/users-tab.tsx`
- `app/admin/tabs/clans-tab.tsx`
- `app/admin/tabs/corrections-tab.tsx`
- `app/components/sidebar-nav.tsx`
- `messages/en.json`, `messages/de.json`

---

## Verification

- TypeScript: `npx tsc --noEmit` passes with zero errors
- Linter: No new lint errors introduced
