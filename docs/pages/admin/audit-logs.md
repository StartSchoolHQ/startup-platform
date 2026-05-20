# Activity Log — `/dashboard/admin/audit-logs`

> The forensic record — every platform change and every XP/points award, filterable by category, user, and date.

## Purpose

When something on the platform looks wrong — a student's XP went up unexpectedly, a team got renamed, a strike appeared from nowhere, a meeting RSVP flipped — the admin needs an unambiguous "who did what when". This page is that record. It rolls every audited mutation across the database and every reward event into two human-readable feeds, so the admin can answer "did this happen?" without writing SQL.

## What it does

- Two tabs of activity, each with its own count badge:
  - **Activity** — formatted audit log entries (the `audit_logs` table, surfaced via the `get_audit_logs_v2` RPC and rendered by [`formatAuditLogV2`](../../../src/lib/audit-log-formatter-v2.ts)).
  - **Rewards & Points** — XP and points changes (via the `get_rewards_activity` RPC, formatted by `formatRewardActivity`).
- Four shared filters that apply to both tabs:
  - `Category` — All / Team Activity / Tasks / Strikes / Reports / Meetings / User Profiles. Activity-tab only.
  - `User` — populated from `get_users_for_filter` RPC. Applies to both Activity and Rewards.
  - `From` and `To` — `datetime-local` inputs for date range bounding. Applies to both tabs.
- `Apply` button reruns the active tab's query (and the rewards query if that tab has data); `Reset` clears all filters; an icon-only `Refresh` button refetches.
- Activity entries render as cards with a category emoji, a one-line `summary`, optional `details` line, a category-coloured badge, a `Calendar` timestamp, and a collapsible `Technical details` section (showing raw `table_name`, `action`, `changed_fields` JSON) — hidden for entries the formatter marks `hideRawData`.
- Reward entries render as a row with an emoji icon, a summary, the team name + full date, and one or two badges showing `xp_change` (default/destructive variant by sign) and `points_change`.
- Each tab fetches lazily — the rewards tab only loads when first opened.
- Limits: 100 entries per tab per query.

## How it looks

Page header: large `Activity Log` title with subhead "Track all platform activity and rewards".

Below: a `Filters` Card with a 4-column responsive grid of `Select` and `Input` fields, then an action row of `Apply` / `Reset` / refresh-spinner buttons.

Below the filters: a `Tabs` strip (max 460px, two equal columns) with `Activity (N)` and `Rewards & Points (N)` labels.

Activity tab content is a Card listing entries as bordered, hover-highlighted blocks. Each entry's left side stacks emoji + summary + indented details; the right side stacks a Calendar timestamp and a category badge. The "Technical details" disclosure expands a `bg-muted` JSON pre-block.

Rewards tab content is a similar Card but with a flatter row layout — emoji + summary + meta on the left, XP and points badges on the right (green for positive, red for negative XP).

A bordered destructive Card surfaces any RPC error before the tabs.

## Thought behind it

This page is the platform's accountability surface. Gamification systems lose trust the moment a student suspects the numbers are made up — so the rule is everything that mutates state must be auditable, and the audit must be readable to a human, not just to a database admin. Splitting the feed into Activity (state changes) and Rewards (point movements) is deliberate: most "where did my XP go?" questions resolve faster on the Rewards tab, while structural questions ("who archived our team?") resolve on the Activity tab.

The category icons, colour-coded badges, and the formatter layer ([`audit-log-formatter-v2.ts`](../../../src/lib/audit-log-formatter-v2.ts)) exist because raw `audit_logs` rows are unreadable — `{table: "task_progress", action: "UPDATE", changed_fields: {...}}` tells you nothing useful at a glance. The `Technical details` disclosure preserves that raw shape for the rare moments when an engineer needs it, without polluting the primary view.

This page is strictly read-only. There is no edit, no delete, no "mark as reviewed". The audit log is the source of truth; making it editable would defeat the purpose. There are no exports either — if an admin needs that, they go directly to the database. This is a triage and inspection surface, not a reporting tool.

## Wired-up bits

- **Page file:** [`src/app/dashboard/admin/audit-logs/page.tsx`](../../../src/app/dashboard/admin/audit-logs/page.tsx)
- **Key components:** none beyond ShadCN primitives — the page composes Card / Select / Input / Tabs / Badge / Button directly.
- **Formatter:** [`src/lib/audit-log-formatter-v2.ts`](../../../src/lib/audit-log-formatter-v2.ts) — `formatAuditLogV2`, `formatRewardActivity`, plus the `AuditLogV2` and `RewardActivity` types.
- **Hooks:** local `useState` + `useEffect`; one effect loads users + activity on mount, another lazily loads rewards the first time that tab is selected.
- **RPCs:**
  - `get_audit_logs_v2(p_category, p_user_id, p_from_date, p_to_date, p_limit, p_offset)`
  - `get_rewards_activity(p_user_id, p_from_date, p_to_date, p_limit, p_offset)`
  - `get_users_for_filter()` — populates the user dropdown
- **Auth requirement:** admin only. Note the page does not currently render its own admin-role check or skeleton — protection is enforced upstream by middleware on `/dashboard/**` and by RLS on the underlying RPCs.
- **Notable types:** `AuditLogV2`, `RewardActivity` (from the formatter module); `UserOption` (declared inline).
