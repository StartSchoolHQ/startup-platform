# Support & Bug Reports — `/dashboard/support`

> A single-form ticketing page that funnels every bug, request, and "this is broken" into the team's Discord triage channel.

## Purpose
The platform's catch-all help intake. Built so a confused or frustrated user has exactly one place to file feedback without leaving the dashboard or hunting for an email address. Used by anyone — students, mentors, admins — usually at moments of friction (page didn't load, submission rejected, feature unclear). Optimised for "user is annoyed, get out of their way".

## What it does
- Pre-fills the user's name and email from `useAppContext()` into read-only fields so they cannot mistype identity.
- Captures a ticket with four required pieces: priority (`low | medium | high | critical`), category (one of seven preset values like Bug Report, Feature Request, Account Problem), title (≤100 chars), description (≤2000 chars enforced in state, with a 1000-char submit-time check that is the effective hard cap).
- Optional attachments: up to 3 files, 8MB each (Discord's hard cap). Allowed types are images (PNG/JPG/GIF/WebP/SVG), documents (PDF/DOC/DOCX/XLS/XLSX), and text/log (TXT/CSV/LOG). Files are validated client-side for both type and size; rejected files surface inline error messages, not toasts.
- Client-side rate limit: one ticket per 15 minutes, tracked via `lastSubmissionTime` state. Server adds its own 429 handling.
- Submits a `multipart/form-data` POST to [`/api/support/ticket`](src/app/api/support/ticket/route.ts), which validates input with Zod (`SupportTicketSchema`) and forwards a Discord embed (with priority colour and emoji) to the channel webhook configured in `DISCORD_WEBHOOK_URL`.
- Response handling distinguishes 429 (rate-limited) and 503 (Discord unavailable) from generic failure messages. On success the form resets, attachments clear, and a green confirmation banner is shown.

## How it looks
Padded full-width container, breadcrumb at the top (Dashboard / Support). The page header pairs a blue `HelpCircle` icon with an `h1` and a muted lead line. Status banners (green success, red error) appear above the form when relevant.

The form lives in a centred `Card` (max-width `4xl`, drop-shadow) with these blocks, each `space-y-8` apart:
1. **User Information** — light grey rounded panel, two disabled inputs in a 2-col grid.
2. **Priority + Category** — paired ShadCN [`Select`](src/components/ui/select.tsx) controls. Priority items use coloured emoji labels (🟢🟡🟠🔴) for fast scanning.
3. **Title** — single `Input` with live `n/100` counter.
4. **Description** — `Textarea` (min 140px tall) with live `n/2000` counter.
5. **Attachments** — dashed-border drop region with a multi-file `Input`, hint text listing accepted formats, and a list of selected files showing name, size in MB, and a per-file remove (`X`) button.
6. **Submit** — full-width primary button (`h-12`), inline spinner during `isSubmitting`.

## Thought behind it
This page is deliberately one form, one button, one outcome. We resisted the urge to build a full ticket-tracker UI (status, replies, history) because the volume does not justify it and Discord already gives the team a faster triage surface than any in-app inbox would. Funnelling everything to a Discord webhook means the same channel that handles dev banter handles user pain — that's a feature, not a shortcut: it keeps response time low and visibility high. Pre-filled identity prevents the worst of all ticket experiences (ticket from "Loading..."). The 15-minute client rate-limit plus a server-side 429 is intentional belt-and-braces: the client stop is friendly ("please wait 12 minutes"), the server stop is the truth. File constraints — 8MB, 3 files, restricted MIME types — exist because Discord enforces them; mirroring those in the UI saves the user from a confusing failure on submit. Priority colours and emojis are not decorative — they are how a human glancing at a Discord notification decides whether to context-switch right now or after lunch. The page deliberately does not show past tickets, status updates, or a knowledge-base search; if those become needed we will build them, not before.

## Wired-up bits
- **Page file:** [`src/app/dashboard/support/page.tsx`](src/app/dashboard/support/page.tsx)
- **Key components:** ShadCN [`Card`](src/components/ui/card.tsx), [`Input`](src/components/ui/input.tsx), [`Textarea`](src/components/ui/textarea.tsx), [`Label`](src/components/ui/label.tsx), [`Select`](src/components/ui/select.tsx), [`Breadcrumb`](src/components/ui/breadcrumb.tsx), [`Button`](src/components/ui/button.tsx)
- **Hooks:** [`useAppContext()`](src/contexts/app-context.tsx) for user identity; local `useState` for form/status/error/rate-limit state
- **RPCs / API routes:** `POST /api/support/ticket` → Discord webhook ([`route.ts`](src/app/api/support/ticket/route.ts)), env: `DISCORD_WEBHOOK_URL`
- **Auth requirement:** authenticated (dashboard layout enforces); the API route also creates a Supabase server client and validates input
- **Notable types or schemas:** local `SupportTicket` interface; server-side [`SupportTicketSchema`](src/lib/validation-schemas.ts) (Zod)
