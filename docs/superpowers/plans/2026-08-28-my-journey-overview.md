# My Journey Dashboard Overview — Plan

> **Status:** DRAFT — written 2026-08-28 at end of session, not yet brainstormed
> or approved. Resolve the "Open decisions" section with the user before
> executing. For agentic workers: use superpowers:subagent-driven-development
> once approved. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make `/dashboard` phase-aware. When only My Journey is on, the
overview answers "what do I do next?" for a solo student instead of showing a
Team Journey dashboard with one My Journey card bolted on. When Team Journey
is on, today's overview stays. Both on → both sections.

**Depends on:** Two Economies (`2026-08-27-two-economies.md`, shipped on
`develop` 2026-08-28, commits `0932db3..620476a`). Uses `platform_settings`,
`usePlatformSettings()`, `economyLabels()`, `get_live_my_journey_leaderboard_v1`,
the four `users` balance columns.

**Architecture:** `src/app/dashboard/page.tsx` becomes a thin shell that reads
journey settings and renders `<MyJourneyOverview/>` and/or
`<TeamJourneyOverview/>` (same pattern as the leaderboard split). One new RPC
`get_my_journey_overview_v1(p_user_id)` returns everything the My Journey
section needs in a single row. The Team section keeps
`get_dashboard_overview_v2` + `get_dashboard_action_items` unchanged.

---

## Open decisions (brainstorm first)

| # | Question | Default if undecided |
|---|---|---|
| D1 | **Credits visibility.** Credits currently have no sink. Show as subtitle on the XP card, hide entirely, or give them a job (e.g. convert to Team Points on team join)? | Subtitle on the XP card; no new sink in this plan. |
| D2 | **"Next up" ordering.** Which not-started task is recommended first? | Lowest `tasks.order_index`/creation order among *available* individual templates the student hasn't started; ties → oldest. Verify the column name in Task 1. |
| D3 | **Both journeys on.** Stack both sections, or collapse My Journey once the student has a team? | Stack; My Journey section collapsed (ShadCN `Collapsible`) when the user has an active team. |
| D4 | **Rank card when the board is empty/1 person.** Show `#1 of 1`? | Show "Rank #N of M" only when M ≥ 3; otherwise show the Achievements card in its slot. |
| D5 | **Recent activity depth.** | Last 5 individual transactions. |
| D6 | **Credits wording** — keep "My Journey Credits" everywhere (current). | Keep. |

---

## Global Constraints

- One consolidated RPC per section (dashboard-pages rule). No N+1 from the client.
- Economy rule: `transactions.activity_type = 'individual'` → My Journey. Never key on `team_id`/`points_type`.
- Labels only via `economyLabels()` — no bare "XP"/"Points"/"Credits".
- All copy student-facing: no phase/plan vocabulary ("solo preparation phase", "reporting starts once…"). Write as if a first-week student reads it.
- Admins see both sections regardless of settings. Students: settings-gated, never redirect from `/dashboard`.
- Guard semantics as elsewhere: render skeleton until settings settle; on settings error render under defaults, never blank.
- DB additive only; new RPC is `_v1`; no edits to existing RPCs (if one is needed, `_backup_vN` first).
- No DB-writing Vitest. Verify with `tsc`, eslint, `npm run build`, read-only SQL, ROLLBACK-wrapped probes.
- Prettier defaults; ShadCN only; files < ~200 lines (page shell < 150); `"use client"` only where needed; `retry: 0` + `onError` on mutations.
- Commit per task, no push.

---

### Task 1: Verify data prerequisites (read-only, no code)

- [ ] Confirm `tasks` has an ordering column for individual templates (`order_index`, `sort_order`, or fall back to `created_at`). Record the name for D2.
- [ ] Count `achievements where context = 'individual' and active = true`. If 0, flag to the user — the Achievements card and strip will be empty on day one.
- [ ] Count active individual task templates (`tasks where activity_type = 'individual' and active/visible`). If 0, flag — the "Next up" card will be empty.
- [ ] Confirm `get_user_tasks_visible` / `get_user_individual_tasks` return shapes (status vocabulary, `is_available`, `task_id`, `progress id`) — the RPC below mirrors their logic server-side.
- [ ] Record findings + D1–D6 answers at the top of this file, change Status to APPROVED.

---

### Task 2: `get_my_journey_overview_v1` (DB)

**Interface:** `get_my_journey_overview_v1(p_user_id uuid) returns jsonb`
(SECURITY DEFINER, `set search_path = public, pg_temp`; caller must be
`p_user_id` or admin — raise otherwise).

Returned object:

```jsonc
{
  "balances": { "my_journey_xp": 0, "my_journey_credits": 0 },
  "tasks": { "completed": 0, "total": 0 },            // visible individual tasks; completed = approved
  "achievements": { "completed": 0, "total": 0 },      // context = 'individual', active
  "rank": { "position": null, "total": 0 },            // from the same filter as get_live_my_journey_leaderboard_v1
  "in_progress": [ { "task_id", "progress_id", "title", "status", "started_at", "xp_reward", "points_reward" } ], // status in (in_progress, pending_review, rejected), max 3
  "next_up": { "task_id", "title", "xp_reward", "points_reward", "category" } | null, // D2 ordering
  "achievement_progress": [ { "achievement_id", "name", "completed_tasks", "total_tasks", "status" } ],
  "recent_activity": [ { "type", "description", "xp_change", "points_change", "created_at" } ] // activity_type = 'individual', last 5 (D5)
}
```

