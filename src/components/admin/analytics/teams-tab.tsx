"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAnalyticsTeams } from "./use-analytics";
import { TabError, TabSkeleton, TrendIcon } from "./shared";
import { Sparkline } from "./sparkline";
import { TeamDetailDialog } from "./team-detail-dialog";
import { formatWeek, scoreColor, toNum } from "./types";

export interface TeamSummary {
  teamId: string;
  teamName: string;
  teamStatus: string;
  points: { label: string; value: number | null }[];
  currentAvg: number | null;
  trend: number | null;
}

export function TeamsTab({ active }: { active: boolean }) {
  const { data, isLoading, isError, refetch } = useAnalyticsTeams(active);
  const [selected, setSelected] = useState<TeamSummary | null>(null);

  const teams = useMemo(() => {
    if (!data) return [];
    const byTeam = new Map<string, TeamSummary>();
    for (const row of data) {
      let team = byTeam.get(row.team_id);
      if (!team) {
        team = {
          teamId: row.team_id,
          teamName: row.team_name,
          teamStatus: row.team_status,
          points: [],
          currentAvg: null,
          trend: null,
        };
        byTeam.set(row.team_id, team);
      }
      team.points.push({
        label: formatWeek(row.week_start),
        value: toNum(row.avg_score),
      });
    }
    for (const team of byTeam.values()) {
      const vals = team.points
        .map((p) => p.value)
        .filter((v): v is number => v != null);
      team.currentAvg = vals.length ? vals[vals.length - 1] : null;
      // trend: avg of last 3 weeks vs the 3 before that
      const recent = vals.slice(-3);
      const prior = vals.slice(-6, -3);
      if (recent.length && prior.length) {
        team.trend =
          recent.reduce((a, b) => a + b, 0) / recent.length -
          prior.reduce((a, b) => a + b, 0) / prior.length;
      }
    }
    // Worst trend first so struggling teams surface immediately
    return [...byTeam.values()].sort((a, b) => (a.trend ?? 0) - (b.trend ?? 0));
  }, [data]);

  if (isLoading) return <TabSkeleton />;
  if (isError) {
    return (
      <TabError
        message="Could not load team analytics."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Sorted worst trend first — teams whose sentiment is dropping show up at
        the top. Click a team for member-level detail and their comments.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {teams.map((team) => (
          <Card
            key={team.teamId}
            className="hover:border-primary/50 cursor-pointer transition-colors"
            onClick={() => setSelected(team)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium">{team.teamName}</p>
                <TrendIcon delta={team.trend} />
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className="text-lg font-semibold"
                  style={{ color: scoreColor(team.currentAvg) }}
                >
                  {team.currentAvg?.toFixed(1) ?? "—"}
                </span>
                {team.teamStatus === "archived" && (
                  <Badge variant="secondary" className="text-xs">
                    archived
                  </Badge>
                )}
              </div>
              <Sparkline points={team.points} />
            </CardContent>
          </Card>
        ))}
      </div>
      <TeamDetailDialog team={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
