# Support & Bug Reports System

> The support system allows authenticated users to submit support tickets with file attachments, priority levels, and categories. Tickets are forwarded to a Discord channel via webhook for team review. Rate limiting prevents spam.

## Overview

The support system is a one-way ticket submission flow:

1. User fills out form at `/dashboard/support`
2. Server validates, sanitizes, and rate-limits
3. Ticket is forwarded to Discord via webhook (with rich embed + file attachments)
4. Rate limit tracked in `support_rate_limits` table

**Important:** Tickets are NOT stored in the database — Discord is the source of truth for ticket content. Only rate-limit timestamps are persisted locally.

---

## Architecture

### Data Flow

```
User fills support form
  → Client-side validation (fields, files, rate limit)
    → POST /api/support/ticket (multipart/form-data)
      → Server-side Zod validation
        → Rate limit check (support_rate_limits table)
          → Sanitize content (Discord mention escaping)
            → Build Discord embed + attach files
              → Send to Discord webhook (up to 3 retries)
                → Return ticket ID to user
```

### Key Files

| File | Role |
|------|------|
| `src/app/dashboard/support/page.tsx` | Support form UI (client component) |
| `src/app/api/support/ticket/route.ts` | Ticket submission API route |
| `src/lib/validation-schemas.ts` | `SupportTicketSchema` Zod validation |
| `src/components/app-sidebar.tsx` | Support nav link (HelpCircle icon) |

---

## Database Schema

### `support_rate_limits`

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | UUID | Primary key, FK to `users` |
| `last_submission_at` | TIMESTAMP | Last ticket submission time |
| `created_at` | TIMESTAMP | Auto-filled |
| `updated_at` | TIMESTAMP | Auto-filled |

**Operations:**
- **SELECT:** Check last submission time for rate limiting
- **UPSERT:** Update timestamp on successful submission (`onConflict: "user_id"`)
- **RLS:** Users can only upsert their own records

**Note:** This is the only support-related table. Ticket content is not stored in the database.

---

## Support Form

**Route:** `/dashboard/support`
**File:** `src/app/dashboard/support/page.tsx`
**Type:** Client Component (`"use client"`)

### Form Sections

#### 1. User Information (Read-Only)
- Name — auto-populated from `user.name`
- Email — auto-populated from `user.email`
- Both fields disabled

#### 2. Priority & Category

**Priority Levels:**

| Value | Label | Color | Discord Embed Color |
|-------|-------|-------|-------------------|
| `low` | Low | Gray | `0x808080` |
| `medium` | Medium (default) | Yellow | `0xffd700` |
| `high` | High | Orange | `0xff8c00` |
| `critical` | Critical | Red | `0xff0000` |

**Categories:**
- Bug Report
- Feature Request
- Technical Issue
- Account Problem
- Performance Issue
- UI/UX Issue
- Other

#### 3. Title
- Text input, max 100 characters
- Character counter displayed
- Required

#### 4. Description
- Textarea, min 10 characters (server), max 2000 characters
- Character counter displayed
- Min height: 140px
- Required

#### 5. File Attachments (Optional)
- Max 3 files per ticket
- Max 8MB per file
- Supported types:
  - **Images:** PNG, JPEG, JPG, GIF, WebP, SVG
  - **Documents:** PDF, Word (.doc, .docx), Excel (.xls, .xlsx)
  - **Text:** Plain text, CSV, .log files
- File list with size display and remove button

#### 6. Submit Button
- Full width, Send icon
- Loading state: spinner + "Submitting..." text
- Disabled during submission

### Form States

| State | UI |
|-------|-----|
| Idle | Default form |
| Submitting | Button disabled with spinner |
| Success | Green alert (CheckCircle) + form reset |
| Error | Red alert (AlertCircle) + form preserved |

---

## API Route

### `POST /api/support/ticket`

**File:** `src/app/api/support/ticket/route.ts`
**Content-Type:** `multipart/form-data`
**Auth:** Required (Supabase session)

### Request Format

```
FormData:
  priority: "low" | "medium" | "high" | "critical"
  category: string (max 50 chars)
  title: string (max 100 chars)
  description: string (min 10, max 2000 chars)
  userInfo: JSON string { id, name, email }
  attachment_0: File (optional)
  attachment_1: File (optional)
  attachment_2: File (optional)
```

### Processing Flow

