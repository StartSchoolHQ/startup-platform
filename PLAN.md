## UX Improvements

### Add pagination to data tables
- **Affected pages:**
  - Leaderboard — capped at 50 entries, no "load more"
  - Admin audit logs — capped at 100, no pagination controls
  - Transaction history — capped at 50, no way to see older transactions
- **Approach:** Add page-based or infinite scroll pagination. Start with transaction history (simplest) as a pattern, then apply to others.


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
