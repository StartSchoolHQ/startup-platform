# Profile Setup — `/profile/setup`

> Two-step first-run flow after the first Google sign-in: (1) name + profile photo, (2) the founder card. No password — accounts are Google accounts.

## Purpose
The bridge between "Supabase auth user exists" and "platform user is ready". After the first Google sign-in the `public.users` row exists (created by the `handle_new_auth_user` trigger with the Google name) but has no avatar and no founder card. `isSetupComplete` (in `src/lib/profile-utils.ts`) requires **name + avatar on `users`** and **a row in `founder_profiles`**, and two places enforce it: `/auth/callback` right after sign-in, and `src/app/dashboard/layout.tsx` on every dashboard request. Abandoning the page and coming back through `/login` cannot skip it.

The route is public in middleware, but the page checks auth client-side, bounces anonymous visitors to `/login`, sends already-complete users to `/dashboard`, and drops a user who finished step 1 earlier straight into step 2.

## What it does
- **Step 1 — Complete Your Profile** (`BasicProfileForm`): name pre-filled from `user_metadata` (legacy `first_name + last_name`, else Google's `full_name` / `name`), editable. Avatar upload required (image only, max 5 MB, preview). Upload to the `avatars` bucket → `POST /api/profile/setup` (`update_user_profile` RPC) → `user_profile_setup_completed`.
- **Step 2 — Your Founder Card** (`FounderCardForm`): pick a background lean (Tech / Business / Both), then four short text areas: why that lean, what energizes you, skills you already bring, what a co-founder should cover. Validated with `FounderCardSchema` (Zod, 20–600/800 chars per field), upserted into `public.founder_profiles` under RLS → `founder_card_completed` → `/dashboard`.
- The card replaces the two deleted My Journey tasks MJ-P0-01 and MJ-P0-02 (2026-09-14) and is the data source for the public profile cards planned later.

## How it looks
Blue grid canvas, centered glassy card with a "Step 1 of 2 / Step 2 of 2" label (`SetupShell`). Step 1: avatar picker with live preview, Full Name input, pink "Continue". Step 2: three selectable lean tiles, four text areas with inline field errors, pink "Finish setup". Errors surface in a dismissible banner at the top of the card.

## Thought behind it
Google already verified the identity, so asking for a password would only create a second credential to forget. The name is editable because Google display names are often nicknames or surname-first. Avatar stays mandatory because an empty avatar looks broken in every list the platform renders. The founder card sits in onboarding rather than in the task list because half a dataset is useless for team matching — every account has one before it sees the dashboard.

## Wired-up bits
- **Files:** `src/app/profile/setup/page.tsx`, `src/components/profile/setup-shell.tsx`, `src/components/profile/basic-profile-form.tsx`, `src/components/profile/founder-card-form.tsx`, `src/app/api/profile/setup/route.ts`, `src/lib/profile-utils.ts` (`isProfileComplete`, `hasFounderCard`, `isSetupComplete`), `src/lib/validation-schemas.ts` (`FounderCardSchema`), `src/app/dashboard/layout.tsx` (gate)
- **DB:** `update_user_profile` RPC, `avatars` storage bucket, `public.founder_profiles` (migrations `founder_profiles_v1`, `founder_profiles_v1_tighten_grants`)
- **Analytics:** `user_profile_setup_completed` (`has_avatar`, `name_prefilled`), `founder_card_completed` (`lean`)
