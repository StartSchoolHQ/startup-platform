"use client";

import { TabError, TabSkeleton } from "../shared";
import { useMyJourneyAnalytics } from "../use-analytics";
import { PaceChart } from "./pace-chart";
import { PhaseFunnel } from "./phase-funnel";
import { StudentsTable } from "./students-table";
import { WeeklyActivity } from "./weekly-activity";

interface Props {
  active: boolean;
  batchId: string | null;
}

export function MyJourneyTab({ active, batchId }: Props) {
  const q = useMyJourneyAnalytics(batchId, active);
  if (q.isLoading) return <TabSkeleton />;
  if (q.isError || !q.data) {
    return (
      <TabError
        message="Couldn't load My Journey analytics."
        onRetry={() => q.refetch()}
      />
    );
  }
  const d = q.data;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <PhaseFunnel funnel={d.funnel} total={d.students_total} />
        <PaceChart pace={d.pace} phasesTotal={Math.max(d.funnel.length, 1)} />
      </div>
      <WeeklyActivity weekly={d.weekly} />
      <StudentsTable students={d.students} />
    </div>
  );
}
