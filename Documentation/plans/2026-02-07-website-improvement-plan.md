# TotalChiller Website Improvement Plan

**Date:** 2026-02-07
**Status:** Completed (Feb 2026)
**Starting audit score:** 43/100 (Grade F)
**Final audit score:** 84/100 (Grade B)
**Target score:** 85-90+ (Grade A-/B+)
**Estimated total effort:** 11-17 hours

---

## Audit Baseline

Audited with squirrelscan v0.0.32 and Playwright UI audit on 2026-02-07 against `http://127.0.0.1:3000`.

| Category             | Score | Status   |
| -------------------- | ----- | -------- |
| Core SEO             | 45    | Critical |
| Images               | 63    | High     |
| Accessibility        | 93    | Good     |
| Security             | 51    | High     |
| Performance          | 70    | Medium   |
| Crawlability         | 90    | Good     |
| E-E-A-T              | 53    | Medium   |
| Legal Compliance     | 44    | High     |
| Content              | 93    | Good     |
| Links                | 89    | Good     |
| Internationalization | 100   | Perfect  |
| Mobile               | 100   | Perfect  |
| URL Structure        | 100   | Perfect  |

**Playwright UI Audit:** No horizontal overflow or checkbox sizing anomalies on public pages. 10 of 14 routes redirect to `/home` (auth-gated), so authenticated audit is needed for full coverage.

**Summary:** 291 passed, 87 warnings, 35 errors.

---

## Batch 1: SEO Critical Fixes

**Score impact:** ~+20 points (Core SEO 45 → ~80+)
**Estimated effort:** 1-2 hours

### 1a. Page titles and meta descriptions

Add Next.js `metadata` exports to each route's `page.tsx`:

- `/home` (app/page.tsx or app/home redirect) — brand title + pitch description
- `/auth/login` — "Sign In - TotalChiller"
- `/auth/register` — "Create Account - TotalChiller"
- `/auth/forgot` — "Reset Password - TotalChiller"
- All authenticated routes — appropriate titles per feature

### 1b. Open Graph and Twitter Card tags

Extend metadata exports with `openGraph` and `twitter` objects:

- Default OG image (1200×630) with TotalChiller branding
- Per-page `og:title` and `og:description`
- `twitter:card: "summary_large_image"`

### 1c. Canonical URLs and charset

- Add `metadataBase` in root `layout.tsx` for canonical URL generation
- Verify `<meta charset="utf-8">` is in the document head (may be a Next.js head ordering issue)

### 1d. Sitemap

- Create `app/sitemap.ts` using Next.js built-in sitemap generation
- Include all public routes: `/home`, `/auth/login`, `/auth/register`, `/auth/forgot`, `/news`
- Optionally add `app/robots.ts` for robots.txt

---

## Batch 2: Image Optimization

**Score impact:** ~+15 points (Images 63 → ~90+, Performance +5-10)
**Estimated effort:** 2-3 hours

### 2a. Add alt text to all images

27 images flagged missing alt text:

- **Decorative images** (textures, borders, ornaments): `alt=""`
- **Meaningful images** (shields, banners, icons): descriptive alt text

Key files affected: shared layout components, auth page components, sidebar shell.

### 2b. Add width/height to all images

21 images missing explicit dimensions. Add `width` and `height` attributes to prevent Cumulative Layout Shift (CLS).

### 2c. Lazy-load below-fold images

18 below-fold images should get `loading="lazy"`. Above-fold LCP candidates should get `fetchpriority="high"`:

- `/assets/vip/back_left.png`
- `/assets/ui/components_shield_4.png`
- `/assets/vip/components_decor_7.png`

### 2d. Consider Next.js `<Image>` migration

Replace `<img>` tags with Next.js `<Image>` component where practical:

- Automatic dimensions, lazy loading, format conversion (WebP/AVIF), srcset
- Decorative/absolute-positioned images may need `fill` mode with sized containers
- Trade-off: more refactoring but solves all four sub-issues at once

---

## Batch 3: Security Hardening

**Score impact:** ~+10 points (Security 51 → ~80+)
**Estimated effort:** 1-2 hours

### 3a. Security headers via `next.config.js`

Add `headers()` function returning:

| Header                    | Value                                                          | Purpose               |
| ------------------------- | -------------------------------------------------------------- | --------------------- |
| `Content-Security-Policy` | Restrict script/style/image sources to own domain + known CDNs | Prevent XSS           |
| `X-Frame-Options`         | `DENY`                                                         | Prevent clickjacking  |
| `X-Content-Type-Options`  | `nosniff`                                                      | Prevent MIME sniffing |
| `Referrer-Policy`         | `strict-origin-when-cross-origin`                              | Control referrer info |
| `Permissions-Policy`      | Disable camera, microphone, geolocation                        | Reduce attack surface |

### 3b. CAPTCHA on forgot-password form

Add CAPTCHA to `/auth/forgot` to prevent automated abuse. Options:

