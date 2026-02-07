# Runbook (Setup + Usage)

This runbook explains how to set up, run, and use the [THC] Chiller & Killer community platform.

## 1) Supabase Setup
1. Create a Supabase project.
2. Go to **Project Settings → API** and copy:
   - Project URL
   - anon public key
   - service role key
3. In Supabase SQL Editor, run in order:
   - `Documentation/supabase_chest_entries.sql` (base schema)
   - `Documentation/migrations/game_account_approval.sql`
   - `Documentation/migrations/messages.sql`
   - `Documentation/migrations/notifications.sql`
   - `Documentation/migrations/event_recurrence.sql`
   - `Documentation/migrations/event_organizer.sql`
   - `Documentation/migrations/event_templates.sql`
   - `Documentation/migrations/forum_tables.sql`
   - `Documentation/migrations/forum_storage.sql`
   - `Documentation/migrations/forum_seed_categories.sql`
   - `Documentation/migrations/profile_default_game_account.sql`
   - `Documentation/migrations/article_banner.sql`
   - `Documentation/migrations/article_updated_by.sql`

## 2) Local Environment
Create `.env.local` in the project root:
```
NEXT_PUBLIC_SUPABASE_URL=YOUR_PROJECT_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

## 3) Install + Run
```
npm install
npm run dev
```
Open: `http://localhost:3000`

## 4) Auth Flow
- Register: `/auth/register`
- Login: `/auth/login`
- Forgot password: `/auth/forgot`
- Update password: `/auth/update`

## 5) Routing Behavior
- Unauthenticated `/` redirects to `/home`
- Authenticated `/home` redirects to `/`

## 6) Core Pages
- Public Home: `/home`
- Dashboard: `/`
- Announcements: `/news`
- Forum: `/forum`
- Charts (Truhenauswertung): `/charts`
- Events (Event-Kalender): `/events`
- Messages: `/messages`
- Profile: `/profile`
- Settings: `/settings`
- Admin: `/admin`
- Data Import: `/admin/data-import`
- Chest Database: `/admin/data-table`

## 7) Data Import Workflow
1. Go to `/admin/data-import`
2. Upload a Pattern 1 CSV (DATE, PLAYER, SOURCE, CHEST, SCORE, CLAN)
3. Optional: toggle **Auto-correct** and **Validation**
4. Use filters/sorting or batch edit if needed
5. Click **Commit Data** (warning modal appears if invalid rows exist)

## 8) Admin: Clans + Memberships
1. Go to `/admin`
2. Create a clan
3. Add members by **user_id** or **email**
4. Assign role and active status

## 9) Admin: Rules
In `/admin`:
- Create/edit/delete validation rules (global)
- Create/edit/delete correction rules (global, active/inactive)
- Create/edit/delete scoring rules (per clan)

## 10) Admin: Forum Categories
In `/admin` → Forum tab:
- Create/edit/delete forum categories
- Reorder categories via up/down buttons

## 11) Chest Database
In `/admin/data-table`:
- Inline edit rows and save
- Batch edit/delete
- Search + filters + pagination
- Per-row correction/validation rule actions

## 12) Announcements
In `/news`:
- Create announcements with banner images (6 templates + custom upload)
- Rich markdown editor with image upload (paste/drag-drop)
- Content supports formatting, images, videos, links
- Pinned announcements appear at top
- Edit tracking: original author is preserved, editor tracked separately

## 13) Forum
In `/forum`:
- Browse by category
- Create posts with rich markdown editor
- Comment/reply with voting
- Pin important posts (content managers only)
- Post thumbnails extracted from content

## 14) Events
In `/events`:
- Create single or recurring events (daily/weekly/biweekly/monthly)
- Use templates for common event types
- Calendar view with day-detail panel (auto-scrolls on day click)
- Optional organizer field

## 15) Troubleshooting
- If data insert fails: check RLS policies and membership
- If user lookup fails: verify `profiles` trigger ran on signup
- If page redirects unexpectedly: confirm auth session in Supabase
- If YouTube embeds are blocked: verify CSP headers in `next.config.js`
- If forum category add/sort fails: verify `/api/admin/forum-categories` route and service role key
- If announcement banner not saving: verify `banner_url` column exists in articles table

