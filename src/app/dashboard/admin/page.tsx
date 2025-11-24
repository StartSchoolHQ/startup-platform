"use client";

import { useApp } from "@/contexts/app-context";
import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreateTaskDialog } from "@/components/admin/create-task-dialog";
import { ImportTasksDialog } from "@/components/admin/import-tasks-dialog";
import { AdminTasksTable } from "@/components/admin/admin-tasks-table";
import { downloadTaskTemplate } from "@/lib/excel-utils";

export default function AdminPage() {
  const { user, loading } = useApp();

  // Redirect if not admin
  if (!loading && (!user || user.primary_role !== "admin")) {
    redirect("/dashboard");
  }

  // Show loading state
  if (loading) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Admin Panel</h2>
      </div>

      <Tabs defaultValue="tasks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tasks">Task Management</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="teams">Team Management</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          <Tabs defaultValue="team-tasks" className="space-y-4">
            <TabsList>
              <TabsTrigger value="team-tasks">Team Tasks</TabsTrigger>
              <TabsTrigger value="individual-tasks">
                Individual Tasks
              </TabsTrigger>
            </TabsList>

            {/* Team Tasks Tab */}
            <TabsContent value="team-tasks" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Team Task Templates</CardTitle>
                      <CardDescription>
                        Manage collaborative tasks assigned to teams
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => downloadTaskTemplate("team")}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download Template
                      </Button>
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

            {/* Individual Tasks Tab */}
            <TabsContent value="individual-tasks" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Individual Task Templates</CardTitle>
                      <CardDescription>
                        Manage personal learning and skill-building tasks
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => downloadTaskTemplate("individual")}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download Template
                      </Button>
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
          </Tabs>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage user roles and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border p-4">
                <p className="text-sm text-muted-foreground text-center">
                  User management functionality coming soon
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Management</CardTitle>
              <CardDescription>
                Monitor and manage team activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border p-4">
                <p className="text-sm text-muted-foreground text-center">
                  Team management functionality coming soon
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
