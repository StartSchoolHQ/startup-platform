"use client";

import { useMemo, useState } from "react";
import { redirect } from "next/navigation";
import { useApp } from "@/contexts/app-context";
import { AdminSkeleton } from "@/components/ui/admin-skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ActivityFilters,
  EMPTY_FILTERS,
} from "@/components/admin/activity/activity-filters";
import { ActivityList } from "@/components/admin/activity/activity-list";
import {
  useAdminActivity,
  useUsersForFilter,
  type ActivityFilters as Filters,
} from "@/hooks/use-admin-activity";

/**
 * Admin → Activity Log. One sentence per event, grouped by day, filterable
 * by the student it happened to, by kind and by date. Fed by
 * `get_admin_activity_v1`, which reads the real source tables rather than
 * the trigger-based audit_log.
 */
export default function ActivityLogPage() {
  const { user, loading } = useApp();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const users = useUsersForFilter();
  const feed = useAdminActivity(filters);

  const rows = useMemo(
    () => feed.data?.pages.flatMap((p) => p.rows) ?? [],
    [feed.data]
  );

  if (!loading && (!user || user.primary_role !== "admin")) {
    redirect("/dashboard");
  }
  if (loading) return <AdminSkeleton />;

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Activity Log</h2>
        <p className="text-muted-foreground text-sm">
          What happened, to whom, and who did it. Newest first.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>
            Pick a student to see everything that happened to them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityFilters
            filters={filters}
            users={users.data ?? []}
            onChange={setFilters}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <ActivityList
            rows={rows}
            isLoading={feed.isLoading}
            isError={feed.isError}
            hasMore={!!feed.hasNextPage}
            loadingMore={feed.isFetchingNextPage}
            onLoadMore={() => feed.fetchNextPage()}
          />
        </CardContent>
      </Card>
    </div>
  );
}
