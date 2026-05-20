# Invite Expired — `/auth/invite-expired`

> A friendly dead-end page that explains why an invitation link no longer works and points the user at a recovery path.

## Purpose
Supabase invitation tokens are single-use and expire after 24 hours. When a user clicks an old or already-consumed link, the auth callback drops them on the landing page with `error=` parameters in the hash; the landing page forwards them here. This route exists so users hit a page that names the problem in plain English and gives them an actionable next step — instead of a generic "auth failed" toast that gets dismissed.

The route is public and read-only. It does not call the Supabase API and cannot recover the session — by the time a user lands here, the token is already burnt.

## What it does
- Reads the optional `?error=...` query parameter via `useSearchParams` (wrapped in `Suspense`) and shows it inside a small "Technical details" red box if present.
- Renders three explanatory blocks in a fixed order:
  1. **What happened?** — bullet list ("Already been used", "Expired (links are valid for 24 hours)", "Been invalidated").
  2. **Technical details** — only renders when `error` query is present.
  3. **What to do next** — pink-tinted callout with a `Mail` icon directing the user to use "Forgot password?" on the login page (which doubles as a profile-setup recovery channel) or contact an admin for a new invitation.
- Single CTA button: pink "Go to Login" using `window.location.href = "/login"` (full navigation, not a `router.push`, ensuring any stale auth state is fully cleared).
- Sets a client-only flag on mount before rendering 15 randomly-positioned floating particles, avoiding hydration mismatch.

## How it looks
The richest visual of the public set. Same blue grid canvas, but with two large blurred pink orbs gently animating behind the card, plus 15 floating pink particles drifting upward (rendered only after `isClient` flips). Centered glassy `max-w-md` card. Header: red `AlertCircle` chip in a soft red circle, then "Invitation Link Expired" in pink, then "This invitation link is no longer valid" in zinc.

The body is a vertical stack of three softly-bordered panels (zinc, red-tinted only if there's an error message, and pink-tinted for the next-steps block with its `Mail` icon). The pink CTA button has the recurring hover light-sweep animation. Below the button, a centered "Already have an account? Sign in here" link in pink. The whole page leans into ambient motion to soften what is functionally bad news.

## Thought behind it
A dead-end page is a UX hazard: users arrive frustrated, having clicked a link that should have just worked. The page treats that frustration deliberately. The order of information is empathic — first "here's what happened to you", then optional technical details for forwarding to support, then "here's what you can do next". The CTA is the recovery path, not just "back to home", because a user who lands here almost always still wants to access the platform.

The recommendation to use "Forgot password?" as the recovery channel is a clever reuse: even if the user never set a password (because they never finished the original invite), the password-reset flow still issues a fresh email and lands them on profile setup, completing the journey their original invite started. That avoids needing a separate "resend invitation" self-service flow.

The ambient animation is louder than on other auth pages because this page is the one most likely to be screenshot and shared with support — and a polished error page signals competence in exactly the moment a user is doubting it. The page deliberately does not auto-redirect or auto-resend; both behaviours would feel presumptuous when the cause might be a malicious or shared link.

## Wired-up bits
- **Page file:** [`src/app/auth/invite-expired/page.tsx`](src/app/auth/invite-expired/page.tsx)
- **Key components:** ShadCN `Card`, `Button`. Lucide icons `AlertCircle`, `Mail`.
- **Hooks:** `useSearchParams` (inside a `Suspense` boundary), `useEffect`, `useState`
- **RPCs / API routes:** none — pure presentational page
- **Auth requirement:** public
- **Notable types or schemas:** none. Particle positions are generated once at module load (`PARTICLES` constant) so they're stable across re-renders.
- **Upstream callers:** [`src/app/page.tsx`](src/app/page.tsx) redirects here when it detects `error=` parameters in an invite hash, forwarding `error_description` (or `error`) as the `error` query param.
