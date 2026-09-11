"use client";

import { useCallback } from "react";
import { useApp } from "@/contexts/app-context";
import { redirect, useSearchParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateTaskDialog } from "@/components/admin/create-task-dialog";
import { ImportTasksDialog } from "@/components/admin/import-tasks-dialog";
import { AdminTasksTable } from "@/components/admin/admin-tasks-table";
import { AdminSkeleton } from "@/components/ui/admin-skeleton";
import { AdminSuggestionsTable } from "@/components/admin/admin-suggestions-table";
import { usePlatformSettings } from "@/hooks/use-platform-settings";

export default function AdminTasksPage() {
  const { user, loading } = useApp();
  const { data: journeys } = usePlatformSettings();
  const router = useRouter();
  const searchParams = useSearchParams();

  const validTabs = ["team-tasks", "individual-tasks", "suggestions"];
  // Open on the journey that is currently running.
  const defaultTab = journeys.teamJourney ? "team-tasks" : "individual-tasks";
  const tabFromUrl = searchParams.get("tab");
  const activeTab = validTabs.includes(tabFromUrl ?? "")
    ? tabFromUrl!
    : defaultTab;

  const setActiveTab = useCallback(
    (tab: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === defaultTab) {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      const query = params.toString();
      router.replace(query ? `?${query}` : window.location.pathname, {
        scroll: false,
      });
    },
    [searchParams, router, defaultTab]
  );

  if (!loading && (!user || user.primary_role !== "admin")) {
    redirect("/dashboard");
  }

  if (loading) {
    return <AdminSkeleton />;
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Tasks</h2>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="individual-tasks">Solo tasks</TabsTrigger>
          <TabsTrigger value="team-tasks">Team tasks</TabsTrigger>
          <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
        </TabsList>

        <TabsContent value="individual-tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Solo tasks</CardTitle>
                  <CardDescription>
                    My Journey tasks each student completes alone.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <ImportTasksDialog />
                  <CreateTaskDialog defaultTaskType="individual" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <AdminTasksTable activityType="individual" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team-tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team tasks</CardTitle>
                  <CardDescription>
                    Collaborative tasks assigned to teams.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <ImportTasksDialog />
                  <CreateTaskDialog defaultTaskType="team" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <AdminTasksTable activityType="team" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Task edit suggestions</CardTitle>
                <CardDescription>
                  Review suggestions from students to improve task content.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <AdminSuggestionsTable />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
