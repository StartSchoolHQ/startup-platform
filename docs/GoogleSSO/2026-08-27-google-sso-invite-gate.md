# Google SSO + Signup Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the token-in-email invitation flow with Google sign-in gated by a `before_user_created` auth hook, so only `@startschool.org` Google accounts can join. Invitations disappear entirely (strict Workspace-only, decided 2026-09-14).

**Architecture:** Login page gets a "Continue with Google" button (`signInWithOAuth`, PKCE, existing `/auth/callback` route does the code exchange). A Postgres auth hook rejects any new-account creation that isn't Google + `@startschool.org`. There is no exceptions path: the admin Invitations tab is removed from the UI in Phase 1. Legacy password login (hidden behind a toggle) and old invite routes stay on disk untouched until Phase 2. `dashboard/layout.tsx` enforces profile completeness on every dashboard request.

**Tech Stack:** Next.js 16 App Router, `@supabase/ssr` 0.7, `@supabase/supabase-js` 2.57, Supabase Auth Hooks (Postgres), Vitest, Zod, ShadCN.

**Spec:** `docs/GoogleSSO/2026-08-27-google-sso-invite-gate-design.md`

## Global Constraints

- Work on `develop`; never push to `master` until the E2E checklist (Task 11) passes on `https://startup-platform-nine.vercel.app`.
- DB changes: write the SQL file under `supabase/migrations/` **and** apply it with MCP `apply_migration` (name = file stem). Take a manual Supabase backup first (Dashboard → Database → Backups).
- V2 pattern: do not delete or edit `src/app/api/admin/bulk-invite/route.ts`, `resend-invite`, `pending-invites`, `/invite`, `/auth/invite`, or the hash logic in `src/app/page.tsx` in Phase 1.
- Prettier: double quotes, `printWidth: 80`, trailing commas `es5`. ESLint runs via lint-staged on commit.
- Tests: Vitest, `tests/**/*.test.ts`, service-role client from `tests/setup.ts` (`getAdminClient()`), test emails end in `@test.local`. `public.users.id` has **no** FK to `auth.users` — tests must delete both rows.
- Error UX: Sonner toasts / inline errors only. Never `alert()`.
- Files < ~200 lines; split when growing.
- Commit prefixes: `feat:`, `fix:`, `test:`, `docs:`, `chore:`.
- Do **not** set `hd` on the Google button.
- E2E needs a throwaway @startschool.org Google account that has never logged in (Elias creates it).
- Decisions 2026-09-14 (Elias): **strict Workspace-only** (no admin create-account route/tab — Task 8 rewritten); **Google button + hidden legacy password form**; **setup = Google name pre-filled/editable + mandatory avatar**; data fixes in Task 9 each need an explicit OK at execution time.
- Status 2026-09-14 (later): Tasks 1, 2, 5, 6, 7, 8, 10 implemented on branch `feature/google-sso` (one commit each pending); Task 4 (enable hook) and Task 11 (E2E on preview) wait on Elias's Supabase provider + hook steps. Task 3 applied to prod (`google_sso_signup_gate_v1`, version 20260914135244, backup waived by Elias); 10/10 tests green. Follow-up `google_sso_signup_gate_v1_revoke_trigger_exec` (20260914135439) revoked PUBLIC/anon/authenticated EXECUTE on both trigger functions (linter hygiene). Hook NOT yet enabled in the dashboard.
- Decisions 2026-08-27 (Elias): **no approval gate** — @startschool.org Google users land in the dashboard immediately; **auto-assign batch** — `handle_new_auth_user` sets `users.batch_id` to the single open `diploma_batches` row (`closed_at IS NULL`); if 0 or >1 batches are open it leaves NULL.

---

## Phase 0 — Manual prerequisites (Elias, ~15 min)

- [ ] **P0.1** Supabase Dashboard → Database → Backups → *Create backup* (note the timestamp here: ________).
- [ ] **P0.2** Google Cloud Console → create OAuth client (Web application). Origins: `https://startup.startschool.org`, `https://startup-platform-nine.vercel.app`, `http://localhost:3000`. Redirect URI: `https://ksoohvygoysofvtqdumz.supabase.co/auth/v1/callback`. Audience: **External** (Internal would block the 2 existing gmail students), scopes `openid email profile`, published to production.
- [ ] **P0.3** Supabase → Authentication → Providers → Google → enable, paste Client ID/Secret, save.
- [ ] **P0.5** Diplomas → Setup → **create the new cohort batch** before any student signs in. Mercury-Redstone was closed 2026-08-27 14:12 UTC, so there are currently **0 open batches** — without a new one, self-service signups get `batch_id = NULL`.
- [ ] **P0.4** Confirm `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` exist in `.env.local` (tests need them). Do not paste values into chat.

**Do NOT enable the auth hook yet** — Task 3 creates the function first. P0.1 (backup) gates Task 3 Step 4.

---

## Phase 1 — Ship before the cohort

### Task 1: Middleware route classification (fix `"/"` matching every path)

**Files:**
- Create: `src/lib/supabase/route-classification.ts`
- Modify: `src/lib/supabase/middleware.ts:41-101`
- Test: `tests/auth/route-classification.test.ts`

**Interfaces:**
- Produces: `classifyRoute(pathname: string): { isPublic: boolean; isProtected: boolean; isScholarshipPublic: boolean }`

