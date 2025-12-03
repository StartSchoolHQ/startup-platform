import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { name, avatarUrl } = await request.json();

    if (!name || !avatarUrl) {
      return NextResponse.json(
        { error: "Name and avatar URL are required" },
        { status: 400 }
      );
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

    console.log("Updating profile for user:", user.id, user.email);

    // Check if there's an existing profile by ID or email
    const { data: existingProfileById } = await supabase
      .from("users")
      .select("id, email")
      .eq("id", user.id)
      .single();

    const { data: existingProfileByEmail } = await supabase
      .from("users")
      .select("id, email")
      .eq("email", user.email || "")
      .single();

    let data, error;

    if (existingProfileById) {
      // Profile exists with this ID, update it
      console.log("Profile exists by ID, updating");
      const result = await supabase
        .from("users")
        .update({
          name: name.trim(),
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select()
        .single();

      data = result.data;
      error = result.error;
    } else if (existingProfileByEmail) {
      // Profile exists with this email but different ID, update the existing one
      console.log(
        `Profile exists by email but with different ID (${existingProfileByEmail.id}), updating existing profile`
      );
      const result = await supabase
        .from("users")
        .update({
          id: user.id, // Update to current user ID
          name: name.trim(),
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("email", user.email || "")
        .select()
        .single();

      data = result.data;
      error = result.error;
    } else {
      // No profile exists, create new one
      console.log("No profile exists, creating new profile");
      const result = await supabase
        .from("users")
        .insert({
          id: user.id,
          email: user.email || "",
          name: name.trim(),
          avatar_url: avatarUrl,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to save profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, profile: data });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
