# Test Suite Design — TotalChiller

**Date:** 2026-02-09  
**Status:** Implemented

## Overview

Comprehensive Playwright test suite covering all functionality of the TotalChiller webapp. Tests are organized by feature area, following Vercel/Next.js best practices for testing React applications.

## Architecture

```
tests/
├── helpers/
│   └── auth.ts              # Shared login helper, test user config
├── smoke.spec.ts             # Page load & redirect checks (no auth)
├── auth.spec.ts              # Auth flows: login, register, forgot, update
├── navigation.spec.ts        # Sidebar links, page transitions, redirects
├── api-endpoints.spec.ts     # API contract: status codes, response shapes
├── cms-pages.spec.ts         # CMS pages: public view + admin editing
├── cms-api.spec.ts           # CMS API endpoints (pre-existing)
├── cms-components.spec.ts    # CMS component rendering (pre-existing)
├── cms-markdown.spec.ts      # Markdown rendering (pre-existing)
├── cms-public-view.spec.ts   # CMS public visibility (pre-existing)
├── cms-responsive.spec.ts    # Responsive layout (pre-existing)
├── news.spec.ts              # News/Articles: list, CRUD, permissions
├── events.spec.ts            # Events: calendar, CRUD, templates
├── forum.spec.ts             # Forum: posts, comments, voting, moderation
├── messages.spec.ts          # Messages: inbox, compose, send, broadcast
├── profile-settings.spec.ts  # Profile & Settings: forms, toggles
├── charts.spec.ts            # Charts: filters, visualizations
├── dashboard.spec.ts         # Dashboard: authenticated landing
├── admin.spec.ts             # Admin panel: tabs, CRUD, data import/table
├── permissions-unit.spec.ts  # Unit tests for lib/permissions.ts (pre-existing)
└── roles-permissions.spec.ts # E2E role-based access tests (pre-existing)
```

## Test Categories

### 1. Smoke Tests (smoke.spec.ts)

- **Purpose:** Verify every page loads without JS errors
- **Auth:** None required
- **Count:** ~18 tests
- Checks: public pages render, protected pages redirect unauthenticated, admin pages redirect

### 2. Auth Flow Tests (auth.spec.ts)

- **Purpose:** Validate login, register, forgot password forms
- **Auth:** None (tests the forms themselves)
- **Count:** ~12 tests
- Checks: form fields render, validation works, links between auth pages, error display

### 3. Navigation Tests (navigation.spec.ts)

- **Purpose:** Verify sidebar navigation, link behavior, access control
- **Auth:** Mixed (public + authenticated)
- **Count:** ~7 tests
- Checks: public links work, sidebar renders for members, admin link visibility

### 4. API Endpoint Tests (api-endpoints.spec.ts)

- **Purpose:** Validate API contracts — status codes and response shapes
- **Auth:** None (tests unauthenticated behavior)
- **Count:** ~18 tests
- Checks: CMS endpoints, charts, messages, notifications, admin, game accounts, data import

### 5. CMS Pages Tests (cms-pages.spec.ts)

- **Purpose:** Verify CMS content on home, about, contact, privacy policy
- **Auth:** Mixed (public view + admin editing)
- **Count:** ~13 tests
- Checks: content renders, no edit buttons for public, edit buttons for admin

### 6. News Tests (news.spec.ts)

- **Purpose:** News/articles page functionality
- **Auth:** Authenticated (editor, member, guest roles)
- **Count:** ~6 tests
- Checks: page loads, permission-based create button, article form

### 7. Events Tests (events.spec.ts)

- **Purpose:** Events/calendar functionality
- **Auth:** Authenticated (editor, member roles)
- **Count:** ~6 tests
- Checks: page loads, calendar navigation, create button permissions

### 8. Forum Tests (forum.spec.ts)

- **Purpose:** Forum posts, comments, moderation
- **Auth:** Authenticated (member, guest, moderator)
- **Count:** ~7 tests
- Checks: page loads, sort controls, search, create post permissions, moderation

