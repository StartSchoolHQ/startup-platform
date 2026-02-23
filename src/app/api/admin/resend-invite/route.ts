import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { ResendInviteSchema } from "@/lib/validation-schemas";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin role
    const { data: userProfile } = await supabase
      .from("users")
      .select("primary_role")
      .eq("id", user.id)
      .single();

    if (userProfile?.primary_role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Validate input with Zod
    const validationResult = ResendInviteSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const { email } = validationResult.data;
    const metadata = body.metadata || {};

    // Admin client with service role
    const adminClient = createAdminClient();

    // Just call inviteUserByEmail again - Supabase handles the rest
    // This will send a new invitation email with a fresh 24-hour link
    const { error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(email, {
        data: metadata || {},
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/profile/setup`,
      });

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Resend invite error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
