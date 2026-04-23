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
import { AdminSkeleton } from "@/components/ui/admin-skeleton";
import { AdminWeeklyReportsTable } from "@/components/admin/admin-weekly-reports-table";

export default function AdminWeeklyReportsPage() {
  const { user, loading } = useApp();

  if (!loading && (!user || user.primary_role !== "admin")) {
    redirect("/dashboard");
  }

  if (loading) {
    return <AdminSkeleton />;
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Weekly Reports</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All weekly reports</CardTitle>
          <CardDescription>
            Browse and inspect every weekly report submitted by teams. Filter by
            user, team, or week, then click a row to read the full report.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminWeeklyReportsTable />
        </CardContent>
      </Card>
    </div>
  );
}
