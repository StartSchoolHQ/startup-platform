import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppProvider } from "@/contexts/app-context";
import { DashboardLayoutClient } from "../../components/dashboard-layout-client";

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

  return (
    <AppProvider>
      <DashboardLayoutClient>{children}</DashboardLayoutClient>
    </AppProvider>
  );
}
