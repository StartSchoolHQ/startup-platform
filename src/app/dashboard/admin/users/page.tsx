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
import { AdminUsersTable } from "@/components/admin/admin-users-table";

/**
 * Admin → Users. The Invitations tab was removed on 2026-09-14: accounts are
 * created by Google sign-in with an @startschool.org address (see
 * docs/internal/GoogleSSO). A stale `?tab=invitations` URL simply shows the users list.
 */
export default function AdminUsersPage() {
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
        <h2 className="text-3xl font-bold tracking-tight">Users</h2>
      </div>

      <p className="text-muted-foreground text-sm">
        New students sign in with their @startschool.org Google account — no
        invitation needed. Their account appears here after the first sign-in.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>All users</CardTitle>
          <CardDescription>
            Search, filter by batch or status, open a profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminUsersTable />
        </CardContent>
      </Card>
    </div>
  );
}
