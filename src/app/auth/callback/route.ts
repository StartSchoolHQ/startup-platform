import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import { waitForProfile, isProfileComplete } from "../../../lib/profile-utils";
import PostHogClient from "../../../lib/posthog-server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // if "next" is in param, use it as the redirect URL
  let next = searchParams.get("next") ?? "/dashboard";
  if (!next.startsWith("/")) {
    // if "next" is not a relative URL, use the default
    next = "/dashboard";
  }

  const supabase = await createClient();

  if (code) {
    // Handle PKCE flow with authorization code
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Check if user needs profile setup (especially for invitations)
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        // Track successful authentication
        const posthog = PostHogClient();
        posthog.capture({
          distinctId: user.id,
          event: "user_authenticated",
          properties: {
            email: user.email,
            auth_method: "email_invite",
          },
        });
        await posthog.shutdown();

        // Wait for trigger to create profile (handles race condition)
        const userProfile = await waitForProfile(supabase, user.id);

        if (!userProfile) {
          // Profile still doesn't exist after retries - shouldn't happen
          console.error("Profile not created by trigger for user:", user.id);
          return NextResponse.redirect(`${origin}/auth/auth-code-error`);
        }

        if (!isProfileComplete(userProfile)) {
          // Profile exists but is incomplete (no name or avatar)
          return NextResponse.redirect(`${origin}/profile/setup`);
        }
      }

      // User profile is complete, proceed to requested destination
      const forwardedHost = request.headers.get("x-forwarded-host"); // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === "development";
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    } else {
      // Code exchange failed - likely expired or already used invite link
      console.error("Code exchange failed:", error.message);

      // Check if user already has a session (code was used before)
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // User has session but code failed - they clicked the link again
        const userProfile = await waitForProfile(supabase, user.id);

        if (userProfile && !isProfileComplete(userProfile)) {
          // Incomplete profile - let them finish setup
          return NextResponse.redirect(`${origin}/profile/setup`);
        } else if (userProfile && isProfileComplete(userProfile)) {
          // Profile complete - go to dashboard
          return NextResponse.redirect(`${origin}/dashboard`);
        }
      }

      // No session and code failed - invite link expired or already used
      return NextResponse.redirect(
        `${origin}/auth/invite-expired?error=${encodeURIComponent(error.message)}`
      );
    }
  } else {
    // No code parameter - check if user already has a session
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Wait for trigger to create profile (handles race condition)
      const userProfile = await waitForProfile(supabase, user.id);

      if (!userProfile) {
        // Profile doesn't exist - shouldn't happen with trigger
        console.error("Profile not found for authenticated user:", user.id);
        return NextResponse.redirect(`${origin}/auth/auth-code-error`);
      }

      if (!isProfileComplete(userProfile)) {
        // Profile exists but is incomplete
        return NextResponse.redirect(`${origin}/profile/setup`);
      } else {
        // Profile is complete, go to dashboard
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
