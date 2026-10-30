import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChangelogList } from "@/components/changelog/changelog-list";
import { MarkWhatsNewSeen } from "@/components/changelog/whats-new";

export const metadata: Metadata = {
  title: "What's new",
};

/**
 * Student-facing changelog. Static data from `src/lib/changelog.ts`,
 * rendered on the server; the only client piece clears the nav dot.
 *
 * Admins only for now (2026-10-30, Elias's call while the entries are
 * reviewed). To open it to students: delete the role check below and the
 * `adminOnly` flag on the sidebar item in `app-sidebar.tsx`.
 */
export default async function ChangelogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("primary_role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.primary_role !== "admin") redirect("/dashboard");

  return (
    <div className="mx-auto w-full max-w-4xl space-y-10 pb-8">
      <MarkWhatsNewSeen />
      <header className="space-y-3 sm:pl-[calc(8.5rem+2rem)]">
        <h1 className="text-3xl leading-[1.1] font-semibold tracking-tight sm:text-4xl">
          What&apos;s new
        </h1>
        <p className="text-muted-foreground max-w-prose text-base leading-relaxed">
          The bigger changes to the platform, newest first, and what each one
          means for you. Small fixes do not show up here.
        </p>
      </header>
      <ChangelogList />
    </div>
  );
}
