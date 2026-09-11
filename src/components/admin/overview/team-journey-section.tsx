import { HealthSnapshot } from "@/components/admin/health-snapshot";
import { ProgramHealthCards } from "@/components/admin/program-health-cards";
import { NeedsAttentionFeed } from "@/components/admin/needs-attention-feed";
import { WeeklyTrendsChart } from "@/components/admin/weekly-trends-chart";
import { AdminCharts } from "@/components/admin/admin-charts";
import { TaskPipelineCard } from "./task-pipeline-card";
import type { AdminStats } from "@/types/admin-stats";

/** Overview block shown while the Team Journey phase is on. */
export function TeamJourneySection({ stats }: { stats: AdminStats }) {
  const h = stats.programHealth;
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold tracking-wide uppercase">
        Team Journey
      </h3>
      {h && (
        <HealthSnapshot
          teams={{
            active: h.teams_active ?? 0,
            slowing: h.teams_slowing ?? 0,
            at_risk: h.teams_at_risk ?? 0,
            active_wow_delta: h.teams_active_wow_delta ?? 0,
            at_risk_wow_delta: h.teams_at_risk_wow_delta ?? 0,
          }}
        />
      )}
      {h && <ProgramHealthCards health={h} />}
      <NeedsAttentionFeed health={h} />
      <div className="grid gap-4 md:grid-cols-2">
        {stats.weeklyTrends.length > 0 && (
          <WeeklyTrendsChart data={stats.weeklyTrends} />
        )}
        <TaskPipelineCard
          title="Team task pipeline"
          rows={stats.taskPipeline}
          activityType="team"
        />
      </div>
      <AdminCharts
        teamPoints={stats.teamXp.map((t) => ({
          id: t.id,
          name: t.name,
          team_points: t.team_points,
        }))}
        teamXp={stats.teamXp}
      />
    </section>
  );
}
