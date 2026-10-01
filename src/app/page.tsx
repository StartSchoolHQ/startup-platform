import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * No public landing: the platform is members-only (Google, @startschool.org).
 * Signed-in users go straight to the dashboard, everyone else to sign in.
 */
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/dashboard" : "/login");
}
