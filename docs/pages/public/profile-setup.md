# Profile Setup — `/profile/setup`

> First-run form where a new user confirms their name and uploads a profile photo before reaching the dashboard. No password — accounts are Google accounts.

## Purpose
The bridge between "Supabase auth user exists" and "platform user is ready". After the first Google sign-in the `public.users` row exists (created by the `handle_new_auth_user` trigger with the Google name) but has no avatar. The dashboard assumes a face everywhere (tasks, peer reviews, team views), so `isProfileComplete` requires **both** `name` and `avatar_url`, and two places enforce it: `/auth/callback` right after sign-in, and `src/app/dashboard/layout.tsx` on every dashboard request (so abandoning this page and coming back through `/login` cannot skip it).

The route is public in middleware, but the page checks auth client-side, bounces anonymous visitors to `/login`, and sends already-complete profiles straight to `/dashboard`.

## What it does
- Pre-fills the name from `user_metadata`: legacy `first_name + last_name` if present, else Google's `full_name` / `name`. The field stays editable ("Pre-filled from your account — you can edit it").
- Avatar upload is required: image only, max 5 MB, preview before submit. Uploaded to the `avatars` bucket under `<user id>/avatar-<timestamp>.<ext>`.
- Submit: upload avatar → `POST /api/profile/setup` (`update_user_profile` RPC with name + public avatar URL) → `user_profile_setup_completed` → `/dashboard`.

## How it looks
Blue grid canvas, centered glassy card titled "Complete Your Profile" with the subtitle "Add a profile photo so your team can recognise you". Avatar picker with live preview, Full Name input, one pink "Complete Setup" button.

## Thought behind it
Google already verified the identity, so asking for a password would only create a second credential to forget. The name is editable because Google display names are often nicknames or surname-first. Avatar stays mandatory for the same reason as before: an empty avatar looks broken in every list the platform renders.

## Wired-up bits
- **Files:** `src/app/profile/setup/page.tsx`, `src/app/api/profile/setup/route.ts`, `src/lib/profile-utils.ts` (`isProfileComplete`), `src/app/dashboard/layout.tsx` (gate)
- **DB:** `update_user_profile` RPC, `avatars` storage bucket
- **Analytics:** `user_profile_setup_completed` (`has_avatar`, `name_prefilled`)
