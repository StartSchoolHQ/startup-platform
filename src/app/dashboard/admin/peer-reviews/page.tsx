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
import { AdminPeerReviewsTable } from "@/components/admin/admin-peer-reviews-table";

export default function AdminPeerReviewsPage() {
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
        <h2 className="text-3xl font-bold tracking-tight">Peer Reviews</h2>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Peer Reviews</CardTitle>
          <CardDescription>
            View task submissions, review decisions, and reviewer feedback
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminPeerReviewsTable />
        </CardContent>
      </Card>
    </div>
  );
}
