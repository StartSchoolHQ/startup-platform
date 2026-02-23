import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // This route handles the token_hash-based flow used for password reset.
  // It is intentionally separate from /auth/callback (which handles PKCE for invitations).
  if (!token_hash || !type) {
    console.error("Missing token_hash or type in /auth/confirm");
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.verifyOtp({ token_hash, type });

  if (error) {
    console.error("verifyOtp failed:", error.message);
    return NextResponse.redirect(
      `${origin}/auth/auth-code-error?error=${encodeURIComponent(error.message)}`
    );
  }

  // verifyOtp sets the session cookie automatically via @supabase/ssr.
  // Redirect to reset password page — user is now authenticated.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";

  if (isLocalEnv) {
    return NextResponse.redirect(`${origin}/auth/reset-password`);
  } else if (forwardedHost) {
    return NextResponse.redirect(
      `https://${forwardedHost}/auth/reset-password`
    );
  } else {
    return NextResponse.redirect(`${origin}/auth/reset-password`);
  }
}
