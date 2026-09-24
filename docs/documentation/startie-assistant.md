# Startie — student AI assistant

> Startie is the pink pixel cube in the bottom-right corner of every dashboard page. It explains how the platform works, talks about the student's own progress, and coaches on My Journey tasks Socratically. It never writes submissions. 25 messages per student per UTC day, admins read every transcript.

Spec: `docs/internal/superpowers/specs/2026-09-24-startie-assistant-design.md`.
Shipped 2026-09-24 with `platform_settings.assistant.enabled = false`.

## How it works

```
Student types in the widget
  → POST /api/assistant/chat  (cookie session)
    → settings check (503 when disabled)
      → assistant_send_message_v1 (SQL: limit, thread, insert user row)
        → snapshot RPCs + task summary + last N turns (student session)
          → OpenAI Responses API, streamed back as text/plain
            → service role inserts the assistant row with tokens + cost
```

There are no tools and no RAG. The model sees a **static prefix** (persona + student guide, identical for everyone, prompt-cached) and a **dynamic tail** (the student's snapshot and the page they are on, nonce-delimited and declared as data), then the thread history.

## Key files

| Area | Files |
|---|---|
| Persona / guide / prompt | `src/lib/assistant/persona.ts`, `guide.ts`, `prompt.ts` (`PROMPT_VERSION`) |
| Snapshot | `src/lib/assistant/snapshot.ts` — `loadStudentSnapshot`, `loadPageSummary` (never selects review criteria) |
| Route | `src/app/api/assistant/chat/route.ts`, `src/lib/assistant/chat.ts` (stream adapter), `errors.ts` |
| Settings | `src/lib/assistant/settings.ts`, `src/hooks/use-assistant-settings.ts`, `src/components/admin/assistant-settings-card.tsx` |
| Widget | `src/components/assistant/*`, `src/hooks/use-startie-chat.ts`, `use-startie-threads.ts`, mounted in `src/app/dashboard/dashboard-layout-wrapper.tsx` |
| Admin | Inbox → Startie tab: `src/components/admin/inbox/startie-{stats-strip,threads-table,thread-sheet}.tsx` |
| Pricing | `src/lib/ai/pricing.ts` (shared with the AI reviewer) |
| Migration | `supabase/migrations/20260924120000_startie_assistant_v1.sql` |
| Tests | `tests/assistant/*` |

## Database

- `assistant_threads` (owner + admin SELECT; no insert/update/delete policies).
- `assistant_messages` (`role` in user / assistant / system_note; token and cost columns on assistant rows; `flagged_message_id` on system_note rows). Owner + admin SELECT, **no INSERT policy** — writes come only from the RPC and the service role.
- `platform_settings.assistant`: `enabled`, `model`, `daily_limit`, `history_turns`, `reasoning_effort`.

RPCs (all SECURITY DEFINER, EXECUTE authenticated + service_role, anon revoked):

| RPC | What |
|---|---|
| `assistant_send_message_v1(p_thread_id, p_content, p_page_context)` | Advisory lock per user, counts today's `user` rows (UTC day), raises `ASSISTANT_LIMIT_REACHED` / `INVALID_CONTENT` / `THREAD_NOT_FOUND`, creates the thread when `p_thread_id` is null, inserts the user row, returns `{thread_id, message_id, remaining_today}` (null for admins). Does **not** check `enabled` — the route does. |
| `assistant_flag_message_v1(p_message_id)` | Thumbs-down: one `system_note` per assistant reply (unique partial index). |
| `get_assistant_admin_stats_v1()` | Messages today, cost this month, cache hit rate, avg reply tokens; NULL for non-admins. |
| `get_assistant_admin_threads_v1(p_flagged_only, p_user_id, p_limit, p_offset)` | Thread list with per-thread counts and cost; empty for non-admins. |

## Editing Startie

- **Voice / rules:** `src/lib/assistant/persona.ts`.
- **Platform facts:** `src/lib/assistant/guide.ts` (~850 words, student-facing). Update it when a rule changes (phase gate, cooldowns, weekly report, limits).
- After either change, bump `PROMPT_VERSION` in `src/lib/assistant/prompt.ts` so the cache key rotates and transcripts record which prompt produced a reply.
- Runtime knobs live in Admin → Settings → Startie assistant (no deploy): enabled, model (`gpt-5.4-mini` default), daily limit, history turns, reasoning effort.

## Guardrails

- Socratic only: the persona forbids writing, drafting, outlining or templating any part of a submission. Rule 12 of the AI reviewer persona tells the reviewer Startie exists.
- Student-influenced text is inside `<<<DATA <nonce> <kind>>>> … <<<END <nonce> <kind>>>>` blocks; `<<<`/`>>>` are stripped from content first.
- The task summary sent to the model never includes `peer_review_criteria` or `review_instructions`.
- No tools, no write path from the model. Worst case is a bad answer, which admins can read and students can flag.
- Disclosure: the widget shows "I'm an AI… Admins can read these chats." at the top of every new thread (EU AI Act Art. 50).

## Cost

Per message ≈ $0.005 on gpt-5.4-mini (7k cached prefix, ~2.4k fresh input, ~350 output, reasoning low). Realistic month for 75 students: $25–75. Hard cap (everyone at 25/day): ~$260. Levers: reasoning effort, history turns, model. The Startie tab's stats strip shows cost this month and cache hit rate.

## Rollback

Soft: Admin → Settings → Startie assistant → Enabled off. Widget disappears, route returns 503.

Full: revert the app code (git), then drop the four functions (`assistant_send_message_v1(uuid,text,jsonb)`, `assistant_flag_message_v1(uuid)`, `get_assistant_admin_stats_v1()`, `get_assistant_admin_threads_v1(boolean,uuid,int,int)`), drop tables `assistant_messages` then `assistant_threads`, `delete from platform_settings where key = 'assistant'`, and remove rule 12 from the reviewer persona (bump its `PROMPT_VERSION` back).