- [x] **Step 1: Write the failing test**

```ts
// tests/auth/route-classification.test.ts
import { describe, it, expect } from "vitest";
import { classifyRoute } from "@/lib/supabase/route-classification";

describe("classifyRoute", () => {
  it("treats / as public but not everything under it", () => {
    expect(classifyRoute("/").isPublic).toBe(true);
    expect(classifyRoute("/dashboard").isPublic).toBe(false);
    expect(classifyRoute("/dashboard/admin/users").isPublic).toBe(false);
  });

  it("marks dashboard routes as protected", () => {
    expect(classifyRoute("/dashboard").isProtected).toBe(true);
    expect(classifyRoute("/dashboard/team-journey").isProtected).toBe(true);
    expect(classifyRoute("/login").isProtected).toBe(false);
  });

  it("keeps auth and setup routes public", () => {
    for (const p of [
      "/login",
      "/auth/callback",
      "/auth/confirm",
      "/auth/reset-password",
      "/auth/auth-code-error",
      "/profile/setup",
      "/invite",
    ]) {
      expect(classifyRoute(p).isPublic, p).toBe(true);
    }
  });

  it("flags scholarship pages for noindex", () => {
    expect(classifyRoute("/agreement/abc").isScholarshipPublic).toBe(true);
    expect(classifyRoute("/full-scholarship-agreement").isScholarshipPublic).toBe(
      true
    );
    expect(classifyRoute("/dashboard").isScholarshipPublic).toBe(false);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/auth/route-classification.test.ts`
Expected: FAIL — cannot resolve `@/lib/supabase/route-classification`.

- [x] **Step 3: Write the implementation**

```ts
// src/lib/supabase/route-classification.ts
const PUBLIC_PREFIXES = [
  "/login",
  "/auth/",
  "/profile/setup",
  "/invite",
  "/full-scholarship-agreement",
  "/partial-scholarship-agreement",
  "/part-time-agreement",
  "/laptop-agreement",
  "/keycard-agreement",
  "/agreement/",
  "/privacy/scholarship-agreement",
];

const SCHOLARSHIP_NOINDEX_PREFIXES = [
  "/full-scholarship-agreement",
  "/partial-scholarship-agreement",
  "/part-time-agreement",
  "/laptop-agreement",
  "/keycard-agreement",
  "/agreement/",
  "/privacy/scholarship-agreement",
];

const PROTECTED_PREFIXES = ["/dashboard"];

export interface RouteClass {
  isPublic: boolean;
  isProtected: boolean;
  isScholarshipPublic: boolean;
}

export function classifyRoute(pathname: string): RouteClass {
  const isPublic =
    pathname === "/" || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isScholarshipPublic = SCHOLARSHIP_NOINDEX_PREFIXES.some((p) =>
    pathname.startsWith(p)
  );
  return { isPublic, isProtected, isScholarshipPublic };
}
```

- [x] **Step 4: Wire it into the middleware**

Replace lines 41–101 of `src/lib/supabase/middleware.ts` (from `// Define routes that should be excluded` through the `/login` redirect) with:

```ts
  const { isPublic, isProtected, isScholarshipPublic } = classifyRoute(
    request.nextUrl.pathname
  );

  // Hidden public scholarship pages + the privacy notice: noindex +
  // no-referrer so the URLs don't leak into search engines or
  // third-party Referer headers.
  if (isScholarshipPublic) {
    supabaseResponse.headers.set(
      "X-Robots-Tag",
      "noindex, nofollow, noarchive"
    );
    supabaseResponse.headers.set("Referrer-Policy", "no-referrer");
  }

  if (isPublic) {
    return supabaseResponse;
  }

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
```

Add the import at the top: `import { classifyRoute } from "./route-classification";`

Note: the old `user && /login → /dashboard` redirect is intentionally dropped — `/login` is public and returns early anyway (that redirect was dead code before, and `/login` needs to stay reachable so a logged-in legacy user can still see the Google button and link their account).

- [x] **Step 5: Run tests + lint**

Run: `npx vitest run tests/auth/route-classification.test.ts && npx eslint src/lib/supabase`
Expected: PASS, no lint errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/supabase/route-classification.ts src/lib/supabase/middleware.ts tests/auth/route-classification.test.ts
git commit -m "fix(auth): exact-match / in middleware public routes"
```

---

### Task 2: Profile completeness requires avatar

**Files:**
- Modify: `src/lib/profile-utils.ts:64-69`
- Test: `tests/auth/profile-utils.test.ts`

**Interfaces:**
- Produces: `isProfileComplete(profile: UserProfile | null): boolean` — true only when `name` and `avatar_url` are both non-empty.

- [x] **Step 1: Write the failing test**

```ts
// tests/auth/profile-utils.test.ts
import { describe, it, expect } from "vitest";
import { isProfileComplete } from "@/lib/profile-utils";

const base = { id: "u1", email: "a@startschool.org" };

