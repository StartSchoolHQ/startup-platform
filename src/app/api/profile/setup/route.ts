import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";

/**
 * Profile Setup API
 *
 * Assumption: public.users record ALWAYS exists (created by auth trigger)
 * This endpoint only UPDATES name and avatar_url
 * Never creates or modifies the user ID
 */
export async function POST(request: Request) {
  try {
    const { name, avatarUrl } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Update profile via secure RPC function
    // Only updates name and avatar_url (safe fields)
    const { data: rpcData, error } = await (supabase as any).rpc(
      "update_user_profile",
      {
        p_name: name.trim(),
        p_avatar_url: avatarUrl || null,
      }
    );

    if (error || !rpcData?.success) {
      console.error("Profile update error:", error || rpcData?.error);
      return NextResponse.json(
        {
          error:
            rpcData?.error || "Failed to update profile. Please try again.",
        },
        { status: 500 }
      );
    }

    const data = rpcData.profile;

    return NextResponse.json({ success: true, profile: data });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
