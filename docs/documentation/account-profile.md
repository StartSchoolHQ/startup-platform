# Account & Profile Management

> The account system handles user profile display and editing, avatar uploads to Supabase Storage, password changes, and the initial profile setup flow for newly invited users. Profile data feeds into the global AppContext used throughout the dashboard.

## Overview

Two main entry points:

1. **Profile Setup** (`/profile/setup`) — New users complete their profile after accepting an invitation (name, avatar, password)
2. **Account Settings** (`/dashboard/account`) — Existing users update their name, avatar, or password

---

## Architecture

### Profile Data Flow

```
Supabase Auth (auth.users)
  ↕ linked by user ID
public.users table (profile data)
  ↕ fetched by AppProvider on mount
AppContext (global state)
  ↕ consumed by components
Dashboard UI (sidebar avatar, greeting, etc.)
```

### Key Files

| File | Role |
|------|------|
| `src/app/dashboard/account/page.tsx` | Account settings page (profile + password) |
| `src/app/profile/setup/page.tsx` | New user profile completion |
| `src/app/api/profile/setup/route.ts` | Profile update API endpoint |
| `src/lib/profile-utils.ts` | `waitForProfile`, `isProfileComplete` |
| `src/contexts/app-context.tsx` | Global user state + PostHog identification |
| `src/components/ui/password-input.tsx` | Password input with strength meter |

---

## Database Schema

### `users` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (= Supabase Auth user ID) |
| `email` | TEXT | User email (unique) |
| `name` | TEXT | Display name (nullable, NULL until profile setup) |
| `avatar_url` | TEXT | Full public URL to avatar in Supabase Storage (nullable) |
| `primary_role` | `primary_role_type` | `"user"` or `"admin"` (nullable) |
| `status` | `status_state` | `"active"` or `"archived"` (nullable) |
| `total_xp` | INT | Aggregated XP |
| `total_points` | INT | Aggregated points |
| `graduation_level` | INT | Current level (nullable) |
| `daily_validation_xp` | INT | XP from daily validations (nullable) |
| `invited_by` | UUID | User who invited them (nullable) |
| `created_at` | TIMESTAMP | Account creation |
| `updated_at` | TIMESTAMP | Last update |

**Notes:**
- `id` links directly to Supabase Auth `auth.users.id`
- `avatar_url` stores the full public URL (not a path)
- Profile record created by DB trigger on auth signup
- `name` is NULL until user completes `/profile/setup`

### `update_user_profile` RPC

```typescript
update_user_profile(p_name: string, p_avatar_url?: string) → Json
```

Updates user's name and optionally avatar URL. Returns `{ success, error?, profile? }`.

---

## Account Settings Page

**Route:** `/dashboard/account`
**File:** `src/app/dashboard/account/page.tsx`
**Type:** Client Component

### Profile Information Card

| Field | Type | Editable | Notes |
|-------|------|----------|-------|
| Avatar | Image upload | Yes | Camera icon trigger, preview on select |
| Full Name | Text input | Yes | Required |
| Email | Text input | No | Read-only, disabled |

**Save flow:**
1. Validate name (trimmed, non-empty)
2. If new avatar selected → upload to Supabase Storage
3. Call RPC: `update_user_profile(p_name, p_avatar_url)`
4. Reload profile data on success

### Change Password Card

| Field | Type | Notes |
|-------|------|-------|
| New Password | Password input | 8+ chars, strength meter |
| Confirm Password | Password input | Must match |

**Save flow:**
1. Validate: passwords match, 8+ characters
2. Call: `supabase.auth.updateUser({ password: newPassword })`
3. Clear both fields on success

**No current password required** — Supabase Auth doesn't require old password verification for authenticated users.

---

## Avatar Upload

### Storage Configuration

| Setting | Value |
|---------|-------|
| Bucket | `"avatars"` |
| Path format | `{userId}/avatar-{timestamp}.{extension}` |
| Cache control | 3600 seconds (1 hour) |
| Upsert | `true` (overwrites existing) |
| Public URL | Via `supabase.storage.from("avatars").getPublicUrl(path)` |

### File Validation

| Rule | Value |
|------|-------|
| Max size | 5 MB |
| Type check | `file.type.startsWith("image/")` |
| Browser accept | `accept="image/*"` |
| Supported formats | JPG, PNG, GIF |

### Upload Process

