"use client";

import { useState } from "react";
import { useApp } from "@/contexts/app-context";
import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminSkeleton } from "@/components/ui/admin-skeleton";
import { BatchScopeSelect } from "@/components/admin/batch-scope-select";
import { useBatchScope } from "@/hooks/use-batch-scope";
import { ThisWeekTab } from "@/components/admin/analytics/this-week/this-week-tab";
import { MyJourneyTab } from "@/components/admin/analytics/my-journey/my-journey-tab";
import { TeamJourneyTab } from "@/components/admin/analytics/team-journey/team-journey-tab";
import { CurriculumTab } from "@/components/admin/analytics/curriculum/curriculum-tab";
import { OutcomesTab } from "@/components/admin/analytics/outcomes/outcomes-tab";

/**
 * Five journey-aware tabs. "This week" is the landing view: who needs
 * attention and what moved. The batch selector scopes every tab.
 */
export default function AdminAnalyticsPage() {
  const { user, loading } = useApp();
  const { batchId, isLoading: scopeLoading } = useBatchScope();
  const [tab, setTab] = useState("this-week");
  // Hold every tab query until the default (open) batch is known, so the
  // first request already carries the right scope.
  const ready = !scopeLoading;

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
            Who needs attention this week, how the cohort is progressing, and
            which tasks need work.
          </p>
        </div>
        <BatchScopeSelect />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="this-week">This week</TabsTrigger>
          <TabsTrigger value="my-journey">My Journey</TabsTrigger>
          <TabsTrigger value="team-journey">Team Journey</TabsTrigger>
          <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
          <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
        </TabsList>
        <TabsContent value="this-week">
          <ThisWeekTab
            active={ready && tab === "this-week"}
            batchId={batchId}
          />
        </TabsContent>
        <TabsContent value="my-journey">
          <MyJourneyTab
            active={ready && tab === "my-journey"}
            batchId={batchId}
          />
        </TabsContent>
        <TabsContent value="team-journey">
          <TeamJourneyTab
            active={ready && tab === "team-journey"}
            batchId={batchId}
          />
        </TabsContent>
        <TabsContent value="curriculum">
          <CurriculumTab
            active={ready && tab === "curriculum"}
            batchId={batchId}
          />
        </TabsContent>
        <TabsContent value="outcomes">
          <OutcomesTab active={ready && tab === "outcomes"} batchId={batchId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
