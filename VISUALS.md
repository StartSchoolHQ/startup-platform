# VISUALS.md — UX/UI Audit Report

> Generated: 2026-02-24 | Status: Analysis only, no changes made

---

## Global Issues (Affects All Pages)

### 1. No Standardized Page Header
- Title sizes vary: `text-2xl` on some pages, `text-3xl` on others
- Subtitle styles inconsistent (some `text-muted-foreground`, some inline)
- Spacing between header and content differs per page (`space-y-4` vs `space-y-6`)
- **Fix:** Create a shared `PageHeader` component with consistent title/subtitle/spacing

### 2. Hardcoded Brand Color
- `bg-[#ff78c8]` / `text-[#ff78c8]` appears inline across ~10 files
- Files: `account/page.tsx`, `team-journey/page.tsx`, `my-journey/page.tsx`, `login/page.tsx`, `hero-landing.tsx`
- **Fix:** Move to CSS variable (e.g., `--brand-pink`) in Tailwind config

### 3. No Error Boundaries Per Page
- Only one generic `ErrorBoundary` exists (`src/components/error-boundary.tsx`) — shows "Something went wrong" + reload
- No Sentry integration in the boundary
- Most pages silently fail if React Query fetches error out
- **Fix:** Add page-level error boundaries with retry buttons and Sentry reporting

### 4. Inconsistent Data Fetching Patterns
- Dashboard/journey pages use React Query (good)
- Admin tables use manual `useEffect + setState` (outdated, no cache invalidation)
- **Fix:** Migrate admin tables to React Query for consistency

### 5. Page Padding Inconsistency
- Some pages: `flex-1 space-y-4 p-4 pt-6 md:p-8`
- Others: `p-8` directly
- Others: `container mx-auto`
- **Fix:** Standardize on one padding pattern via layout or shared wrapper

---

## Page-by-Page Analysis

---

### `/` — Landing Page (`src/app/page.tsx`, 135 lines) DONE

**Loading:** Plain white spinner (`border-gray-900`) + "Processing invitation..." when handling invite tokens. Completely different styling from the hero landing.

**What's Wrong:**
- Invite processing spinner is unstyled (gray on white) while hero has premium dark theme with particles
- No smooth transition between loading overlay and hero content
- Spinner color (`border-gray-900`) doesn't match brand

**What's Good:**
- Hero landing (`hero-landing.tsx`) has rich Framer Motion animations, gradient blobs, floating particles
- Professional visual feel on the landing itself

**Needs Updating:**
- [ ] Match invite processing spinner to brand theme (dark bg + pink spinner)
- [ ] Add fade transition between loading and hero
- [ ] Fix hero CTA button contrast — black text on `#ff78c8` pink is hard to read, should be white
- [ ] Reduce hero stagger animation total duration (currently ~1.6s feels slow)

---

### `/login` — Login Page (`src/app/login/page.tsx`, 302 lines) DONE

**Loading:** Good. Spinner + "Signing in..." text. Button pulses during load. Input opacity reduces.

**What's Wrong:**
- No inline field validation — errors only show after submit
- Staggered field animations (0.3s, 0.4s, 0.5s delays) feel slow for returning users
- Forgot password link is `text-sm` with no hover underline — easy to miss
- Error auto-dismisses after 5s — user might miss it

**What's Good:**
- Shake animation on error message — clear visual feedback
- Gradient shine effect on button hover
- Dark themed, well-branded
- Framer Motion throughout

**Needs Updating:**
- [ ] Add inline email format validation (show error while typing)
- [ ] Speed up stagger animations (~0.15s delays instead of 0.3s+)
- [ ] Add hover underline to forgot password link
- [ ] Don't auto-dismiss errors — let user dismiss manually

---

### `/auth/reset-password` (`src/app/auth/reset-password/page.tsx`, 197 lines) DONE

**Loading:** Good. Full-screen "Validating access..." with spinner while checking token. Button shows "Updating Password..." during submit.

**What's Wrong:**
- No password strength meter (profile/setup page HAS one — inconsistent)
- Button uses gradient (`#ff78c8` to `#b24ef7`) while login uses solid pink — different styles
- Error message height animation shifts content below
- Error border opacity (`red-500/20`) is more subtle than login page (`red-500/30`)

**What's Good:**
- Smooth entrance animation matching login
- Proper validation state blocking form until token verified

