"use client";

import { useApp } from "@/contexts/app-context";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminSkeleton } from "@/components/ui/admin-skeleton";
import { AdminTeamsTable } from "@/components/admin/admin-teams-table";
import { AdminStrikesTable } from "@/components/admin/admin-strikes-table";

export default function AdminTeamsPage() {
  const { user, loading } = useApp();

  // Redirect if not admin
  if (!loading && (!user || user.primary_role !== "admin")) {
    redirect("/dashboard");
  }

  // Show loading state
  if (loading) {
    return <AdminSkeleton />;
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Team Management</h2>
      </div>

      <Tabs defaultValue="all-teams" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all-teams">All Teams</TabsTrigger>
          <TabsTrigger value="strikes">Team Strikes</TabsTrigger>
        </TabsList>

        {/* All Teams Tab */}
        <TabsContent value="all-teams" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Teams</CardTitle>
              <CardDescription>View all teams on the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <AdminTeamsTable />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Strikes Tab */}
        <TabsContent value="strikes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Strikes</CardTitle>
              <CardDescription>
                Review and resolve strike explanations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdminStrikesTable />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
