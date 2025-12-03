import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

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
        // Check if user exists in our users table
        const { data: userProfile, error: profileError } = await supabase
          .from("users")
          .select("id, name, avatar_url, email")
          .eq("id", user.id)
          .single();

        if (profileError && profileError.code === "PGRST116") {
          // User doesn't exist in our table, create basic profile
          const { error: insertError } = await supabase.from("users").insert({
            id: user.id,
            email: user.email || "",
            name: null,
            avatar_url: null,
          });

          if (insertError) {
            console.error("Failed to create user profile:", insertError);
          }
          // Redirect to profile setup for new users
          return NextResponse.redirect(`${origin}/profile/setup`);
        } else if (!userProfile?.name || !userProfile?.avatar_url) {
          // Profile exists but is incomplete
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
    }
  } else {
    // No code parameter - check if user already has a session
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // User has a valid session, check their profile
      const { data: userProfile, error: profileError } = await supabase
        .from("users")
        .select("id, name, avatar_url, email")
        .eq("id", user.id)
        .single();

      if (profileError && profileError.code === "PGRST116") {
        // User doesn't exist in our table, create basic profile
        const { error: insertError } = await supabase.from("users").insert({
          id: user.id,
          email: user.email || "",
          name: null,
          avatar_url: null,
        });

        if (insertError) {
          console.error("Failed to create user profile:", insertError);
        }
        // Redirect to profile setup for new users
        return NextResponse.redirect(`${origin}/profile/setup`);
      } else if (!userProfile?.name || !userProfile?.avatar_url) {
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