**Needs Updating:**
- [ ] Add `PasswordInput` with strength meter (already exists in codebase)
- [ ] Match button style to login page (solid pink, not gradient)
- [ ] Match error border opacity to login page

---

### `/auth/invite` (`src/app/auth/invite/page.tsx`, 174 lines) DONE

**Loading:** Spinner + "Processing your invitation..." — but on WHITE background, not dark theme.

**What's Wrong:**
- **White background** — completely different from login/reset dark theme. User goes dark login -> white invite -> dark dashboard. Jarring.
- Spinner changes from pink (`#ff78c8`) during processing to GREEN (`border-green-600`) during redirect — no semantic reason
- No Framer Motion animations — instant state swaps
- Error page uses gray text on white — unbranded

**What's Good:**
- Has three clear states (processing, redirecting, error)
- Error state has recovery button ("Go to Login")

**Needs Updating:**
- [ ] Match dark theme from login page
- [ ] Use consistent pink spinner color for all states
- [ ] Add fade transitions between states
- [ ] Brand the error state with proper styling

---

### `/invite` (`src/app/invite/page.tsx`, 61 lines) DONE

**What's Wrong:**
- **Appears to be a redundant page** — nearly identical purpose to `/auth/invite`
- Plain gray spinner (`border-gray-900`), no brand colors
- No error handling — redirects silently on failure
- No timeout protection — could show spinner forever
- White background, completely unbranded

**Needs Updating:**
- [ ] Consider consolidating with `/auth/invite` (remove duplication)
- [ ] If kept, match theme and spinner to other auth pages

---

### `/profile/setup` (`src/app/profile/setup/page.tsx`, 324 lines) DONE

**Loading:** Spinner + "Validating access..." while checking token. Submit shows "Setting up your profile..."

**What's Wrong:**
- White background — doesn't match dark auth theme
- No spinner icon on submit button (login/reset pages HAVE spinners)
- Error appears without animation — causes layout shift
- Avatar section has variable height depending on upload state

**What's Good:**
- Has password strength meter with requirements checklist
- Proper validation with `bg-destructive` semantic colors
- Name field auto-disables if prefilled

**Needs Updating:**
- [ ] Match dark theme from login
- [ ] Add spinner icon to submit button
- [ ] Animate error appearance (fade + height transition)
- [ ] Reserve space for avatar section to prevent shift

---

### `/dashboard` — Main Dashboard (`src/app/dashboard/page.tsx`, 342 lines) DONE

**Loading:** "Hi {firstName}" renders, then `StatsGridSkeleton` + two generic `animate-pulse` boxes (`h-64`).

**What's Wrong:**
- Generic pulse boxes don't match actual two-column layout — content pops in
- No error handling — if queries fail, page goes blank with no feedback
- No error state UI at all
- "No team" state is just text — no icon or action button

**What's Good:**
- Stats cards have Framer Motion spring animations with stagger
- `StatsGridSkeleton` exists and is used
- Username renders during loading (no header shift)

**Needs Updating:**
- [ ] Replace generic pulse boxes with layout-matching skeletons (two-column grid)
- [ ] Add error state with retry button for failed queries
- [ ] Add `onError` handlers to React Query calls
- [ ] Improve "no team" empty state — add icon + "Join a team" action

---

### `/dashboard/account` (`src/app/dashboard/account/page.tsx`, 419 lines) DONE

**Loading:** Plain "Loading..." text centered. No skeleton whatsoever.

**What's Wrong:**
- **Worst loading state in the app** — just text, no visual feedback
- Error shows red text "Failed to load user profile" — no icon, no retry button
- No skeleton for form layout, tabs, or avatar section
- No animations on any element
- Uses hardcoded `text-blue-600` link color instead of design tokens

**What's Good:**
- Inline validation with red borders on form fields
- Tab organization (Profile, Security, Preferences)

**Needs Updating:**
- [ ] Add proper skeleton matching form layout (avatar + fields + tabs)
- [ ] Add error state with icon + retry button
- [ ] Add subtle entrance animations for form sections
- [ ] Replace hardcoded `text-blue-600` with theme variable

---

### `/dashboard/invitations` (`src/app/dashboard/invitations/page.tsx`, 459 lines) DONE

**Loading:** "Loading invitations..." text in a `h-64` empty container. No card skeletons.

**What's Wrong:**
- Loading heading is `text-2xl` but rendered heading is `text-3xl` — **visible size jump on load**
- No skeleton for invitation cards — they slam in when loaded
- Tab counts change dynamically (e.g., "Pending (3)") — shifts tab widths
- No error handling if invitation queries fail
- No animations on cards or tab switches

