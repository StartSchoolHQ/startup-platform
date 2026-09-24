"use client";

import { redirect } from "next/navigation";
import { useApp } from "@/contexts/app-context";
import { AdminSkeleton } from "@/components/ui/admin-skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AssistantSettingsCard } from "@/components/admin/assistant-settings-card";
import { StartieStatsStrip } from "@/components/admin/inbox/startie-stats-strip";
import { StartieThreadsTable } from "@/components/admin/inbox/startie-threads-table";

/** Admin → AI → Startie: usage, every transcript, and the assistant's settings. */
export default function AdminStartiePage() {
  const { user, loading } = useApp();

  if (!loading && (!user || user.primary_role !== "admin")) {
    redirect("/dashboard");
  }
  if (loading) return <AdminSkeleton />;

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Startie</h2>
        <p className="text-muted-foreground text-sm">
          The student AI assistant: what it costs, what students ask, and how it
          is configured.
        </p>
      </div>
      <StartieStatsStrip />
      <Card>
        <CardHeader>
          <CardTitle>Conversations</CardTitle>
          <CardDescription>
            Every student chat with Startie. Flags are thumbs-downs from
            students on a reply.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StartieThreadsTable />
        </CardContent>
      </Card>
      <AssistantSettingsCard />
    </div>
  );
}
