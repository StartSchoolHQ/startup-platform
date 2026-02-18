## UX Improvements

### Add pagination to data tables

**Approach:** Page-based pagination with Prev/Next buttons + page indicator. Simple, consistent, no infinite scroll complexity.

**Data scale (as of 2026-02-18):** 450 transactions, 4,429 audit logs, 52 leaderboard users.

**Implementation order:** Transaction History → Audit Logs → Leaderboard (easiest to hardest, each builds on the pattern from the previous).

---

#### 1. Transaction History (simplest — start here)

- **Page:** `src/app/dashboard/transaction-history/page.tsx`
- **Data function:** `getUserTransactions()` in `src/lib/data/users.ts`
- **Current state:** Hardcoded `getUserTransactions(user!.id, 50)`. Function uses `.limit(limit)` — no offset.
- **Page size:** 20 transactions per page

**Backend changes:**
- Update `getUserTransactions(userId, limit, offset)` — add `offset` param (default 0)
- Replace `.limit(limit)` with `.range(offset, offset + limit - 1)` for proper pagination
- Add a `getUserTransactionCount(userId)` function that returns total count (for "Page X of Y")

**Frontend changes:**
- Add `page` state (starts at 1)
- Pass `offset = (page - 1) * PAGE_SIZE` to the query
- Include `page` in React Query `queryKey` so cache is per-page
- Add `keepPreviousData: true` to avoid flash when switching pages
- Add Prev/Next buttons + "Page X of Y" text below the transactions list
- Change title from "Recent Transactions" to "Transaction History" (it shows all now)

**Files touched:** 2 (`users.ts`, `transaction-history/page.tsx`)

---

#### 2. Admin Audit Logs (backend already ready)

- **Page:** `src/app/dashboard/admin/audit-logs/page.tsx`
- **Data source:** `get_audit_logs` RPC — **already accepts `p_offset`** ✅
- **Current state:** Hardcoded `p_limit: 100, p_offset: 0`. No total count returned.
- **Page size:** 50 logs per page

**Backend changes:**
- Create a lightweight `get_audit_logs_count` RPC (or add a `p_count_only` mode to existing RPC) that returns total matching rows. Needs to respect same filters (table, action, user, date range). This is needed for "Page X of Y".
- Alternative: use Supabase's `.head()` count or just show "Next →" without total (simpler).

**Frontend changes:**
- Add `page` state (starts at 1)
- Compute `p_offset = (page - 1) * PAGE_SIZE` in `fetchLogs`
- Reset `page` to 1 when filters change (in `handleReset` and `fetchLogs` triggered by Apply Filters)
- Add Prev/Next buttons below the logs list
- Update header from `({logs.length} records)` to `(Page X, showing ${logs.length} records)`
- Disable "Next" when `logs.length < PAGE_SIZE` (simple check, no count query needed)

**Files touched:** 1 (`audit-logs/page.tsx`), optionally 1 migration for count RPC

---

#### 3. Leaderboard (lowest priority — 52 users currently fits in one page)

- **Page:** `src/app/dashboard/leaderboard/page-client.tsx`
- **Data source:** `get_leaderboard_data` and `get_team_leaderboard_data` RPCs
- **Current state:** Both RPCs accept `p_limit` but **no `p_offset`**. Hardcoded `p_limit: 50`.
- **Page size:** 50 entries per page
- **Reality check:** With 52 users, we're barely over 1 page. This is future-proofing, not urgent.

**Backend changes:**
- Add `p_offset integer DEFAULT 0` parameter to both `get_leaderboard_data` and `get_team_leaderboard_data` RPCs
- Add `OFFSET p_offset` to the query in each function
- Also needs server-side component update in `src/app/dashboard/leaderboard/page.tsx` (SSR initial fetch)

**Frontend changes:**
- Add `page` state for individual and team tabs
- Pass `p_offset = (page - 1) * 50` to RPC calls
- Add Prev/Next below each table
- Disable Next when `results.length < p_limit`
- Reset page when switching weeks

**Files touched:** 1 frontend file + 2 DB migrations (one per RPC) + `leaderboard/page.tsx` (server component)

---

**Shared UI pattern (reuse across all 3):**
Create a small `<PaginationControls />` component in `src/components/ui/pagination-controls.tsx`:
```tsx
// Props: page, pageSize, itemCount, onPageChange, isLoading
// Renders: "← Prev | Page X | Next →"
// Disables Prev on page 1, disables Next when itemCount < pageSize
```
Build this during Transaction History (step 1), reuse in steps 2 and 3.


---

## Do Later (requires approval + execution plan)

### Switch notifications from polling to Supabase Realtime

- **File:** `src/hooks/use-task-notifications.ts`
- **Current:** Polls every 45 seconds via `refetchInterval: 45000`. Two queries (list + count) fire every 45s per connected user.
- **Goal:** Replace polling with a Supabase Realtime subscription on the `notifications` table filtered by `user_id`. Instant delivery, zero wasted requests.
- **What changes:**
  1. Replace `refetchInterval` with a Realtime channel subscription (`supabase.channel().on('postgres_changes', ...)`)
  2. On `INSERT` event, invalidate React Query cache (triggers re-fetch once, not on a timer)
  3. Add `useEffect` cleanup to unsubscribe on unmount
  4. Verify `SELECT` RLS policy exists on `notifications` table (required for Realtime)
- **What stays the same:** Notification center UI, mark-as-read mutations, all API routes that create notifications.
- **Effort:** ~1 hour. One file, one hook.
- **Prerequisite:** Supabase Pro plan (already have it). 500 concurrent connections, 5M messages/month — more than enough.
