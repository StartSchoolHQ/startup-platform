"use client";

import { useState } from "react";
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
import { downloadTaskTemplate } from "@/lib/excel-utils";

export default function AdminPage() {
  const { user, loading } = useApp();
  const [taskContext, setTaskContext] = useState<"individual" | "team">("team");

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
          <Card>
            <CardHeader>
              <CardTitle>Task Templates</CardTitle>
              <CardDescription>
                Create and manage task templates that can be assigned to teams
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Add new tasks that will be automatically assigned to all
                  existing teams and new teams.
                </p>
                <div className="flex gap-2">
                  <CreateTaskDialog />
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {/* Bulk Import Section */}
                <div className="rounded-lg border p-4">
                  <div className="p-4 border rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Bulk Import from Excel</h4>
                        <p className="text-sm text-muted-foreground">
                          Import multiple tasks at once using an Excel template
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="space-y-1">
                          <label className="text-sm font-medium">
                            Task Context:
                          </label>
                          <Select
                            value={taskContext}
                            onValueChange={(value: "individual" | "team") =>
                              setTaskContext(value)
                            }
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="team">Team Tasks</SelectItem>
                              <SelectItem value="individual">
                                Individual Tasks
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => downloadTaskTemplate(taskContext)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download Template
                        </Button>
                        <ImportTasksDialog />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Task list will go here */}
                <div className="rounded-md border p-4">
                  <p className="text-sm text-muted-foreground text-center">
                    Task list and management will be implemented here
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
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
