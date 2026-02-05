# Runbook (Setup + Usage)

This runbook explains how to set up, run, and use the current project.

## 1) Supabase Setup
1. Create a Supabase project.
2. Go to **Project Settings → API** and copy:
   - Project URL
   - anon public key
3. In Supabase SQL Editor, run:
   - `Documentation/supabase_chest_entries.sql`

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
- Admin: `/admin`
- Data Import: `/data-import`
- Data Table: `/data-table`
- Profile: `/profile`
- Settings: `/settings`

## 7) Data Import Workflow
1. Go to `/data-import`
2. Upload a Pattern 1 CSV (DATE, PLAYER, SOURCE, CHEST, SCORE, CLAN)
3. Optional: toggle **Apply Corrections** and **Apply Scoring**
4. Review preview + diff
5. Click **Commit Data** (uses admin API with service role)

## 8) Admin: Clans + Memberships
1. Go to `/admin`
2. Create a clan
3. Add members by **user_id** or **email**
4. Assign role and active status

## 9) Admin: Rules
In `/admin`:
- Create/edit/delete validation rules
- Correction/scoring rules are present but will be refactored (validation-only lists)

## 10) Data Table
In `/data-table`:
- Inline edit rows and save
- Batch update source
- Batch delete
- Search + pagination

## 11) Troubleshooting
- If data insert fails: check RLS policies and membership
- If user lookup fails: verify `profiles` trigger ran on signup
- If page redirects unexpectedly: confirm auth session in Supabase

