# Runbook

> Setup, operations, and troubleshooting. For architecture and code patterns see `ARCHITECTURE.md`.

## 1. Supabase Setup

1. Create a Supabase project.
2. Copy Project URL, anon key, and service role key from **Project Settings → API**.
3. Run migrations in order in the Supabase SQL Editor. All files in `Documentation/migrations/`:

```
supabase_chest_entries.sql              (base schema)
game_account_approval.sql
messages_v2.sql
messages_sender_delete.sql
messages_archive.sql
messages_broadcast_targeting.sql
messages_strip_quotes.sql
notifications.sql
event_recurrence.sql
event_organizer.sql
event_templates.sql
event_banner_url.sql
event_is_pinned.sql
forum_tables.sql
forum_storage.sql
forum_seed_categories.sql
forum_thread_linking.sql
forum_rls_permissions.sql
member_forum_delete_permission.sql
forum_comment_count_trigger.sql
profile_default_game_account.sql
shadow_membership.sql
member_directory_rls.sql
article_banner.sql
article_updated_by.sql
author_fk_constraints.sql
site_content.sql
site_list_items.sql
site_list_items_bulk_reorder.sql
cms_icons_bucket.sql                    (manual bucket creation — see file)
fix_broken_markdown.sql
roles_permissions_cleanup.sql
guest_role_permissions.sql
role_change_protection.sql
clans_delete_policy_fix.sql
design_system_tables.sql
design_system_render_type.sql
bug_reports.sql
bug_reports_v2.sql
bug_reports_v3.sql
drop_chest_data_tables.sql
data_pipeline_staging.sql
data_pipeline_production.sql
data_pipeline_validation.sql
data_pipeline_rls.sql
forum_atomic_score.sql
```

Legacy only (do not run on fresh setup): `messages.sql` (pre-v2 single-table model).

## 2. Local Environment

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=YOUR_PROJECT_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

# Optional
TURNSTILE_SECRET_KEY=...            # Cloudflare CAPTCHA for forgot-password
SENTRY_DSN=...                      # Error tracking
RESEND_API_KEY=re_xxxxx             # Bug report email notifications
RESEND_FROM_EMAIL=bugs@yourdomain.com
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

## 3. Install + Run

```bash
npm install
npm run dev        # http://localhost:3000
```

## 4. Auth Flow

- Register: `/auth/register` → confirm email → login → first-login redirect to `/profile` → create game account → admin assigns clan.
- Login: `/auth/login`
- Forgot password: `/auth/forgot` → `/auth/update`

Email templates (dual-theme: Outlook light + modern dark) are documented in `supabase-email-templates.md` and configured in **Supabase Dashboard → Authentication → Email Templates**.

## 5. Running Tests

### Unit Tests (Vitest)

```bash
npm run test:unit                        # Run all (222 test files, ~3400 tests)
npm run test:unit:watch                  # Watch mode
npm run test:unit:coverage               # Run with coverage report
npx vitest run lib/permissions.test.ts   # Specific file
```

**Test infrastructure** lives in `test/`:

- `test/mocks/` — reusable mocks (Supabase, next/headers, next/navigation, next-intl, Sentry, rate-limit)
- `test/helpers.ts` — `createTestRequest()`, `parseResponse()` for API route testing
- `test/utils.tsx` — `renderWithProviders()` for component testing with auth context
- `test/index.ts` — barrel export for all utilities

**Writing new tests:**

- API routes: use `createMockAuth()` + `vi.mock("@/lib/api/require-auth")`, mock Supabase queries with `createChainableMock()` + `setChainResult()`
- Components (`.test.tsx`): add `// @vitest-environment jsdom` at top of file, mock `next-intl`, `next/image`, `next/navigation` using shared mocks from `@/test`
- Always wrap state-changing user interactions in `await act(async () => { ... })` and verify with `waitFor()`

### E2E Tests (Playwright)

```bash
npx playwright test                      # All browsers
npx playwright test --project=chromium   # Chromium only (fastest)
npx playwright test tests/admin.spec.ts  # Specific spec
npx playwright test --ui                 # Interactive UI
```

**Test user setup:** Before first run, execute `Documentation/test-user-setup.sql` in Supabase SQL Editor. Creates 6 test roles (owner, admin, moderator, editor, member, guest). Password: `TestPassword123!`.

**Auth:** Tests use pre-authenticated `storageState` saved by `tests/auth.setup.ts`. No login round-trip per test.

**Key conventions:**

- Use `domcontentloaded` + explicit element waits (never `networkidle`)
- Use `waitForClanAccessResolution()` for clan-gate-dependent assertions
- API tests accept 429 alongside expected status codes
- Use regex alternation for i18n text matching (`/erstellen|create/i`)

### CI / Pre-commit

- **Husky pre-commit:** lint-staged (ESLint + Prettier) on staged files.
- **GitHub Actions:** `npm run lint`, `npm run type-check`, `npm run build`, Playwright tests.

## 6. Design System Asset Manager

Admin tool at `/design-system`.

### First-time setup

1. Run `design_system_tables.sql` + `design_system_render_type.sql` migrations.
2. Scan assets: `npx tsx scripts/scan-design-assets.ts`
3. Scan UI elements: `npx tsx scripts/scan-ui-elements.ts`
4. Open `/design-system` (admin login required).

Both scripts are idempotent (upsert on unique keys). Re-run after adding new assets or elements. Flags: `--dry-run`, `--skip-copy`, `--skip-db`.

## 7. Troubleshooting

| Problem                                       | Fix                                                                                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Data insert fails                             | Check RLS policies and membership                                                                                                     |
| User lookup fails                             | Verify `profiles` trigger ran on signup                                                                                               |
| Unexpected redirect                           | Confirm auth session in Supabase                                                                                                      |
| YouTube embeds blocked                        | Verify CSP headers in `next.config.js`                                                                                                |
| Forum category add/sort fails                 | Verify `/api/admin/forum-categories` route and service role key                                                                       |
| Admin tab loading indefinitely                | Check devtools network for chunk load errors (dynamic imports)                                                                        |
| `.next` cache causes stale behavior           | Delete `.next/` and restart `npm run dev`                                                                                             |
| `npm run lint` errors in `playwright-report/` | Remove generated Playwright artifacts before lint                                                                                     |
| API routes return HTML instead of JSON        | Verify `proxy.ts` skips auth redirect for `/api/` paths                                                                               |
| Bug screenshot upload fails                   | Verify `bug-screenshots` storage bucket exists (Supabase → Storage)                                                                   |
| Radix Select scrollbar missing after upgrade  | Check `!important` overrides in `app/styles/components.css` still counter Radix's injected styles                                     |
| Bug report categories empty                   | Re-run `bug_reports.sql` migration (seeds 5 defaults)                                                                                 |
| Data import not visible in `/analytics/daten` | Import requires admin role — verify user has owner/admin role in `user_roles`. Submission list is visible to all authenticated users. |
| Submission API returns empty list             | Ensure `data_pipeline_*.sql` migrations ran and RLS policies are active                                                               |
