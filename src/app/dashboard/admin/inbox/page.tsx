"use client";

import { useCallback } from "react";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/contexts/app-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminSkeleton } from "@/components/ui/admin-skeleton";
import { AdminSuggestionsTable } from "@/components/admin/admin-suggestions-table";
import { TicketsTable } from "@/components/admin/inbox/tickets-table";
import { TaskSuggestionsTable } from "@/components/admin/inbox/task-suggestions-table";
import { StartieStatsStrip } from "@/components/admin/inbox/startie-stats-strip";
import { StartieThreadsTable } from "@/components/admin/inbox/startie-threads-table";

const TABS = [
  "tickets",
  "task-suggestions",
  "edit-suggestions",
  "startie",
] as const;

export default function AdminInboxPage() {
  const { user, loading } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab") ?? "";
  const activeTab = (TABS as readonly string[]).includes(tabFromUrl)
    ? tabFromUrl
    : "tickets";

  const setActiveTab = useCallback(
    (tab: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "tickets") params.delete("tab");
      else params.set("tab", tab);
      const query = params.toString();
      router.replace(query ? `?${query}` : window.location.pathname, {
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
      <h2 className="text-3xl font-bold tracking-tight">Inbox</h2>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="task-suggestions">Task suggestions</TabsTrigger>
          <TabsTrigger value="edit-suggestions">Edit suggestions</TabsTrigger>
          <TabsTrigger value="startie">Startie</TabsTrigger>
        </TabsList>

        <TabsContent value="tickets">
          <Card>
            <CardHeader>
              <CardTitle>Support tickets</CardTitle>
              <CardDescription>
                Bugs and problems students reported. Reply by email, then mark
                resolved.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TicketsTable />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="task-suggestions">
          <Card>
            <CardHeader>
              <CardTitle>Task suggestions</CardTitle>
              <CardDescription>
                New My Journey tasks students proposed. Accept the good ones,
                then create the task on the Tasks page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TaskSuggestionsTable />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="startie" className="space-y-4">
          <StartieStatsStrip />
          <Card>
            <CardHeader>
              <CardTitle>Startie conversations</CardTitle>
              <CardDescription>
                Every student chat with the assistant. Flags are thumbs-downs
                from students on a reply.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StartieThreadsTable />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="edit-suggestions">
          <Card>
            <CardHeader>
              <CardTitle>Task edit suggestions</CardTitle>
              <CardDescription>
                Review suggestions from students to improve task content.
              </CardDescription>
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
