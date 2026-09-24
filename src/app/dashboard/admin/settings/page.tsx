"use client";

import { redirect } from "next/navigation";
import { useApp } from "@/contexts/app-context";
import { AdminSkeleton } from "@/components/ui/admin-skeleton";
import { ProgrammePhaseCard } from "@/components/admin/programme-phase-card";
import { AiReviewSettingsCard } from "@/components/admin/ai-review-settings-card";
import { AssistantSettingsCard } from "@/components/admin/assistant-settings-card";

export default function AdminSettingsPage() {
  const { user, loading } = useApp();

  if (!loading && (!user || user.primary_role !== "admin")) {
    redirect("/dashboard");
  }
  if (loading) return <AdminSkeleton />;

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground text-sm">
          Programme phase, the automatic task reviewer and the Startie
          assistant.
        </p>
      </div>
      <ProgrammePhaseCard />
      <AiReviewSettingsCard />
      <AssistantSettingsCard />
    </div>
  );
}