- [ ] **Step 1:** Write the migration `my_journey_overview_v1` with the function above. Reuse the exact visibility/status logic of `get_user_tasks_visible` (read its body via `pg_get_functiondef` first — do not invent a different notion of "visible").
- [ ] **Step 2:** `grant execute … to authenticated, service_role;` `revoke … from anon`.
- [ ] **Step 3: Probe (read-only):** `select get_my_journey_overview_v1('<admin id>')` as admin; as a student via `set_config('request.jwt.claims', …)` in a `begin … rollback`. Expect zero-safe output for a user with no ledger (Liga).
- [ ] **Step 4:** Regenerate `src/types/database.ts` (`npx supabase gen types …` → prettier). Diff must be additions only.

---

### Task 3: Dashboard shell + Team section extraction (app)

**Files:** Modify `src/app/dashboard/page.tsx` (→ shell, < 150 lines); Create
`src/components/dashboard/team-journey-overview.tsx` (move today's Team
content: stat cards, rank badge, action items, team progress, quick actions —
behaviour unchanged); Create `src/components/dashboard/overview-skeleton.tsx`
if the existing `StatsGridSkeleton` isn't enough.

- [ ] Shell: `usePlatformSettings()` + `useApp()`; `showMyJourney = myJourney || isAdmin`, `showTeamJourney = teamJourney || isAdmin`; render sections per D3; neither on → a single friendly Card ("Your dashboard will fill up once the programme starts.").
- [ ] `TeamJourneyOverview` is a pure move — `git diff` on the moved block should show only import/prop plumbing. Keep `get_dashboard_overview_v2` + `get_dashboard_action_items` queries inside it.
- [ ] Verify: tsc, eslint, `npm run build`; grep gate for bare labels unchanged.

---

### Task 4: `MyJourneyOverview` (app)

**Files:** Create `src/components/dashboard/my-journey-overview.tsx` (composition, < 150 lines), `src/components/dashboard/my-journey/stat-cards.tsx`, `continue-card.tsx`, `next-up-card.tsx`, `achievement-progress-strip.tsx`, `recent-activity-card.tsx`; `src/hooks/use-my-journey-overview.ts` (React Query, key `["dashboard","my-journey",userId]`, `enabled: !!userId`, staleTime 60s).

Layout (top → bottom):

1. **Stat row (4 `StatsCardComponent`):** `labels.xp` (subtitle per D1) · "Tasks completed `X of Y`" with `Progress` · "Achievements `X of Y`" · "Your rank `#N of M`" (D4 fallback). Links: XP/Tasks → `/dashboard/my-journey`; Achievements → `/dashboard/my-journey` (grid); Rank → `/dashboard/leaderboard`.
2. **Two-column row:** **Continue** (in-progress tasks with status badge + "Resume" → `/dashboard/my-journey/task/[progress_id]`; empty → "Pick your first task" → My Journey) | **Next up** (title, category, `+N labels.xp · +N labels.points`, "Start task" → My Journey page with the task preselected if the page supports a query param, else plain link; null → "You've started everything that's available — nice.").
3. **Achievement progress strip:** horizontal cards with completion bars; click → `/dashboard/my-journey?achievement=<id>` (add query-param selection to the My Journey page if absent — one small edit in `my-journey/page.tsx`).
4. **Recent activity:** last 5 individual transactions, formatted `+50 My Journey XP · Task title · 2 days ago`.

- [ ] All strings via `economyLabels("my_journey")`; copy reviewed against the student-facing rule.
- [ ] Empty states for every block (new student: 0 everywhere) — friendly, action-oriented.
- [ ] Verify: tsc, eslint, build; grep gate: `grep -rn '"XP"\|>XP<\| XP<\| XP\b\|Points\b\|Credits\b' src/components/dashboard/my-journey* --include=*.tsx | grep -v "labels\.\|economyLabels"` → no hits.

---

### Task 5: Both-on behaviour + admin view (app)

- [ ] D3: `Collapsible` around the My Journey section when the user has an active team (`teams_data.length > 0` from the Team query) — default collapsed, header shows XP + tasks summary so it's still glanceable.
- [ ] Admin: both sections always; My Journey section reads the admin's own row (fine — same as today's cards).
- [ ] Verify the four combinations render (student MJ-only / TJ-only / both / neither; admin) by temporarily flipping `platform_settings` inside a `begin … rollback` **is not possible from the browser** — instead unit-check the shell's branching with a tiny render test using mocked settings (no DB), or manual check on the preview with the real switch (flip back afterwards).

---

### Task 6: Verification + docs

- [ ] `npx tsc --noEmit`, eslint on touched files, `npm run seam-audit`, `npm run build`.
- [ ] Read-only SQL: RPC output for admin + Liga; no probe residue.
- [ ] Manual on develop preview (user): My Journey on / Team off as a student with ≥1 individual template.
- [ ] Docs: add a "Dashboard" section to `docs/documentation/economies.md` (sections, RPC, gating), update `docs/documentation/dashboard.md`, CLAUDE.md rollback line (migration name, `drop function` is the rollback — additive).

---

## Risks

| Risk | Mitigation |
|---|---|
| No individual templates/achievements at launch → empty dashboard | Task 1 flags counts; empty states designed, not accidental. |
| "Next up" ordering surprises staff | D2 decided explicitly; single `order by` in the RPC, easy to change. |
| Moving Team content regresses today's dashboard | Task 3 is a pure move with diff review; no logic changes. |
| Second RPC call on the page when both journeys are on | Acceptable: one per section; sections are independent. |

## Out of scope

Credits sink (D1 only decides visibility); automatic phase switching;
Team Journey overview redesign; onboarding tour re-enable (separate, small).
