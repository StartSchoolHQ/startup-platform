"use client";

import { useState } from "react";
import { useApp } from "@/contexts/app-context";
import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminSkeleton } from "@/components/ui/admin-skeleton";
import { BatchScopeSelect } from "@/components/admin/batch-scope-select";
import { useBatchScope } from "@/hooks/use-batch-scope";
import { OverviewTab } from "@/components/admin/analytics/overview-tab";
import { TeamsTab } from "@/components/admin/analytics/teams-tab";
import { StudentsTab } from "@/components/admin/analytics/students-tab";
import { TasksTab } from "@/components/admin/analytics/tasks-tab";
import { MeetingsTab } from "@/components/admin/analytics/meetings-tab";
import { ProgramTab } from "@/components/admin/analytics/program-tab";

export default function AdminAnalyticsPage() {
  const { user, loading } = useApp();
  const { batchId } = useBatchScope();
  const [tab, setTab] = useState("overview");

  if (!loading && (!user || user.primary_role !== "admin")) {
    redirect("/dashboard");
  }

  if (loading) {
    return <AdminSkeleton />;
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
          <p className="text-muted-foreground text-sm">
            How students and teams have felt over time, why, and what got done.
          </p>
        </div>
        <BatchScopeSelect />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="meetings">Meetings</TabsTrigger>
          <TabsTrigger value="program">Program</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <OverviewTab active={tab === "overview"} batchId={batchId} />
        </TabsContent>
        <TabsContent value="teams">
          <TeamsTab active={tab === "teams"} batchId={batchId} />
        </TabsContent>
        <TabsContent value="students">
          <StudentsTab active={tab === "students"} batchId={batchId} />
        </TabsContent>
        <TabsContent value="tasks">
          <TasksTab active={tab === "tasks"} batchId={batchId} />
        </TabsContent>
        <TabsContent value="meetings">
          <MeetingsTab active={tab === "meetings"} batchId={batchId} />
        </TabsContent>
        <TabsContent value="program">
          <ProgramTab active={tab === "program"} batchId={batchId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