- **Cloudflare Turnstile** (recommended — free, privacy-friendly)
- **hCaptcha** (alternative)
- **Rate limiting** on Supabase side (simpler but less visible protection)

### 3c. HTTPS verification for production

- Verify all internal links and asset references use relative URLs or `https://`
- No mixed-content risk when deployed to Vercel (HTTPS automatic)

---

## Batch 4: Accessibility Polish

**Score impact:** ~+5 points (Accessibility 93 → ~98+)
**Estimated effort:** 30-60 minutes

### 4a. Fix sidebar toggle label mismatch

The toggle button's visible text says "collapse" but `aria-label` says "toggle sidebar". Fix by making both match — e.g., remove `aria-label` and let visible text serve as accessible name, or update both to consistent wording.

**File:** `app/components/sidebar-shell.tsx`

### 4b. Fix color contrast issues

2 instances flagged:

- White text on unclear background
- Very light text color

Check specific elements in the Fortress Sanctum theme and bump contrast ratios to at least 4.5:1 for normal text, 3:1 for large text.

### 4c. Improve link text

Replace generic link text on auth pages:

| Current    | Improved                  |
| ---------- | ------------------------- |
| "login"    | "Sign in to your account" |
| "register" | "Create a new account"    |
| "sign in"  | "Sign in to your account" |

Or add `aria-label` attributes for screen reader context.

---

## Batch 5: E-E-A-T & Legal Compliance

**Score impact:** ~+15 points (E-E-A-T 53 → ~80+, Legal 44 → ~85+)
**Estimated effort:** 2-3 hours

### 5a. Privacy Policy page

Create `/privacy` with:

- What data is collected (email, game accounts, clan data)
- How data is stored (Supabase)
- Cookies used
- How users can request data deletion
- Add footer link visible on all pages

### 5b. About / Contact page

Create `/about` with:

- Description of TotalChiller (Total Battle clan management hub)
- Who it's for
- Contact method (email or Discord link)
- Satisfies both "about page" and "contact page" audit rules

### 5c. Content date signals

Add `datePublished` structured data (JSON-LD) to:

- `/news` posts (timestamps already in database)
- `/events` entries

Format: `<script type="application/ld+json">` in page head.

### 5d. Footer with legal links

Add minimal footer or sidebar bottom section with links to:

- Privacy Policy
- About
- Terms of Service (optional)

Creates internal linking the audit expects and makes legal pages discoverable.

---

## Batch 6: UI/UX Polish

**Score impact:** Qualitative — professional feel, user trust, first impressions
**Estimated effort:** 4-6 hours

### 6a. Auth page improvements

- Add visible H1 headings (e.g., "Enter the Sanctum")
- Add brief welcome message or feature highlights alongside forms
- Increase content word count (currently flagged as "thin content")
- Ensure the Fortress Sanctum theme makes a strong first impression

### 6b. Sidebar interaction polish

- Fix aria label mismatch (from Batch 4a)
- Refine collapse/expand animation (200-300ms, smooth transition)
- Collapsed state: icon-only navigation with tooltips

### 6c. Image loading experience

- Add skeleton placeholders or fade-in transitions for lazy-loaded images
- Decorative VIP assets benefit from subtle fade-in
- Prevent content pop-in after dimensions are set (Batch 2b)

### 6d. Dashboard widgets

Existing TODO from handoff docs:

- Personal stats card (score, rank, activity)
- Clan stats card (member count, recent activity, aggregate score)
- Surface key data on the main dashboard

### 6e. Toast and feedback consistency

- Audit all async operations for consistent loading/success/error states
- Ensure form submissions, data imports, admin actions all show feedback
- Align with UI/UX best practices (150-300ms transitions, clear error messages)

---

## Implementation Order

| Order | Batch                | Priority | Est. Hours |
| ----- | -------------------- | -------- | ---------- |
| 1     | SEO Critical Fixes   | Critical | 1-2h       |
| 2     | Image Optimization   | High     | 2-3h       |
| 3     | Security Hardening   | High     | 1-2h       |
| 4     | Accessibility Polish | Medium   | 0.5-1h     |
| 5     | E-E-A-T & Legal      | Medium   | 2-3h       |
| 6     | UI/UX Polish         | Medium   | 4-6h       |

**After each batch:** re-run squirrelscan audit to verify score improvement. Re-run Playwright UI audit (authenticated) after visual changes.

---

## Verification (Completed)

- [x] Squirrelscan score: 84/100 (Grade B) — up from 43/100
- [x] Playwright UI audit: no overflow, no checkbox anomalies
- [x] Authenticated Playwright audit covering all routes
- [x] All images have alt text and dimensions
- [x] All pages have titles, descriptions, OG tags
- [x] Security headers present on all responses
- [x] Privacy policy and about pages exist and are linked
- [x] Accessibility: axe-core audits passing
- [x] No color contrast failures
