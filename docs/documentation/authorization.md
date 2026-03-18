# Authorization & Authentication System

> The authorization system manages user identity, session handling, role-based access control, and route protection using Supabase Auth with cookie-based sessions, enforced through Next.js middleware.

## Overview

The auth system handles:
- Email/password authentication via Supabase Auth
- Cookie-based session management with automatic refresh
- Role-based access control (admin vs student)
- Route protection via middleware
- Invitation-based onboarding with profile setup
- Password reset flow with OTP verification

---

## Architecture

### Auth Flow

```
User visits /dashboard
  → Middleware intercepts request
    → createServerClient() + getUser()
      → No session? → Redirect to /login
      → Has session? → Allow access, refresh cookies
        → AppProvider loads user profile
          → PostHog identification
          → Role-based UI rendering
```

### Invitation Flow

```
Admin bulk invites via /dashboard/admin/users
  → Supabase sends magic link email (24hr expiry)
    → User clicks link → /auth/callback
      → exchangeCodeForSession()
        → waitForProfile() (handles DB trigger race condition)
          → isProfileComplete()?
            → No: redirect to /profile/setup
            → Yes: redirect to /dashboard
```

---

## Supabase Clients

Three client types exist in `src/lib/supabase/`:

### Browser Client (`client.ts`)

```typescript
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- **Auth:** `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public key)
- **Session:** Auto-refresh enabled, persists to browser
- **Use:** Frontend React components, client-side pages (`"use client"`)
- **RLS:** Enforced — queries run as authenticated user

### Server Client (`server.ts`)

```typescript
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll, setAll } }
  );
}
```

- **Auth:** `NEXT_PUBLIC_SUPABASE_ANON_KEY` + cookie-based session
- **Session:** Managed via Next.js `cookies()` API
- **Use:** Server Components, API routes, middleware
- **RLS:** Enforced — uses session from cookies

### Admin Client (`admin.ts`)

```typescript
export function createAdminClient() {
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
```

- **Auth:** `SUPABASE_SERVICE_ROLE_KEY` (server-only secret)
- **Session:** None — no refresh, no persistence
- **Use:** Admin operations (bulk invite, user management), server-side only
- **RLS:** **Bypassed** — full database access
- **Guard:** Always verify user role before calling

---

## Middleware

**File:** `src/lib/supabase/middleware.ts`

**Entry Point:** `updateSession(request: NextRequest)` — called via `proxy.ts`

### Route Classification

**Public Routes** (no auth required):
| Route | Purpose |
|-------|---------|
| `/` | Home/landing page |
| `/login` | Login page |
| `/auth/callback` | OAuth/PKCE callback handler |
| `/auth/confirm` | Email OTP confirmation (password reset) |
| `/auth/reset-password` | Password reset form |
| `/profile/setup` | Profile completion after invitation |
| `/invite` | Invitation acceptance page |

**Protected Routes** (auth required):
| Route | Purpose |
|-------|---------|
| `/dashboard/*` | All dashboard routes |

### Middleware Logic

1. Create server client with cookie management
2. Call `supabase.auth.getUser()` to validate session
3. **No user on protected route** → redirect to `/login`
4. **Authenticated user on `/login`** → redirect to `/dashboard`
5. Session cookies refreshed automatically via `setAll()` callback

**Critical:** No logic between `createServerClient()` and `getUser()` call — prevents random logout bugs due to cookie state issues.

---

## Authentication Flows

### Login (`/login`)

**File:** `src/app/login/page.tsx`

1. Middleware redirects already-authenticated users to `/dashboard`
2. User enters email + password
3. `supabase.auth.signInWithPassword({ email, password })`
4. **Error:** "Invalid login credentials" → check if email has pending invitation
5. **Success:** PostHog tracking → redirect to `/dashboard`

### Auth Callback (`/auth/callback`)

**File:** `src/app/auth/callback/route.ts`

Handles PKCE authorization code exchange and invitation flows.