describe("isProfileComplete", () => {
  it("requires both name and avatar", () => {
    expect(
      isProfileComplete({ ...base, name: "Ann", avatar_url: "https://x/a.png" })
    ).toBe(true);
  });
  it("is false without avatar", () => {
    expect(isProfileComplete({ ...base, name: "Ann", avatar_url: null })).toBe(
      false
    );
  });
  it("is false without name", () => {
    expect(
      isProfileComplete({ ...base, name: null, avatar_url: "https://x/a.png" })
    ).toBe(false);
  });
  it("is false for null profile", () => {
    expect(isProfileComplete(null)).toBe(false);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/auth/profile-utils.test.ts`
Expected: FAIL on "is false without avatar".

- [x] **Step 3: Implement**

Replace lines 64–69 of `src/lib/profile-utils.ts`:

```ts
/**
 * A profile is complete when the user has a display name AND an avatar.
 * Both are collected on /profile/setup.
 */
export function isProfileComplete(profile: UserProfile | null): boolean {
  return !!profile?.name?.trim() && !!profile?.avatar_url?.trim();
}
```

- [x] **Step 4: Run test**

Run: `npx vitest run tests/auth/profile-utils.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/profile-utils.ts tests/auth/profile-utils.test.ts
git commit -m "fix(auth): profile completeness requires avatar"
```

---

### Task 3: DB migration — signup gate hook + `handle_new_auth_user` v2

**Files:**
- Create: `supabase/migrations/20260914135244_google_sso_signup_gate_v1.sql` ✅ written 2026-09-14
- Test: `tests/auth/signup-gate.test.ts` ✅ written 2026-09-14 (10 tests; 7 fail before the migration, as expected)

**Interfaces:**
- Produces: `public.hook_restrict_signup(event jsonb) returns jsonb` (callable by `supabase_auth_admin`, `service_role`), `public.handle_new_auth_user_backup_v1()` (rollback copy), updated `public.handle_new_auth_user()` (name from Google/invite metadata + auto-assign the single open batch).

- [x] **Step 1: Write the failing test**

```ts
// tests/auth/signup-gate.test.ts
import { describe, it, expect, afterEach } from "vitest";
import { getAdminClient } from "../setup";

function event(email: string, provider: string) {
  return {
    metadata: { name: "before-user-created" },
    user: {
      email,
      app_metadata: { provider, providers: [provider] },
      user_metadata: {},
    },
  };
}

describe("hook_restrict_signup", () => {
  it("allows google + @startschool.org", async () => {
    const { data, error } = await getAdminClient().rpc("hook_restrict_signup", {
      event: event("new.person@startschool.org", "google"),
    });
    expect(error).toBeNull();
    expect(data).toEqual({});
  });

  it("is case-insensitive on the domain", async () => {
    const { data } = await getAdminClient().rpc("hook_restrict_signup", {
      event: event("New.Person@StartSchool.ORG", "google"),
    });
    expect(data).toEqual({});
  });

  it("rejects google + other domain with 403", async () => {
    const { data } = await getAdminClient().rpc("hook_restrict_signup", {
      event: event("someone@gmail.com", "google"),
    });
    expect(data.error.http_code).toBe(403);
    expect(data.error.message).toMatch(/@startschool\.org/);
  });

  it("rejects email/password signups even for the domain", async () => {
    const { data } = await getAdminClient().rpc("hook_restrict_signup", {
      event: event("new.person@startschool.org", "email"),
    });
    expect(data.error.http_code).toBe(403);
  });

  it("rejects look-alike domains", async () => {
    const { data } = await getAdminClient().rpc("hook_restrict_signup", {
      event: event("x@startschool.org.evil.com", "google"),
    });
    expect(data.error.http_code).toBe(403);
  });
});

describe("handle_new_auth_user v2", () => {
  const created: string[] = [];

  afterEach(async () => {
    const sb = getAdminClient();
    for (const id of created) {
      await sb.auth.admin.deleteUser(id);
      await sb.from("users").delete().eq("id", id);
    }
    created.length = 0;
  });

  it("uses full_name for Google-shaped metadata", async () => {
    const sb = getAdminClient();
    const email = `test_g_${Date.now()}@test.local`;
    const { data, error } = await sb.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: "Google Person", name: "Google Person" },
    });
    expect(error).toBeNull();
    created.push(data.user!.id);
    const { data: profile } = await sb
      .from("users")
      .select("name, avatar_url")
      .eq("id", data.user!.id)
      .single();
    expect(profile?.name).toBe("Google Person");
    expect(profile?.avatar_url).toBeNull();
  });

  it("prefers first_name + last_name when present", async () => {
    const sb = getAdminClient();
    const email = `test_i_${Date.now()}@test.local`;
    const { data } = await sb.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { first_name: "Inv", last_name: "Ited", full_name: "X" },
    });
    created.push(data.user!.id);
    const { data: profile } = await sb
      .from("users")
      .select("name")
      .eq("id", data.user!.id)
      .single();
    expect(profile?.name).toBe("Inv Ited");
  });

  it("leaves name null when no metadata", async () => {
    const sb = getAdminClient();
    const email = `test_n_${Date.now()}@test.local`;
    const { data } = await sb.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    created.push(data.user!.id);
    const { data: profile } = await sb
      .from("users")
      .select("name")
      .eq("id", data.user!.id)
      .single();
    expect(profile?.name).toBeNull();
  });

  it("assigns the single open batch (NULL when 0 or >1 are open)", async () => {
    const sb = getAdminClient();
    const { data: open } = await sb
      .from("diploma_batches")
      .select("id")
      .is("closed_at", null);
    const expected = open?.length === 1 ? open[0].id : null;

    const email = `test_b_${Date.now()}@test.local`;
    const { data } = await sb.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    created.push(data.user!.id);
    const { data: profile } = await sb
      .from("users")
      .select("batch_id")
      .eq("id", data.user!.id)
      .single();
    expect(profile?.batch_id).toBe(expected);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/auth/signup-gate.test.ts`
Expected: FAIL — `hook_restrict_signup` does not exist (PGRST202), "uses full_name" fails (name null), and the batch test fails whenever exactly one batch is open (current trigger never sets `batch_id`).

- [x] **Step 3: Write the migration file**

```sql
-- supabase/migrations/20260914135244_google_sso_signup_gate_v1.sql (the committed file is the source of truth; this block is the August draft)
-- Google SSO signup gate + handle_new_auth_user v2.
-- Rollback: see docs/GoogleSSO/2026-08-27-google-sso-invite-gate-design.md

-- 1. Backup of the current trigger function (verbatim copy, never attached).
CREATE OR REPLACE FUNCTION public.handle_new_auth_user_backup_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    name,
    invited_by,
    avatar_url
  ) VALUES (
    NEW.id,
    NEW.email,
    CASE
      WHEN NEW.raw_user_meta_data->>'first_name' IS NOT NULL
      THEN CONCAT(
        NEW.raw_user_meta_data->>'first_name',
        ' ',
        NEW.raw_user_meta_data->>'last_name'
      )
      ELSE NULL
    END,
    (NEW.raw_user_meta_data->>'invited_by')::uuid,
    NULL
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- 2. v2: understands Google metadata (full_name / name) and auto-assigns
--    the single open batch (exactly one open → assign; 0 or >1 → NULL).
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_name text;
  v_invited_by uuid;
  v_batch_id uuid;
BEGIN
  v_name := COALESCE(
    NULLIF(TRIM(CONCAT_WS(' ', v_meta->>'first_name', v_meta->>'last_name')), ''),
    NULLIF(TRIM(v_meta->>'full_name'), ''),
    NULLIF(TRIM(v_meta->>'name'), '')
  );

  BEGIN
    v_invited_by := NULLIF(v_meta->>'invited_by', '')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    v_invited_by := NULL;
  END;

  SELECT CASE WHEN COUNT(*) = 1 THEN (ARRAY_AGG(id))[1] END
    INTO v_batch_id
  FROM public.diploma_batches
  WHERE closed_at IS NULL;

  INSERT INTO public.users (id, email, name, invited_by, avatar_url, batch_id)
  VALUES (NEW.id, NEW.email, v_name, v_invited_by, NULL, v_batch_id)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- 3. Before-user-created hook: only Google + @startschool.org may self-create.
--    Admin createUser bypasses this hook (GoTrue adminUserCreate does not call it).
CREATE OR REPLACE FUNCTION public.hook_restrict_signup(event jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_email text := LOWER(TRIM(COALESCE(event->'user'->>'email', '')));
  v_provider text := COALESCE(event->'user'->'app_metadata'->>'provider', '');
BEGIN
  IF v_provider <> 'google' THEN
    RETURN jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'Sign in with your @startschool.org Google account to use StartSchool.',
        'http_code', 403
      )
    );
  END IF;

  IF SPLIT_PART(v_email, '@', 2) <> 'startschool.org' THEN
    RETURN jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'Only @startschool.org Google accounts can sign in to StartSchool.',
        'http_code', 403
      )
    );
  END IF;

  RETURN '{}'::jsonb;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.hook_restrict_signup(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hook_restrict_signup(jsonb) TO supabase_auth_admin, service_role;
```

- [x] **Step 4: Apply with MCP**

**Requires P0.1 backup first.** Use `mcp__supabase__apply_migration` with `name: "google_sso_signup_gate_v1"` and the exact contents of the migration file. Then verify:

```sql
select proname from pg_proc where pronamespace='public'::regnamespace
  and proname in ('hook_restrict_signup','handle_new_auth_user','handle_new_auth_user_backup_v1');
select tgname, tgenabled from pg_trigger where tgrelid='auth.users'::regclass and tgname='on_auth_user_created';
```
Expected: 3 functions, trigger still `O` (enabled).

- [x] **Step 5: Run tests**

Run: `npx vitest run tests/auth/signup-gate.test.ts`
Expected: PASS (10 tests). Then confirm no leftovers: `select count(*) from auth.users where email like 'test_%@test.local'` → 0.

- [x] **Step 6: Run advisors**

Use `mcp__supabase__get_advisors` type `security`; confirm no new lint about `hook_restrict_signup` (it has `search_path` set and no `SECURITY DEFINER`).

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260914135244_google_sso_signup_gate_v1.sql tests/auth/signup-gate.test.ts
git commit -m "feat(auth): before-user-created signup gate + handle_new_auth_user v2"
```

---

### Task 4: Enable the hook and prove it live

**Files:**
- Test: `tests/auth/signup-gate-live.test.ts`

- [ ] **Step 1 (manual, Elias):** Supabase → Authentication → Hooks → *Before User Created* → Enable → Postgres → schema `public` → function `hook_restrict_signup` → Save.

- [ ] **Step 2: Write the live test**

```ts
// tests/auth/signup-gate-live.test.ts
// Hits GoTrue for real with the anon key. Proves the hook is ENABLED in the
// dashboard, not just present in the DB. Cleans up if the hook is off.
import { describe, it, expect, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { getAdminClient } from "../setup";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const email = `test_live_${Date.now()}@startschool.org`;

describe("signup gate (live GoTrue)", () => {
  afterAll(async () => {
    // If the hook was disabled, a real user got created — remove it.
    const sb = getAdminClient();
    const { data } = await sb.auth.admin.listUsers({ perPage: 1000 });
    const u = data.users.find((x) => x.email === email);
    if (u) {
      await sb.auth.admin.deleteUser(u.id);
      await sb.from("users").delete().eq("id", u.id);
    }
  });

  it("blocks email/password signup even for @startschool.org", async () => {
    const client = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.signUp({
      email,
      password: "Temp-Password-123!",
    });
    expect(data.user).toBeNull();
    expect(error).not.toBeNull();
    expect(error!.status).toBe(403);
  });
});
```

- [ ] **Step 3: Run it**

Run: `npx vitest run tests/auth/signup-gate-live.test.ts`
Expected: PASS. If it FAILS with `data.user` present → the hook is not enabled; the `afterAll` deletes the stray user; go back to Step 1.

- [ ] **Step 4: Commit**

```bash
git add tests/auth/signup-gate-live.test.ts
git commit -m "test(auth): live check that signup gate hook is enabled"
```

---

### Task 5: `/auth/auth-code-error` page + callback error handling

**Files:**
- Create: `src/app/auth/auth-code-error/page.tsx`
- Modify: `src/app/auth/callback/route.ts:6-16`

**Interfaces:**
- Consumes: `?error=<human message>` query param.

- [x] **Step 1: Create the page** — restyle to the current login page tokens (`bg-background`, `text-muted-foreground`, ShadCN `Card`), not the old blue grid below; the structure/copy is what matters.

```tsx
// src/app/auth/auth-code-error/page.tsx
"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function Content() {
  const params = useSearchParams();
  const message = params.get("error");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0000dd] p-4">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[size:24px_24px]" />
      <Card className="relative z-10 w-full max-w-md border-zinc-800/50 bg-zinc-900/80 shadow-2xl backdrop-blur-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
            <AlertCircle className="h-6 w-6 text-red-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-[#ff78c8]">
            Sign-in didn&apos;t work
          </CardTitle>
          <CardDescription className="mt-2 text-zinc-400">
            {message ??
              "We couldn't complete your sign-in. Please try again from the login page."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-400">
            Use your <strong className="text-zinc-200">@startschool.org</strong>{" "}
            Google account. If you are in the programme and don&apos;t have one,
            email{" "}
            <a className="text-[#ff78c8] underline" href="mailto:start@startschool.org">
              start@startschool.org
            </a>
            .
          </p>
          <Button
            className="w-full bg-[#ff78c8] py-6 text-base font-semibold text-white hover:bg-[#ff60b8]"
            onClick={() => (window.location.href = "/login")}
          >
            Back to login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthCodeErrorPage() {
  return (
    <Suspense fallback={null}>
      <Content />
    </Suspense>
  );
}
```

- [x] **Step 2: Handle OAuth error params in the callback**

In `src/app/auth/callback/route.ts`, after line 14 (`next` sanitised) and before `const supabase = await createClient();`, insert:

```ts
  // OAuth / hook failures come back as query params on the redirectTo URL.
  const oauthError = searchParams.get("error");
  if (oauthError) {
    const description =
      searchParams.get("error_description") ?? oauthError;
    console.error("OAuth callback error:", oauthError, description);
    return NextResponse.redirect(
      `${origin}/auth/auth-code-error?error=${encodeURIComponent(description)}`
    );
  }
```

- [x] **Step 3: Type-check + lint**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint src/app/auth`
Expected: clean.

- [ ] **Step 4: Manual check**

Run `npm run dev`, open `http://localhost:3000/auth/callback?error=access_denied&error_description=Only%20%40startschool.org` → lands on the error page showing the message. Open `http://localhost:3000/auth/auth-code-error` → generic message.

- [ ] **Step 5: Commit**

```bash
git add src/app/auth/auth-code-error/page.tsx src/app/auth/callback/route.ts
git commit -m "feat(auth): real error page + OAuth error handling in callback"
```

---

### Task 6: Google sign-in button on the login page

**Files:**
- Create: `src/components/auth/google-sign-in-button.tsx`
- Modify: `src/app/login/page.tsx` (form section; keep password form under a collapsible)

**Interfaces:**
- Produces: `<GoogleSignInButton next?: string />`

- [x] **Step 1: Create the button component**

```tsx
// src/components/auth/google-sign-in-button.tsx
"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import posthog from "posthog-js";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface GoogleSignInButtonProps {
  next?: string;
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.8 6C12.3 13.2 17.7 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.5 24.5c0-1.6-.1-2.8-.4-4H24v7.6h12.7c-.3 2.1-1.7 5.3-4.8 7.4l7.4 5.7c4.4-4.1 7.2-10.1 7.2-16.7z"
      />
      <path
        fill="#FBBC05"
        d="M10.4 28.7A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.8-6z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2 1.4-4.8 2.4-8.5 2.4-6.3 0-11.7-3.7-13.6-9l-7.8 6C6.5 42.6 14.6 48 24 48z"
      />
    </svg>
  );
}

export function GoogleSignInButton({ next = "/dashboard" }: GoogleSignInButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    posthog.capture("user_login_google_started");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      setLoading(false);
      toast.error(
        `Google sign-in could not start (${error.message}). Try again or contact an admin.`
      );
    }
    // On success the browser navigates to Google; nothing else to do here.
  };

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="w-full gap-3 rounded-lg bg-white py-6 text-base font-semibold text-zinc-900 hover:bg-zinc-100 disabled:opacity-60"
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleMark />}
      Continue with Google
    </Button>
  );
}
```

- [x] **Step 2: Restructure the login page** (current code, post 2026-09 redesign: `src/app/login/page.tsx` is a server component with a brand panel + form panel and renders `<LoginForm />` from `src/components/auth/login-form.tsx`)

1. Create `src/components/auth/login-methods.tsx` (client): renders `<GoogleSignInButton />`, then a ShadCN `Collapsible` whose trigger reads `Use password instead` (text button, `text-muted-foreground`), with `<LoginForm />` inside `CollapsibleContent`. Keep it under 60 lines.
2. In `src/app/login/page.tsx`: replace `<LoginForm />` with `<LoginMethods />`; change the sub-heading `Use the email you were invited with.` → `Use your @startschool.org Google account.`; replace the footer paragraph (`No account? Invitations come from your programme lead…`) with `First time here? Your account is created automatically when you sign in with Google.`
3. In `src/components/auth/login-form.tsx`: change the "Invalid login credentials" copy to `Wrong email or password. New here? Use "Continue with Google" above.` Nothing else changes in the form.

- [x] **Step 3: Verify file size + lint**

Run: `npx eslint src/app/login src/components/auth`

- [ ] **Step 4: Manual check (dev)**

`npm run dev` → `/login` shows only the Google button; `Use password instead` reveals the legacy form. Click Google → Google account picker appears (Phase 0 done) → cancel → lands on `/auth/auth-code-error` with a message.

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/google-sign-in-button.tsx src/components/auth/login-methods.tsx src/components/auth/login-form.tsx src/app/login/page.tsx
git commit -m "feat(auth): Google sign-in button, password login demoted to legacy"
```

---

### Task 7: Profile setup without password + setup gate (R11)

**Files:**
- Modify: `src/app/profile/setup/page.tsx`
- Modify: `src/app/dashboard/layout.tsx`

- [x] **Step 1: Remove password handling**

In `src/app/profile/setup/page.tsx`:
1. Delete state `password`, `confirmPassword` (lines 29–30) and the `PasswordInput` import (line 22).
2. Delete the validation blocks for password (lines 119–132).
3. Delete the `supabase.auth.updateUser({ password })` block (lines 175–185).
4. Delete the `<motion.div>` wrapping `<PasswordInput …/>` (lines 363–376).
5. Change the `CardDescription` to: `Add a profile photo so your team can recognise you`.
6. Allow the name to be edited even when pre-filled: change `disabled={loading || isNamePrefilled}` to `disabled={loading}`, remove the `cursor-not-allowed opacity-60` conditional class, and change the hint to `Pre-filled from your account — you can edit it`.
7. Name pre-fill: replace the `metadata.first_name && metadata.last_name` block with:
   ```ts
   const metadata = user.user_metadata || {};
   const prefilled =
     [metadata.first_name, metadata.last_name].filter(Boolean).join(" ") ||
     metadata.full_name ||
     metadata.name ||
     "";
   if (prefilled) {
     setName(prefilled);
     setIsNamePrefilled(true);
   }
   ```
8. Delete the `window.location.hash.includes("access_token")` waits (lines 43–50 and 59–66) — hash tokens never reach this page anymore; keep the plain `getUser()` → `/login` redirect.
9. After `getUser()` succeeds, fetch `name, avatar_url` from `users` for `user.id`; if `isProfileComplete` → `router.replace("/dashboard")` (a complete user has no business on this page).

- [x] **Step 1b: Enforce the gate in the dashboard layout**

In `src/app/dashboard/layout.tsx`, after the `if (!user) redirect("/login")` block:

```ts
  const { data: profile } = await supabase
    .from("users")
    .select("name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (!isProfileComplete(profile)) {
    redirect("/profile/setup");
  }
```

Import `isProfileComplete` from `@/lib/profile-utils`. `UserProfile` there must accept the two-column shape — widen the parameter type to `Pick<UserProfile, "name" | "avatar_url"> | null` if it doesn't. Reason: today the setup redirect lives only in `/auth/callback`, so a user who abandons setup and later signs in from `/login` reaches `/dashboard` with no name/avatar.

- [x] **Step 2: Type-check + lint**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint src/app/profile`
Expected: clean (no unused imports).

- [ ] **Step 3: Manual check**

Sign in as a user without an avatar (see Task 10 data step) → `/auth/callback` sends to `/profile/setup` → upload avatar → dashboard.

- [ ] **Step 4: Commit**

```bash
git add src/app/profile/setup/page.tsx src/app/dashboard/layout.tsx src/lib/profile-utils.ts
git commit -m "feat(auth): profile setup collects name + avatar only; dashboard enforces it"
```

---

### Task 8: Remove the admin Invitations tab (strict Workspace-only, 2026-09-14)

**Files:**
- Modify: `src/app/dashboard/admin/users/page.tsx` (`validTabs`, `TabsList`, `TabsContent`, `BulkInviteTab` import)
- Leave on disk (Phase 2 deletes them): `bulk-invite-tab.tsx`, `manual-invite-form.tsx`, `csv-invite-uploader.tsx`, `pending-invitations-table.tsx`, `/api/admin/bulk-invite`, `/api/admin/resend-invite`, `/api/admin/pending-invites`.

- [x] **Step 1:** In `src/app/dashboard/admin/users/page.tsx` drop `"invitations"` from `validTabs`, remove the `Invitations` `TabsTrigger` and its `TabsContent`, and remove the `BulkInviteTab` import. If only one tab remains, drop the `Tabs` wrapper and render `AdminUsersTable` directly (keep the `?tab=` URL param handling tolerant: unknown → users).
- [x] **Step 2:** Add a one-line hint above the users table (`text-muted-foreground text-sm`): `New students sign in with their @startschool.org Google account — no invitation needed.`
- [x] **Step 3:** `npx eslint src/app/dashboard/admin/users && npx tsc --noEmit -p tsconfig.json`. Dev check: admin → Users shows no Invitations tab; `?tab=invitations` falls back to the users list.
- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/admin/users/page.tsx
git commit -m "feat(admin): remove Invitations tab; accounts come from Google sign-in"
```

---

### Task 9: Data fixes for the cutover

**Files:** none (MCP `execute_sql`, no migration)

- [ ] **Step 1: Confirm the one pending real invitee so Google can link** — ⚠️ ask Elias for an explicit OK before running (auth.users write)

```sql
update auth.users
set email_confirmed_at = now(), confirmation_token = ''
where email = 'liga.letina@gmail.com' and email_confirmed_at is null;
```
Verify: `select email, email_confirmed_at from auth.users where email='liga.letina@gmail.com'`.
Tell Liga: "Go to startup.startschool.org → Continue with Google → pick liga.letina@gmail.com".

- [ ] **Step 2: Remove the five unconfirmed leftover accounts** — ⚠️ approved in principle 2026-08-27; re-confirm with Elias immediately before running (destructive). Re-verified 2026-09-14: still exactly these 5 + Liga, all 6 have a `public.users` row.

Targets: `zirgagalva0@startschool.org`, `test_1785789930@startschool.org`, `gints@startschool.org`, `parole@parole.lv`, `parole@startschool.org` — created 2026-08-03/04 via direct `signUp`, never confirmed, never logged in. Unconfirmed accounts can't be auto-linked by Google, so they must go.

Snapshot first (same pattern as the 2026-07-28 dropout removal), via MCP `execute_sql`:

```sql
create table if not exists public.deleted_unconfirmed_backup_20260914 as
select 'auth_users' as tbl, to_jsonb(u) as row_data from auth.users u
where u.email_confirmed_at is null and u.email in (
  'zirgagalva0@startschool.org','test_1785789930@startschool.org',
  'gints@startschool.org','parole@parole.lv','parole@startschool.org')
union all
select 'users', to_jsonb(p) from public.users p
where p.id in (select id from auth.users where email_confirmed_at is null and email in (
  'zirgagalva0@startschool.org','test_1785789930@startschool.org',
  'gints@startschool.org','parole@parole.lv','parole@startschool.org'));
```
Verify the snapshot has 10 rows (5 + 5). Then remove each account with `getAdminClient().auth.admin.deleteUser(id)` followed by removing the matching `public.users` row by id (the 5 ids come from the snapshot's `auth_users` rows). Use the admin API rather than raw SQL so GoTrue also clears sessions/identities.

Verify: `select count(*) from auth.users where email_confirmed_at is null` → **0** (Liga was confirmed in Step 1). Drop the backup table after Phase 2.

- [ ] **Step 3: Record in CLAUDE.md rollback section**

Append under "Rollback Reference": date, Liga confirmed, the 5 removals + `deleted_unconfirmed_backup_20260914` (restore with `jsonb_populate_record`, auth_users first), and that `handle_new_auth_user_backup_v1` exists.

---

### Task 10: Docs

**Files:**
- Modify: `docs/documentation/invitations.md` (section "Admin Bulk Invitations")
- Modify: `docs/pages/public/login.md` (header + "What it does")
- Modify: `docs/pages/public/profile-setup.md` (remove password bullets)
- Modify: `.claude/rules/auth-and-middleware.md` (route classification note)

- [x] **Step 1:** In `invitations.md`, replace the "Admin Bulk Invitations" section with: how the hook works (rule table from the spec), "there is no invitation — an @startschool.org Google account is the invitation", legacy routes marked *deprecated — Phase 2 removal*. Update `docs/pages/admin/users.md` (no Invitations tab).
- [x] **Step 2:** In `login.md`, tagline → "Google sign-in (primary) with legacy email/password behind a collapsible"; add the `GoogleSignInButton` and `/auth/auth-code-error` to Wired-up bits.
- [x] **Step 3:** In `profile-setup.md`, remove every password mention; note the name is editable.
- [x] **Step 4:** In `auth-and-middleware.md`, add: "Route classification lives in `src/lib/supabase/route-classification.ts` — `/` is exact-match, everything else is prefix."
- [ ] **Step 5: Commit**

```bash
git add docs/documentation/invitations.md docs/pages/admin/users.md docs/pages/public/login.md docs/pages/public/profile-setup.md .claude/rules/auth-and-middleware.md
git commit -m "docs(auth): Google SSO + signup gate"
```

---

### Task 11: Full test run, push to develop, E2E on preview

- [ ] **Step 1:** `npm run lint && npm run test` → all green (note: `npm run lint` includes `seam-audit`).
- [ ] **Step 2:** `git push origin develop`. Wait for the Vercel preview (Elias watches it).
- [ ] **Step 3: E2E checklist on `https://startup-platform-nine.vercel.app`** (tick each):
  - [ ] **Existing password user, @startschool.org** (e.g. your own): `/login` → Continue with Google → dashboard. DB: `select provider from auth.identities where user_id = (select id from auth.users where email='eliassbaranovs@startschool.org')` → `email` + `google`. XP/teams untouched.
  - [ ] **Existing gmail student** (one of the 2 active gmail accounts): Google → links → dashboard (or `/profile/setup` if no avatar). Proves the hook doesn't fire for existing accounts.
  - [ ] **Brand-new @startschool.org account** (ask IT for a fresh Workspace alias or use a colleague who has never logged in): Google → account created → `/profile/setup` (name pre-filled from Google) → upload avatar → dashboard. DB: `public.users.name` = Google full name.
  - [ ] **Random gmail not in DB**: Google → `/auth/auth-code-error` showing "Only @startschool.org Google accounts can join…". DB: no new row in `auth.users`.
  - [ ] **Abandoned setup**: new account → close the tab on `/profile/setup` → open `/dashboard` directly → redirected back to `/profile/setup` (Task 7 Step 1b).
  - [ ] **Admin → Users** shows no Invitations tab.
  - [ ] **Legacy password login** still works from the collapsible.
  - [ ] **Forgot password** still works for a legacy user.
  - [ ] Unauthenticated `GET /dashboard` → `/login` (middleware fix).
- [ ] **Step 4:** Only when every box is ticked: `git push origin develop:master`.
- [ ] **Step 5:** Post-deploy check on `https://startup.startschool.org`: repeat the first and fourth E2E items.

---

## Phase 2 — Remove legacy (separate approval, ≥1 week after cohort onboarded)

### Task 12: Delete legacy invite paths

**Files:**
- Delete: `src/app/invite/page.tsx`, `src/app/auth/invite/page.tsx`, `src/app/api/admin/bulk-invite/route.ts`, `src/app/api/admin/resend-invite/route.ts`, `src/app/api/admin/pending-invites/route.ts`, `src/components/admin/bulk-invite-tab.tsx`, `src/components/admin/manual-invite-form.tsx`, `src/components/admin/csv-invite-uploader.tsx`, `src/components/admin/pending-invitations-table.tsx`, `docs/pages/public/invite.md`, `docs/pages/public/auth-invite.md`
- Modify: `src/app/page.tsx` (remove the whole `useEffect` hash handler and `isProcessingInvite` state; render `<HeroLanding />` only), `src/lib/validation-schemas.ts` (remove `ResendInviteSchema`), `src/lib/supabase/route-classification.ts` (remove `/invite`), `docs/pages/README.md`, `docs/documentation/invitations.md`.

- [ ] **Step 1:** Confirm no new `user_invited` audit entries since Phase 1 deploy: `select count(*) from auth.audit_log_entries where payload->>'action'='user_invited' and created_at > '<phase1 deploy date>'` → 0.
- [ ] **Step 2:** Delete the files above; `grep -rn "bulk-invite\|resend-invite\|pending-invites\|auth/invite\|ResendInviteSchema" src docs` → only the invitations doc history.
- [ ] **Step 3:** `npm run lint && npm run test && npx tsc --noEmit`.
- [ ] **Step 4:** Commit `chore(auth): remove legacy email-invite flow`, push develop, smoke-test `/`, `/login`, admin Users, then `develop:master`.

### Task 13: Retire passwords (optional, decide after Phase 2)

- Remove the collapsible password form + reset link from `/login`, `src/app/auth/reset-password/page.tsx`, `src/app/auth/confirm/route.ts`, the password section in `src/app/dashboard/account/page.tsx:200-240,460-480`, and `src/components/ui/password-input.tsx`.
- Before doing this, verify every active user has a `google` identity: `select count(*) from auth.users u where not exists (select 1 from auth.identities i where i.user_id=u.id and i.provider='google') and u.last_sign_in_at > now() - interval '60 days'` → must be 0.

---

## Self-review notes

- Spec R1–R11 map to Tasks 3, (none — no exceptions path), 11(E2E), 6, 2+7, 3, 5, 1, 3, (decision), 7 respectively. Decisions (no gate, auto-batch) recorded in Global Constraints. Manual steps → Phase 0 + Task 4 Step 1. Rollback → spec table + Task 9 Step 3.
- `classifyRoute` return shape identical in test, implementation and middleware destructuring.
- `isProfileComplete` change (Task 2) affects `/auth/callback`, `/auth/invite`, `/invite` — the latter two are deleted in Phase 2 and harmless meanwhile (they route incomplete profiles to setup, which is what we want).
- Known accepted gap: Google `picture` not used as avatar; users upload one (spec "Not doing").
