import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSetupComplete } from "@/lib/profile-utils";
import { DashboardLayoutWrapper } from "./dashboard-layout-wrapper";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If no user, redirect to login
  if (!user) {
    redirect("/login");
  }

  // Profile setup gate: name + avatar + founder card are required before the dashboard.
  // The /auth/callback redirect alone is not enough — a user who abandons
  // setup and later signs in from /login would otherwise land here.
  const { data: profile } = await supabase
    .from("users")
    .select("name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (!(await isSetupComplete(supabase, user.id, profile))) {
    redirect("/profile/setup");
  }

  return <DashboardLayoutWrapper>{children}</DashboardLayoutWrapper>;
}
