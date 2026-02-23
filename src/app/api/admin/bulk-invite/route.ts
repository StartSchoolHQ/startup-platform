import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import {
  BulkInviteSchema,
  type InvitationData,
} from "@/lib/validation-schemas";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX = /^[\p{L}\s'-]{2,50}$/u;

interface InvitationRequest {
  email: string;
  first_name: string;
  last_name: string;
}

interface InvitationResult {
  email: string;
  success: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userProfile } = await supabase
      .from("users")
      .select("primary_role")
      .eq("id", user.id)
      .single();

    if (userProfile?.primary_role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Validate with Zod
    const result = BulkInviteSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: result.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    // Use validated data (email/names are already trimmed and lowercased)
    const { invitations } = result.data;

    // Admin client with service role for invitations
    const adminClient = createAdminClient();

    const results: InvitationResult[] = [];

    for (const invitation of invitations) {
      try {
        // Check if user exists in Supabase Auth (source of truth)
        const { data: authUser } = await adminClient.auth.admin.listUsers();
        const existingAuthUser = authUser.users.find(
          (u) => u.email?.toLowerCase() === invitation.email.toLowerCase()
        );

        if (existingAuthUser) {
          // User already exists - cannot create duplicate
          results.push({
            email: invitation.email,
            success: false,
            error: "User already exists",
          });
          continue;
        }

        // Send invitation email with Supabase's built-in invite system
        // This sends an email with a time-limited link (24 hours by default)
        const { data: inviteData, error: inviteError } =
          await adminClient.auth.admin.inviteUserByEmail(invitation.email, {
            data: {
              first_name: invitation.first_name.trim(),
              last_name: invitation.last_name.trim(),
              invited_by: user.id, // Track who sent the invitation
            },
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/profile/setup`,
          });

        if (inviteError) {
          results.push({
            email: invitation.email,
            success: false,
            error: inviteError.message,
          });
          continue;
        }

        // Create welcome notification
        if (inviteData?.user) {
          await supabase.from("notifications").insert({
            user_id: inviteData.user.id,
            title: "Welcome to StartSchool!",
            message: `Hi ${invitation.first_name}! Check your email for an invitation link to set up your account.`,
            type: "system",
            is_read: false,
          });
        }

        // Success! Invitation email sent → user account created in "invited" state
        // User will show up in auth.users with email_confirmed_at = null until they accept
        results.push({
          email: invitation.email,
          success: true,
        });
      } catch (error) {
        results.push({
          email: invitation.email,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      success: true,
      summary: {
        total: results.length,
        succeeded: successCount,
        failed: results.length - successCount,
      },
      results,
    });
  } catch (error) {
    console.error("Bulk invite error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