**What's Good:**
- Excellent empty states with icons (`Inbox`, `Send`), headings, descriptions
- Clean card layout for invitations

**Needs Updating:**
- [ ] Match loading heading size to rendered heading (`text-3xl`)
- [ ] Add card skeleton grid matching invitation card layout
- [ ] Add error state for failed queries
- [ ] Add stagger animation on invitation cards
- [ ] Consider fixed-width tabs to prevent count-based shifting

---

### `/dashboard/my-journey` (`src/app/dashboard/my-journey/page.tsx`, 850 lines) NOT TOUCHING

**Loading:** Skeleton grid for stats cards (best of dashboard pages). But "Loading achievements..." and "Loading tasks..." are just text.

**What's Wrong:**
- Stats skeleton exists but tab content below has NO skeleton — content pops in
- Achievement filter banner appears/disappears causing layout shift
- No error handling — failed query = infinite "Loading..." text forever
- No Framer Motion animations on achievements or tasks
- Title is `text-3xl` but section titles vary (`text-xl`, `text-lg`) — inconsistent hierarchy

**What's Good:**
- Stats card skeletons with proper grid layout
- Achievement cards have hover scale effect (`hover:scale-[1.02]`)
- Good empty states for achievements and tasks
- Color-coded achievement status (purple=completed, orange=in-progress)

**Needs Updating:**
- [ ] Add skeleton for tab content (achievement grid + task table)
- [ ] Add error states with retry for failed queries
- [ ] Add Framer Motion stagger on achievement cards
- [ ] Fix filter banner layout shift (use opacity/visibility instead of conditional render)
- [ ] Standardize section title sizes

---

### `/dashboard/peer-review` (`src/app/dashboard/peer-review/page.tsx`, 1069 lines) DONE

**Loading:** Spinner icon + "Loading available tasks..." text per tab. Stats show "..." placeholder.

**What's Wrong:**
- No table skeleton — tables pop in when data loads
- Alert messages (success/error) appear at top and auto-dismiss after 4s — shifts content below
- No animations on tab content transitions
- File is 1069 lines — largest page, could use component extraction

**What's Good:**
- Uses `InlineAlert` component — best error handling pattern in the app
- Consistent empty states across all 4 tabs
- Stats cards use dedicated `StatsCardComponent`
- Duplicate submission prevention in review form

