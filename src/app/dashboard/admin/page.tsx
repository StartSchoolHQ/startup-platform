"use client";

import { AdminOverview } from "@/components/admin/admin-overview";
import { AdminSkeleton } from "@/components/ui/admin-skeleton";
import { useApp } from "@/contexts/app-context";
import { redirect } from "next/navigation";

export default function AdminPage() {
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
        <h2 className="text-3xl font-bold tracking-tight">Admin Panel</h2>
      </div>
      <AdminOverview />
    </div>
  );
}
