"use client";

/**
 * /dashboard/admin/agreements
 *
 * One page for every agreement the school countersigns: scholarship types
 * (full / partial / part-time) and equipment types (laptop / key card), as
 * two tabs. All behaviour is in the shared AgreementsQueue component.
 */
import { useCallback } from "react";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/contexts/app-context";
import { AdminSkeleton } from "@/components/ui/admin-skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgreementsQueue } from "@/components/scholarship/AgreementsQueue";

const TABS = ["scholarships", "equipment"] as const;
type Tab = (typeof TABS)[number];

export default function AdminAgreementsPage() {
  const { user, loading } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get("tab");
  const tab: Tab = TABS.includes(fromUrl as Tab)
    ? (fromUrl as Tab)
    : "scholarships";

  const setTab = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "scholarships") params.delete("tab");
      else params.set("tab", next);
      const q = params.toString();
      router.replace(q ? `?${q}` : window.location.pathname, {
        scroll: false,
      });
    },
    [router, searchParams]
  );

  if (!loading && (!user || user.primary_role !== "admin")) {
    redirect("/dashboard");
  }
  if (loading) return <AdminSkeleton />;

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Agreements</h2>
        <p className="text-muted-foreground text-sm">
          Review student submissions and countersign as the school.
        </p>
      </div>
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="scholarships">Scholarships</TabsTrigger>
          <TabsTrigger value="equipment">Laptops &amp; key cards</TabsTrigger>
        </TabsList>
        <TabsContent value="scholarships">
          <AgreementsQueue
            embedded
            title="Scholarship agreements"
            description="Full, partial and part-time scholarships."
            types={["full", "partial", "part_time"]}
            emptyMessage="No agreements yet. Share /full-scholarship-agreement or /partial-scholarship-agreement with students to get started."
          />
        </TabsContent>
        <TabsContent value="equipment">
          <AgreementsQueue
            embedded
            title="Equipment agreements"
            description="Laptop and key card handover paperwork."
            types={["laptop", "keycard"]}
            emptyMessage="No equipment agreements yet. Share /laptop-agreement or /keycard-agreement with students to get started."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