**Needs Updating:**
- [ ] Add `TableSkeleton` for each tab's table
- [ ] Reserve space for alert messages (don't shift content when they appear)
- [ ] Add fade animation on tab content switch
- [ ] Consider extracting tab content into separate components

---

### `/dashboard/team-journey` (`src/app/dashboard/team-journey/page.tsx`, 372 lines)

**Loading:** Uses `TeamListSkeleton` — one of the better implementations.

**What's Wrong:**
- Full-page skeleton swap causes layout shift (controls bar disappears during loading)
- No error states — silent failure if queries fail
- No animations on product cards
- `TabsList` has fixed width `w-[380px]` — could break on mobile
- Search/sort have fixed widths (`w-64`, `w-[100px]`) — brittle

**What's Good:**
- **Best empty states in the app** — `EmptyState` component with icon, title, description, action buttons
- Context-aware empty messages ("No Products Yet" vs "No Products Found")
- `min-h-[600px]` on content area prevents some vertical shifts

**Needs Updating:**
- [ ] Keep controls visible during loading (only skeleton the card grid area)
- [ ] Add error state UI
- [ ] Add stagger animation on product cards
- [ ] Make TabsList width responsive
- [ ] Make search/sort widths responsive

---

### `/dashboard/leaderboard` (`src/app/dashboard/leaderboard/page-client.tsx`, 859 lines)

**Loading:** Framer Motion fade-in skeletons. Server-side data fetch with 60s cache.

**What's Wrong:**
- No error state UI — if server fetch fails, no fallback
- Minor padding inconsistency: header rows `p-3` vs data rows `p-4`
- Streaks section shows "Loading streaks..." text (no skeleton)

**What's Good:**
- **Best animated page in the app** — Framer Motion layout animations for rank reordering
- `useCountUp` hook for number animations
- Spring physics on row transitions
- Server-side data = no client loading flash
- Top 3 rows have gradient backgrounds — clear visual hierarchy
- Proper `LeaderboardSkeleton` component
- Motion-animated empty states

**Needs Updating:**
- [ ] Add error boundary/fallback for server fetch failure
- [ ] Fix header/data row padding inconsistency
- [ ] Add skeleton for streaks section

---

### `/dashboard/transaction-history` (`src/app/dashboard/transaction-history/page.tsx`, 224 lines)

**Loading:** Heading + "Loading..." message + `TableSkeleton rows={10} columns={6}`. Better than most.

**What's Wrong:**
- No error handling — if fetch fails, nothing shown
- No animations on transaction list
- Empty state has no action button (e.g., "Start completing tasks")

**What's Good:**
- Uses `TableSkeleton` component — proper skeleton
- Consistent heading size during loading and rendered state (`text-2xl`)
- Clean summary card layout

**Needs Updating:**
- [ ] Add error state with retry
- [ ] Add action button to empty state
- [ ] Add subtle entrance animation on transaction rows

---

### `/dashboard/support` (`src/app/dashboard/support/page.tsx`, 541 lines)

**Loading:** No page-level loading. Form renders immediately. User info fields show "Loading..." text.

**What's Wrong:**
- No skeleton for form layout
- User info fields flash "Loading..." before populating — visible text pop
- Uses `bg-gray-50` and `border-gray-200` hardcoded — not dark-mode safe

**What's Good:**
- **Best error handling in dashboard** — specific messages for 429/503 status codes
- Alert with icon for validation errors
- Submit button shows spinner during submission

**Needs Updating:**
- [ ] Add form skeleton while user data loads
- [ ] Replace hardcoded gray colors with theme tokens (dark-mode safe)
- [ ] Pre-fill user fields server-side to avoid text flash

---

### `/dashboard/admin` (`src/app/dashboard/admin/page.tsx`, 125 lines)

**Loading:** Uses `<AdminSkeleton />` component.

**What's Wrong:**
- `AdminOverview` loads after skeleton clears — potential shift
- All admin sub-tables (users, tasks, teams) show "Loading..." text instead of skeletons
- Admin tables use manual `useEffect + setState` instead of React Query
- No error states if data fetching fails
- No animations anywhere in admin section

**What's Good:**
- Card hover transitions (`transition-shadow hover:shadow-lg`)
- Clean grid layout for admin sections
- `AdminSkeleton` component exists

**Needs Updating:**
- [ ] Add `TableSkeleton` to all admin table components
- [ ] Migrate admin data fetching to React Query
- [ ] Add error states to admin tables
- [ ] Add subtle card entrance animations

---

## Auth Flow Theme Consistency

| Page | Background | Animations | Brand Feel |
|------|-----------|------------|------------|
| `/login` | Dark (`#0000dd`) | Rich Framer Motion | Premium |
| `/auth/reset-password` | Dark (matching) | Smooth | Premium |
| `/auth/invite-expired` | Dark blue + particles | Smooth | Premium |
| `/auth/invite` | **White** | **None** | **Basic** |
| `/invite` | **White** | **None** | **Unbranded** |
| `/profile/setup` | **White** | **None** | **Functional only** |

Users experience: Dark login -> White invite processing -> White profile setup -> Dark dashboard. Visual whiplash.

**Fix:** Apply dark theme + brand styling to invite and profile setup pages.

---

## Priority Matrix

### P0 — Critical (Causes crashes or major layout shifts)
1. Add error states to `/dashboard`, `/my-journey`, `/team-journey`, `/transaction-history`
2. Wire up existing skeleton components to pages showing "Loading..." text
3. Fix loading/rendered heading size mismatch on `/invitations`

### P1 — High (Visual consistency)
4. Create shared `PageHeader` component (standardize titles, spacing)
5. Standardize page padding across all dashboard pages
6. Replace all hardcoded `#ff78c8` with CSS variable
7. Migrate admin tables to React Query
8. Unify auth flow theme (dark on invite + profile setup pages)

### P2 — Medium (Polish)
9. Add Framer Motion stagger to remaining 8 dashboard pages
10. Add tab switch fade animations
11. Add password strength meter to reset-password page
12. Enhance ErrorBoundary with Sentry + better UI
13. Add action buttons to empty states that lack them

### P3 — Nice to Have
14. Reduce hero landing animation duration (1.6s -> 0.6s)
15. Add inline field validation to login
16. Fix hero CTA button contrast (black text on pink -> white)
17. Animate notification badge on new notification