1. **Authentication** — Verify Supabase session, 401 if missing
2. **Parse FormData** — Extract fields, parse JSON userInfo
3. **Zod Validation** — `SupportTicketSchema`, 400 if invalid
4. **File Validation** — Size (8MB), type whitelist, count (3 max)
5. **Rate Limit Check** — Query `support_rate_limits`, enforce 15-minute cooldown
6. **Sanitize Content** — Escape Discord `@everyone` and `@here` mentions
7. **Build Discord Embed** — Rich embed with ticket ID, fields, colors, attachments
8. **Send to Discord** — Webhook POST with up to 3 retries
9. **Update Rate Limit** — Upsert timestamp in `support_rate_limits`

### Ticket ID Format

`ST-{YYYY}-{last6digitsOfTimestamp}`

Example: `ST-2026-847293`

### Response Codes

| Status | Condition | Body |
|--------|-----------|------|
| 200 | Success | `{ success: true, ticketId, message }` |
| 401 | Not authenticated | `{ error: "Authentication required" }` |
| 400 | Validation error | `{ error, details }` |
| 405 | GET request | `{ error: "Method not allowed" }` |
| 429 | Rate limited | `{ error: "Please wait X minute(s)..." }` |
| 500 | Server/webhook error | `{ error: "Failed to connect..." }` |
| 503 | Discord unavailable | `{ error: "Support system temporarily unavailable" }` |

---

## Validation Schema

**File:** `src/lib/validation-schemas.ts`

```typescript
export const SupportTicketSchema = z.object({
  priority: z.enum(["low", "medium", "high", "critical"]),
  category: z.string().min(1).max(50),
  title: z.string().min(1).max(100),
  description: z.string().min(10).max(2000),
  userInfo: z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(100),
    email: z.string().email().max(100),
  }),
});
```

---

## Discord Integration

### Configuration

**Environment Variable:** `DISCORD_WEBHOOK_URL`

Setup: Discord Server → Settings → Integrations → Webhooks → Create → Copy URL

### Webhook Payload

**Embed Structure:**

| Field | Value |
|-------|-------|
| Title | `🎫 Support Ticket ST-2026-XXXXXX` |
| Description | `## {title}\n\n{description}` (markdown) |
| Color | Priority-based (see table above) |
| Author | User name + email, avatar from ui-avatars.com |
| Fields | Contact info, category, priority (with emoji), submission time |
| Footer | "StartSchool Support System • Create thread to discuss this ticket" |
| Attachments | Up to 3 files (original filenames preserved) |

**Critical Priority:** Adds `@here` mention to alert support team immediately.

### Content Sanitization

```typescript
function sanitizeDiscordContent(input: string): string {
  return input
    .replace(/@everyone/g, "@\u200beveryone")  // Zero-width space
    .replace(/@here/g, "@\u200bhere");
}
```

Applied to: title, description, user name, email, category.

### Retry Logic

- Max 3 attempts
- Discord 429 (rate limited): Wait per `retry-after` header (default 2s)
- Network errors: Exponential backoff (1s, 2s, etc.)
- File processing failures: Log warning, continue without that file

---

## Rate Limiting

- **Cooldown:** 15 minutes between submissions per user
- **Storage:** `support_rate_limits` table (upsert on `user_id`)
- **Check:** Both client-side (component state) and server-side (database query)
- **Graceful Failure:** If rate limit DB check fails, submission proceeds (logged error)

---

## Security

| Measure | Implementation |
|---------|---------------|
| Authentication | Supabase session required for all submissions |
| Discord mention escaping | Zero-width space injection prevents `@everyone`/`@here` abuse |
| File type whitelist | Only specific MIME types accepted |
| File size limit | 8MB per file (Discord constraint) |
| Input validation | Zod schema on server-side |
| Rate limiting | 15-minute cooldown per user |
| RLS | Users can only modify their own rate limit records |

---

## Limitations

1. **No ticket history** — Users cannot view previously submitted tickets
2. **No ticket tracking** — No status page or progress updates for users
3. **No admin dashboard** — No internal interface to manage tickets
4. **Discord-only storage** — Ticket content not persisted in database
5. **No email confirmation** — Users don't receive confirmation email
6. **No SLA tracking** — No response time or resolution metrics
7. **No FAQ/knowledge base** — No self-service help content

---

## File Reference

| File | Purpose |
|------|---------|
| `src/app/dashboard/support/page.tsx` | Support form UI (17.4 KB) |
| `src/app/api/support/ticket/route.ts` | Ticket submission handler (14.3 KB) |
| `src/lib/validation-schemas.ts` | `SupportTicketSchema` Zod validation |
| `src/types/database.ts` | `support_rate_limits` type definitions |
| `src/components/app-sidebar.tsx` | Support nav link in sidebar |
