import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("primary_role")
      .eq("id", user.id)
      .single();

    if (profile?.primary_role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "50"),
      100
    );
    const search = url.searchParams.get("search") || "";
    const filter = url.searchParams.get("filter") || "all";

    // Get all profile data first (cheaper than auth.admin.listUsers)
    const { data: profiles } = await supabase
      .from("users")
      .select("id, name, primary_role, total_xp, total_points, status");

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    // Get auth users (this is expensive - fetches from Auth service)
    const adminClient = createAdminClient();
    const { data: authData } = await adminClient.auth.admin.listUsers({
      perPage: 1000,
    });
    let authUsers = authData?.users || [];

    // Apply filters
    if (filter === "active") {
      authUsers = authUsers.filter((u) => u.email_confirmed_at);
    } else if (filter === "pending") {
      authUsers = authUsers.filter((u) => !u.email_confirmed_at);
    } else if (filter === "admins") {
      // Filter using already-fetched profile data
      authUsers = authUsers.filter(
        (u) => profileMap.get(u.id)?.primary_role === "admin"
      );
    }

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      authUsers = authUsers.filter(
        (u) =>
          u.email?.toLowerCase().includes(searchLower) ||
          u.user_metadata?.first_name?.toLowerCase().includes(searchLower) ||
          u.user_metadata?.last_name?.toLowerCase().includes(searchLower)
      );
    }

    const total = authUsers.length;
    const from = (page - 1) * limit;
    const to = from + limit;
    const paginatedAuthUsers = authUsers.slice(from, to);

    // Combine auth and profile data (profiles already fetched above)
    const users = paginatedAuthUsers.map((authUser) => {
      const profile = profileMap.get(authUser.id);
      return {
        id: authUser.id,
        name:
          profile?.name ||
          `${authUser.user_metadata?.first_name || ""} ${
            authUser.user_metadata?.last_name || ""
          }`.trim() ||
          null,
        email: authUser.email || "",
        status: authUser.email_confirmed_at ? "active" : "pending",
        primary_role: profile?.primary_role || "user",
        created_at: authUser.created_at,
        total_xp: profile?.total_xp || 0,
        total_points: profile?.total_points || 500,
      };
    });

    return NextResponse.json({
      users: users || [],
      total: total,
      page,
      limit,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