### 9. Messages Tests (messages.spec.ts)

- **Purpose:** Messaging system
- **Auth:** Authenticated (member, moderator)
- **Count:** ~6 tests
- Checks: page loads, compose, broadcast permissions, type filters

### 10. Profile & Settings Tests (profile-settings.spec.ts)

- **Purpose:** Profile display and settings forms
- **Auth:** Authenticated (member, admin)
- **Count:** ~14 tests
- Checks: profile info, game accounts, settings fields, notification toggles, username admin-only

### 11. Charts Tests (charts.spec.ts)

- **Purpose:** Data visualization page
- **Auth:** Authenticated (member)
- **Count:** ~6 tests
- Checks: page loads, filters, chart rendering

### 12. Dashboard Tests (dashboard.spec.ts)

- **Purpose:** Authenticated landing page
- **Auth:** Authenticated (member)
- **Count:** ~3 tests
- Checks: page loads, content visible, no JS errors

### 13. Admin Tests (admin.spec.ts)

- **Purpose:** Admin panel functionality
- **Auth:** Authenticated (owner, admin, moderator, member)
- **Count:** ~15 tests
- Checks: access control, tab navigation, clans, users, data import/table

### 14. Permission Unit Tests (permissions-unit.spec.ts) — Pre-existing

- **Count:** 87 tests
- Checks: role definitions, normalization, permission matrix

### 15. Role-Based Access E2E (roles-permissions.spec.ts) — Pre-existing

- **Count:** ~8 tests
- Checks: admin panel access, content management buttons, profile access

## Test User Setup

Tests requiring authentication need 6 test users in Supabase:

| Email                   | Role      | Password         |
| ----------------------- | --------- | ---------------- |
| test-owner@example.com  | owner     | TestPassword123! |
| test-admin@example.com  | admin     | TestPassword123! |
| test-mod@example.com    | moderator | TestPassword123! |
| test-editor@example.com | editor    | TestPassword123! |
| test-member@example.com | member    | TestPassword123! |
| test-guest@example.com  | guest     | TestPassword123! |

See `Documentation/test-user-setup.sql` for setup instructions.

## Running Tests

```bash
# All tests
npx playwright test

# Specific test file
npx playwright test tests/smoke.spec.ts

# With visible browser
npx playwright test --headed

# Generate HTML report
npx playwright test --reporter=html
```

Set `PLAYWRIGHT_BASE_URL` if the dev server runs on a non-default port:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3001 npx playwright test
```

## Coverage Summary

| Area                 | Tests    | Auth Required |
| -------------------- | -------- | ------------- |
| Smoke / Page Load    | 18       | No            |
| Authentication Forms | 12       | No            |
| Navigation           | 7        | Mixed         |
| API Endpoints        | 18       | No            |
| CMS Pages            | 13       | Mixed         |
| CMS (pre-existing)   | ~25      | No            |
| News                 | 6        | Yes           |
| Events               | 6        | Yes           |
| Forum                | 7        | Yes           |
| Messages             | 6        | Yes           |
| Profile & Settings   | 14       | Yes           |
| Charts               | 6        | Yes           |
| Dashboard            | 3        | Yes           |
| Admin Panel          | 15       | Yes           |
| Permissions Unit     | 87       | No            |
| Role-based E2E       | 8        | Yes           |
| **Total**            | **~251** |               |

## Design Decisions

1. **No test data mutation:** Tests verify UI rendering and permission guards, never create/delete production data
2. **Resilient selectors:** Use `#id`, `.class`, and `text=` selectors; `.first()` for ambiguous matches
3. **Graceful API checks:** Unauthenticated API tests accept both 200 (empty data) and 401 responses
4. **Port flexibility:** Base URL is configurable via `PLAYWRIGHT_BASE_URL` env var
5. **Parallel-safe:** Tests are fully parallel (no shared state between tests)