1. User selects file via hidden `<input type="file">`
2. Client validates size (< 5MB) and type (image/*)
3. Preview displayed via `URL.createObjectURL(file)`
4. On form submit:
   - Generate filename: `{userId}/avatar-{Date.now()}.{ext}`
   - Upload to `"avatars"` bucket with `upsert: true`
   - Get public URL via `getPublicUrl()`
   - Pass URL to `update_user_profile` RPC

**Error messages:**
- Size exceeded: "File size must be less than 5MB"
- Wrong type: "Please select an image file"

---

## Profile Setup (New Users)

**Route:** `/profile/setup`
**File:** `src/app/profile/setup/page.tsx`

### When It's Used

After a new user clicks their invitation magic link:
1. `/auth/callback` exchanges code for session
2. `waitForProfile()` handles DB trigger race condition
3. `isProfileComplete(profile)` checks if name exists
4. If incomplete → redirect to `/profile/setup`

### Form Requirements

| Field | Required | Validation |
|-------|----------|------------|
| Avatar | Yes | 5MB max, image files only |
| Full Name | Yes | At least 1 char, trimmed |
| Password | Yes | 8+ chars |
| Confirm Password | Yes | Must match password |

### Pre-filled Data

Name is extracted from `user.user_metadata` set during invitation:
- `metadata.first_name` + `metadata.last_name` → pre-filled, input disabled
- Shows helper: "Name pre-filled from invitation"

### Submission Flow

1. Validate all fields
2. Upload avatar to Supabase Storage
3. Get public URL
4. Update password: `supabase.auth.updateUser({ password })`
5. Call: `POST /api/profile/setup` with `{ name, avatarUrl }`
6. PostHog event: `user_profile_setup_completed`
7. Redirect to `/dashboard`

---

## Profile Setup API

**Route:** `POST /api/profile/setup`
**File:** `src/app/api/profile/setup/route.ts`

**Request:** `{ name: string, avatarUrl: string }`

**Flow:**
1. Verify authenticated user via `supabase.auth.getUser()`
2. Call RPC: `update_user_profile(p_name, p_avatar_url)`
3. Return: `{ success: true, profile }` or `{ error: "message" }`

---

## Password Input Component

**File:** `src/components/ui/password-input.tsx`

### Props

```typescript
{
  password: string;
  confirmPassword?: string;
  onPasswordChange: (password: string) => void;
  onConfirmPasswordChange?: (confirmPassword: string) => void;
  showConfirmPassword?: boolean;  // Default: true
  disabled?: boolean;
}
```

### Strength Meter

| Score | Label | Color | Bar |
|-------|-------|-------|-----|
| 0 | Too weak | Red | Empty |
| 1 | Weak | Orange | 1/3 |
| 2 | Good | Yellow | 2/3 |
| 3 | Strong | Green | Full |

### Strength Calculation

- `hasLength`: password >= 8 chars (+1)
- `hasNumber && hasLetter`: includes both (+1)
- `hasSpecial`: includes special character (+1)
- `hasMixedCase && length >= 12`: mixed case + 12+ chars (+1)

### Requirements Checklist

- ✓/✗ At least 8 characters
- ✓/✗ At least one special character (!@#$%^&*)
- Match indicator for confirm password

---

## Profile Utilities

**File:** `src/lib/profile-utils.ts`

### `isProfileComplete(profile)`

```typescript
function isProfileComplete(profile: UserProfile | null): boolean {
  return !!profile?.name;  // Only checks if name exists
}
```

Avatar is NOT required for profile completeness.

### `waitForProfile(supabase, userId)`

Handles race condition where auth user is created before DB trigger creates `public.users` record.

**Exponential backoff:**
- Attempt 0: Immediate
- Attempt 1: 50ms
- Attempt 2: 100ms
- Attempt 3: 200ms
- Attempt 4: 400ms
- (Max 5 attempts, ~1.5s total wait)

**Logic:** Query `users` table by ID. If PGRST116 (not found), retry. If other error or max attempts, return null.

---

## AppContext Integration

**File:** `src/contexts/app-context.tsx`

### User Interface

```typescript
interface User {
  id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
  primary_role: string | null;
  total_xp: number | null;
  total_points: number | null;
  graduation_level: number | null;
  created_at: string | null;
}
```

### Context Interface

```typescript
interface AppContextType {
  user: User | null;
  loading: boolean;
  firstName: string;            // user.name?.split(" ")[0] || "User"
  refreshUserData: () => void;  // Triggers React Query refetch
}
```

### React Query Config

| Setting | Value |
|---------|-------|
| Query key | `["user", "profile"]` |
| Stale time | 5 minutes |
| GC time | 10 minutes |
| Enabled | After client mount (hydration safe) |
| Retry | 1 |

### PostHog Identification

On user load, identifies user with: email, name, role, total_xp, total_points, graduation_level.

### Usage

```typescript
const { user, loading, firstName, refreshUserData } = useApp();
```

**Note:** After profile update on account page, `refreshUserData()` or page reload is needed to sync AppContext.

---

## File Reference

| File | Purpose |
|------|---------|
| `src/app/dashboard/account/page.tsx` | Account settings page |
| `src/app/profile/setup/page.tsx` | New user profile setup |
| `src/app/api/profile/setup/route.ts` | Profile update API |
| `src/lib/profile-utils.ts` | waitForProfile, isProfileComplete |
| `src/contexts/app-context.tsx` | Global user state + PostHog |
| `src/components/ui/password-input.tsx` | Password input with strength meter |
| `src/components/ui/avatar.tsx` | Avatar display (Radix-based) |
| `src/lib/supabase/client.ts` | Browser client (avatar upload) |
| `src/lib/supabase/middleware.ts` | Route protection |
| `src/lib/validation-schemas.ts` | Zod schemas |
| `src/types/database.ts` | Auto-generated DB types |
