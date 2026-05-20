# Transaction History — `/dashboard/transaction-history`

> A chronological audit log of every XP and Credits movement on the user's account.

## Purpose
The "where did my points come from / go to" page. It exists so members can verify their balances are correct, understand what behaviour earns them what, and spot anomalies (e.g. unexpected team-cost deductions). Linked to from both KPI cards on the dashboard home, so it is the natural drill-down when a number on the home page does not match a user's mental model. Used by any authenticated member who wants accountability for the gamification economy.

## What it does
- Reads the current user from `useApp()` and fetches the most recent 50 transactions via [`getUserTransactions(userId, 50)`](src/lib/data/users.ts), which selects from the `transactions` table joined to `teams`, `achievements`, and `revenue_streams` for human-readable context.
- Renders two summary cards at the top showing **Total XP** (`user.total_xp`) and **Total Credits** (`user.total_points`) — these come from the cached user profile, not the transaction list, so they reflect the global balance even if older history has been trimmed.
- Lists each transaction as a row with:
  - A typed icon: `task` → `CheckCircle`, `revenue` → `DollarSign`, `validation` → `Trophy`, `team_cost` → `Users`, default → `Star`.
  - A description either taken verbatim from `description` or fabricated from the joined relations (e.g. `Revenue from: <product_name>`, `Team cost for: <team_name>`).
  - Localised timestamp (`en-US`, short month, hour:minute).
  - XP and Credits delta badges — pink for positive (`#ff78c8`), destructive variant for negative — only shown when the change is non-zero.
  - A neutral outline badge with the transaction `type` capitalised and underscores replaced (e.g. `team_cost` → `team cost`).
- Empty state: rocket icon plus a CTA linking to `/dashboard/my-journey` so a brand-new user knows where to go to start earning.
- Loading: full [`TableSkeleton`](src/components/ui/table-skeleton.tsx) with 10 rows. Error: card with a Retry button calling React Query's `refetch()`.

## How it looks
Single-column layout inside the dashboard shell:
1. **Header** — `h1` "Transaction History" plus a muted lead line.
2. **Summary grid** — 1-col mobile, 2-col desktop, two compact `Card`s with metric + icon header.
3. **Recent Transactions** card — list of rows separated by border + rounded background. Each row uses a flex layout: left side icon-in-pill + description + timestamp; right side a horizontal stack of badges (XP, Credits, type). Rows fade and slide up via Framer Motion staggered by 30ms each.

Visual language is intentionally muted — black/white iconography (the `getTransactionColor` helper hard-codes `text-black dark:text-white` regardless of type) — with the brand pink reserved for positive deltas to draw the eye.

## Thought behind it
This page is the receipt drawer of the gamification economy. If users do not trust the numbers on the home page, the platform's whole motivational model collapses — so the design optimises for legibility and provenance over flair. Every row answers three questions: what happened, when, how much. Joining `revenue_streams`, `achievements`, and `teams` at query time means the row description is meaningful even when the `description` column is null — a defensive choice that traces back to migrations where some legacy rows were inserted without strings. Capping the list at 50 is a deliberate trade-off: it keeps the query cheap and the page snappy, on the bet that most users only care about recent context; if a user wanted deep history we would build a dedicated audit export, not slow this page down. Total XP and Credits come from the user profile (a single number) rather than `SUM(xp_change)` over the list because the profile values are the canonical balance — recomputing on the client would risk drift if any transactions are filtered out. The pink-for-positive / red-for-negative badge convention mirrors the rest of the dashboard, so the user does not need to relearn colour semantics here. There are deliberately no filters, search, or date pickers on this page: scope creep starts the moment we add a "filter by type" dropdown, and the 50-row cap means scanning is faster than filtering anyway.

## Wired-up bits
- **Page file:** [`src/app/dashboard/transaction-history/page.tsx`](src/app/dashboard/transaction-history/page.tsx)
- **Key components:** ShadCN [`Card`](src/components/ui/card.tsx), [`Badge`](src/components/ui/badge.tsx), [`Button`](src/components/ui/button.tsx), [`TableSkeleton`](src/components/ui/table-skeleton.tsx)
- **Hooks:** [`useApp()`](src/contexts/app-context.tsx), `useQuery` from TanStack Query (key `["transactions", user.id]`, gated by `enabled: !!user?.id`)
- **RPCs / API routes:** [`getUserTransactions`](src/lib/data/users.ts) re-exported via [`@/lib/database`](src/lib/database.ts) — direct Supabase select on `transactions` joined with `teams`, `achievements`, `revenue_streams`
- **Auth requirement:** authenticated (dashboard layout)
- **Notable types or schemas:** local `Transaction` interface (matches the joined select shape); transaction `type` values used: `task | revenue | validation | team_cost`
