# Team Journey — `/dashboard/team-journey`

> Browse every startup team on the platform, jump into your own, or spin up a new one.

## Purpose

This is the team directory. Where `/dashboard/my-journey` is the user's
personal arc, `team-journey` is the catalogue of products/teams. Any
authenticated user lands here to see what other teams are building, find
their own teams, or kick off a new product. It is the entry point into
every team-level workflow — tasks, weekly reports, client meetings,
strikes — that lives one route deeper.

## What it does

- Three URL-synced tabs: **All Teams**, **My Teams**, **Archive**. The
  active tab is reflected in `?tab=` so a tab is shareable and the back
  button works.
- Debounced search (300 ms) over team name and description.
- Sort by **Name** (A→Z) or **Status** — but the user's own teams are
  always pinned to the top regardless of sort.
- "Add Product" button opens [`CreateTeamDialog`](../../../src/components/dashboard/create-team-dialog.tsx)
  to create a new team; on success the page invalidates the
  `["teamJourney"]` query family and the new card appears.
- Every team renders as a [`ProductCard`](../../../src/components/team-journey/product-card.tsx)
  in a 1/2/3-column responsive grid; clicking a card routes to
  `/dashboard/team-journey/[id]`.
- Empty states differ per tab: "No Products Yet" with an Add CTA on
  My Teams, plain message on All Teams, separate copy for Archive.
- Search-aware empty states show a "Clear Search" action.

## How it looks

- Animated `h1` that swaps text per tab ("All Teams" / "My Teams" /
  "Archive").
- A controls row pinned next to the tab list: search input with leading
  icon, sort `Select`, and a pink (`#ff78c8`) "Add Product" button.
- Card grid below with skeleton loaders while each tab's query loads
  (six placeholder cards mirroring the real `ProductCard` layout).
- Cards stagger in with a 50 ms-per-index Framer Motion fade.
- Tab content reserves a `min-h-[600px]` so layout does not collapse on
  short result sets.

## Thought behind it

The platform was renamed Products → Teams (commit
[c8679b8](../../../)) but the underlying entity stayed the same — that's
why query keys, internal types, the dialog, and even the empty-state
copy still talk about "products" while the headings say "Teams." The
mismatch is intentional during the rename, not a bug.

The page leans hard on **discoverability**: every team is visible to
every user by default. That's a deliberate accelerator-culture choice
— teams should learn from each other, not silo. The "View Only" badge
on the detail page (and the pin-my-teams-first sort here) is what keeps
that openness from becoming noise: you see everyone, but yours are
always at the top.

Three separate React Queries (`all`, `my`, `archived`) instead of one
big payload because each tab has a distinct cache lifecycle and admin
visibility may differ. Per-tab loading gates avoid the flash of the
wrong tab's skeleton when switching.

## Wired-up bits

- **Page file:** [`src/app/dashboard/team-journey/page.tsx`](../../../src/app/dashboard/team-journey/page.tsx)
- **Key components:**
  - [`ProductCard`](../../../src/components/team-journey/product-card.tsx)
  - [`CreateTeamDialog`](../../../src/components/dashboard/create-team-dialog.tsx)
  - [`EmptyState`](../../../src/components/ui/empty-state.tsx)
  - ShadCN `Tabs`, `Select`, `Input`, `Skeleton`, `Card`
- **Hooks:** [`useAppContext`](../../../src/contexts/app-context.tsx),
  TanStack Query (`useQuery`, `useQueryClient`),
  `useSearchParams` / `useRouter` for the URL-synced tab.
- **Data layer (from `@/lib/database`):**
  - `getAllTeamsForJourney(userId, { status: "all" })`
  - `getUserTeamsForJourney(userId, { status: "all" })`
  - `getArchivedTeamsForJourney(userId, {})`
  - `transformTeamToProduct(team, userId)` — maps a `DatabaseTeam` to
    the UI `Product` shape including `isCurrentUserMember`.
- **Auth requirement:** authenticated. Middleware redirects
  unauthenticated users from `/dashboard/**` to `/login`.
- **Notable types:** [`Product`](../../../src/types/team-journey.ts),
  `DatabaseTeam` (re-exported from `@/lib/database`).