1. **Code Exchange:** `supabase.auth.exchangeCodeForSession(code)`
2. **Profile Race Condition:** `waitForProfile(supabase, user.id)` with exponential backoff (50ms → 800ms, max 5 attempts)
3. **Profile Check:** `isProfileComplete(userProfile)` — checks if user has name
4. **Incomplete:** redirect to `/profile/setup`
5. **Complete:** redirect to requested destination or `/dashboard`
6. **Code Failure:** redirect to `/auth/invite-expired` if code expired/used

**Redirect Logic:**
- Local dev: `${origin}${next}`
- Production with load balancer: `https://${forwardedHost}${next}`

### Password Reset

**Files:** `src/app/auth/confirm/route.ts`, `src/app/auth/reset-password/page.tsx`

1. User clicks "Forgot password?" on `/login`
2. Supabase sends recovery email with OTP token
3. Email link → `/auth/confirm?token_hash=...&type=recovery`
4. `supabase.auth.verifyOtp({ token_hash, type })` → sets session
5. Redirect to `/auth/reset-password`
6. User enters new password (8+ chars, must match confirmation)
7. `supabase.auth.updateUser({ password })` → redirect to `/dashboard`

### Invitation Flow

**Files:**
- `src/app/api/admin/bulk-invite/route.ts` — Bulk invite API
- `src/app/api/admin/resend-invite/route.ts` — Resend invite API
- `src/app/invite/page.tsx` — PKCE-based invitation page
- `src/app/auth/invite/page.tsx` — Hash-based invitation page
- `src/app/auth/invite-expired/page.tsx` — Expired invitation error

**Bulk Invite Flow:**

1. **Auth:** Admin only (`primary_role !== "admin"` → 403)
2. **Validation:** `BulkInviteSchema` (Zod) — email, first_name, last_name per entry, max 100
3. **Duplicate Check:** `adminClient.auth.admin.listUsers()` — rejects existing emails
4. **Creation:** `adminClient.auth.admin.inviteUserByEmail(email, { data, redirectTo })`
   - Sets metadata: `{ first_name, last_name, invited_by }`
   - Redirect: `{APP_URL}/auth/callback?next=/profile/setup`
   - Supabase sends 24-hour magic link email
5. **Welcome Notification:** Creates `"system"` type notification for invited user
6. **Response:** `{ total, succeeded, failed }` with per-invitation results

**Invitation Acceptance (`/invite`):**

1. Check for auth token (hash or PKCE code)
2. Establish session via `exchangeCodeForSession()` or hash processing
3. Check profile existence — create basic record if missing
4. Redirect: incomplete profile → `/profile/setup`, else → `/dashboard`

### Profile Setup (`/profile/setup`)

**Files:** `src/app/profile/setup/page.tsx`, `src/app/api/profile/setup/route.ts`

1. Verify user is authenticated
2. Pre-fill name from `user.user_metadata` (set during invitation)
3. Form collects: name, password (8+ chars), avatar (5MB max, images only)
4. Avatar uploaded to Supabase Storage: `avatars/{userId}/avatar-{timestamp}.ext`
5. Password update: `supabase.auth.updateUser({ password })`
6. Profile update: `POST /api/profile/setup` → RPC `update_user_profile(p_name, p_avatar_url)`

---

## Role System

### Primary Roles

Stored in `users.primary_role` column (type: `primary_role_type` enum):

| Role | Value | Access |
|------|-------|--------|
| Student/User | `"user"` | All student dashboard pages |
| Admin | `"admin"` | All pages + admin dashboard |

### Team Roles

Stored in `team_members.team_role` column (type: `team_role_type` enum):

| Role | Value | Permissions |
|------|-------|-------------|
| Founder | `"founder"` | Full team management |
| Co-founder | `"co_founder"` | Leadership, member management |
| Leader | `"leader"` | Leadership, member management |
| Member | `"member"` | Regular team participation |

### Role Checks

