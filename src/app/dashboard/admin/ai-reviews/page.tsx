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
import { AiReviewsTable } from "@/components/admin/ai-reviews-table";

export default function AdminAiReviewsPage() {
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
        <h2 className="text-3xl font-bold tracking-tight">AI Reviews</h2>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All AI Reviews</CardTitle>
          <CardDescription>
            Every automatic review of a My Journey task — read-only audit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AiReviewsTable />
        </CardContent>
      </Card>
    </div>
  );
}