**In API Routes:**
```typescript
const { data: userProfile } = await supabase
  .from("users")
  .select("primary_role")
  .eq("id", user.id)
  .single();

if (userProfile?.primary_role !== "admin") {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

**In Client Components:**
```typescript
if (!loading && (!user || user.primary_role !== "admin")) {
  redirect("/dashboard");
}
```

---

## Route Protection

### Admin-Only Routes

All require `primary_role === "admin"`, redirect non-admins to `/dashboard`:

| Route | Purpose |
|-------|---------|
| `/dashboard/admin` | Admin hub |
| `/dashboard/admin/users` | User management |
| `/dashboard/admin/teams` | Team management |
| `/dashboard/admin/tasks` | Task management |
| `/dashboard/admin/peer-reviews` | Peer review oversight |
| `/dashboard/admin/audit-logs` | Audit log viewer |
| `/dashboard/admin/progress` | Student progress dashboard |
| `/dashboard/admin/pending-invites` | Pending invitations |

### Protection Pattern

1. **Middleware level:** All `/dashboard/*` routes require authentication
2. **Layout level:** `src/app/dashboard/layout.tsx` checks `getUser()` server-side
3. **Page level:** Admin pages check `user.primary_role` client-side
4. **API level:** Admin endpoints verify role before processing

---

## RLS Policies

### Key Policies on `task_progress`

| Policy | Type | Rule |
|--------|------|------|
| Team members can create team tasks | INSERT | User in `team_members` with `left_at IS NULL`, task `context = 'team'` |
| Team members can update team tasks | UPDATE | User in team, status changes to valid values |
| Team members can delete team task progress | DELETE | User in team, `context = 'team'` |
| Assigned reviewers can update task status | UPDATE | User is `reviewer_user_id` |
| Users can see own tasks | SELECT | Individual: `assigned_to_user_id = auth.uid()`, Team: user in team |

---

## Session Management

### Cookie-Based Sessions

- **Cookie Name:** `sb-*` (Supabase-prefixed)
- **Attributes:** HTTP-only, Secure, SameSite
- **Managed by:** Middleware on every request

### Token Refresh

| Client | Refresh Strategy |
|--------|-----------------|
| Browser | Automatic (enabled in client config) |
| Server | Middleware handles via cookies callback |
| Admin | Disabled (service role doesn't need refresh) |

### Session Validation

- Every request: middleware calls `auth.getUser()` to validate
- Stale session: Supabase auto-refreshes via cookies callback
- Invalid session: cookies cleared, redirect to `/login`

### Logout

1. Client calls `supabase.auth.signOut()`
2. Auth cookies cleared
3. React Query cache cleared: `queryClient.clear()`
4. PostHog event tracked
5. Window redirect to `/login`

---

## Key Components

| Component | File | Purpose |
|-----------|------|---------|
| Login Page | `src/app/login/page.tsx` | Email/password login UI |
| Profile Setup | `src/app/profile/setup/page.tsx` | New user onboarding |
| Auth Callback | `src/app/auth/callback/route.ts` | PKCE code exchange |
| OTP Confirm | `src/app/auth/confirm/route.ts` | Password reset OTP verification |
| Reset Password | `src/app/auth/reset-password/page.tsx` | New password form |
| Invite Page | `src/app/invite/page.tsx` | PKCE invitation acceptance |
| Invite Expired | `src/app/auth/invite-expired/page.tsx` | Expired link error |
| Bulk Invite API | `src/app/api/admin/bulk-invite/route.ts` | Admin batch invitations |
| Resend Invite API | `src/app/api/admin/resend-invite/route.ts` | Resend invitation email |
| Profile API | `src/app/api/profile/setup/route.ts` | Profile update endpoint |
| AppProvider | `src/contexts/app-context.tsx` | Global user state + PostHog |

---

## Database Tables

### `users`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Auth user ID |
| `email` | TEXT | User email |
| `name` | TEXT | Display name (nullable) |
| `avatar_url` | TEXT | Avatar URL (nullable) |
| `primary_role` | `primary_role_type` | `"user"` or `"admin"` |
| `total_xp` | INT | Aggregated XP |
| `total_points` | INT | Aggregated points |
| `graduation_level` | INT | Current level |
| `created_at` | TIMESTAMP | Account creation |

### `team_members`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK to `users` |
| `team_id` | UUID | FK to `teams` |
| `team_role` | `team_role_type` | `"member"`, `"leader"`, `"founder"`, `"co_founder"` |
| `joined_at` | TIMESTAMP | Join date |
| `left_at` | TIMESTAMP | Leave date (NULL = active) |

**Gotcha:** Multiple rows per user/team — old rows with `left_at` set + active rows with `left_at IS NULL`. Always filter with `.is("left_at", null)` for active members.

### `team_invitations`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `team_id` | UUID | FK to `teams` |
| `invited_user_id` | UUID | FK to `users` |
| `invited_by_user_id` | UUID | FK to `users` |
| `role` | `team_role_type` | Offered role (nullable) |
| `status` | TEXT | Invitation status (nullable) |
| `created_at` | TIMESTAMP | Sent date |
| `responded_at` | TIMESTAMP | Response date (nullable) |

---

## Utility Functions

### `waitForProfile(supabase, userId)`

**File:** `src/lib/profile-utils.ts`

Handles race condition where auth user is created before DB trigger creates profile.

- Exponential backoff: 50ms → 100ms → 200ms → 400ms → 800ms
- Max retries: 5 (~1.5s total wait)
- Returns: `UserProfile | null`

### `isProfileComplete(profile)`

**File:** `src/lib/profile-utils.ts`

- Checks if `profile?.name` exists
- Avatar is optional (can be added later)

---

## Validation Schemas

**File:** `src/lib/validation-schemas.ts`

| Schema | Fields | Used By |
|--------|--------|---------|
| `InvitationSchema` | email (trimmed, lowercased), first_name (2-50), last_name (2-50) | Bulk invite |
| `BulkInviteSchema` | invitations[] (1-100 items) | Bulk invite API |
| `ResendInviteSchema` | email (email format) | Resend invite API |
| `AdminUserUpdateSchema` | name?, email?, primary_role?, secondary_roles?, balance? | Admin user edit |

---

## Important Gotchas

1. **Middleware Session Bug:** Never write logic between `createServerClient()` and `getUser()` — causes random logouts
2. **Profile Race Condition:** Auth user created instantly, DB trigger creates profile async → use `waitForProfile()` with backoff
3. **Admin Client:** Bypasses RLS but still needs role verification before use
4. **Team Members:** Multiple rows per user/team (historical). Always check `left_at IS NULL`
5. **Email Confirmation:** Invited users have `email_confirmed_at = null` until link clicked. Check in Supabase Auth, not `public.users`
6. **PostHog:** User identified on AppProvider mount. Tracks login success/failure, profile setup, logout events

---

## File Reference

### Auth Core
| File | Purpose |
|------|---------|
| `src/lib/supabase/client.ts` | Browser client |
| `src/lib/supabase/server.ts` | Server client |
| `src/lib/supabase/admin.ts` | Admin/service role client |
| `src/lib/supabase/middleware.ts` | Auth middleware |

### Pages & Routes
| File | Purpose |
|------|---------|
| `src/app/login/page.tsx` | Login UI |
| `src/app/auth/callback/route.ts` | PKCE callback handler |
| `src/app/auth/confirm/route.ts` | OTP confirmation |
| `src/app/auth/reset-password/page.tsx` | Password reset UI |
| `src/app/auth/invite/page.tsx` | Hash-based invitation |
| `src/app/invite/page.tsx` | PKCE-based invitation |
| `src/app/auth/invite-expired/page.tsx` | Expired link error |
| `src/app/profile/setup/page.tsx` | Profile completion UI |
| `src/app/api/profile/setup/route.ts` | Profile API |
| `src/app/api/admin/bulk-invite/route.ts` | Bulk invite API |
| `src/app/api/admin/resend-invite/route.ts` | Resend invite API |

### Utilities
| File | Purpose |
|------|---------|
| `src/lib/profile-utils.ts` | waitForProfile, isProfileComplete |
| `src/contexts/app-context.tsx` | Global user state + PostHog |
| `src/lib/validation-schemas.ts` | Zod schemas |
| `src/types/database.ts` | Auto-generated DB types |
