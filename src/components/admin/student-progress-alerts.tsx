"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertTriangle, FileText, Target } from "lucide-react";
import { useMemo } from "react";

interface TeamProgress {
  team_id: string;
  team_name: string;
  member_count: number;
  total_team_xp: number;
  tasks_approved: number;
  tasks_in_progress: number;
  weekly_reports_count: number;
  last_report_at: string | null;
  days_since_last_activity: number;
  health_status: "green" | "yellow" | "red";
}

interface Alert {
  team_id: string;
  team_name: string;
  type: "zero_tasks" | "no_reports" | "stalled";
  severity: "red" | "yellow";
  message: string;
  suggestion: string;
}

interface StudentProgressAlertsProps {
  teams: TeamProgress[];
}

export function StudentProgressAlerts({ teams }: StudentProgressAlertsProps) {
  const alerts = useMemo(() => {
    // Captured once per memo evaluation; safe for "days ago" formatting.
    // eslint-disable-next-line react-hooks/purity
    const nowMs = Date.now();
    const list: Alert[] = [];

    teams.forEach((team) => {
      // Zero approved tasks — guard with `weekly_reports_count >= 1` so brand-new
      // teams (no reports, no tasks yet) don't false-positive. Established teams
      // with at least one report but zero approvals are the genuine signal.
      if (team.tasks_approved === 0 && team.weekly_reports_count >= 1) {
        list.push({
          team_id: team.team_id,
          team_name: team.team_name,
          type: "zero_tasks",
          severity: "red",
          message: "No completed tasks yet",
          suggestion: "Schedule onboarding call",
        });
      }

      // No weekly report submitted in the last 14 days (covers both "never" and "stopped").
      const daysSinceReport = team.last_report_at
        ? Math.floor(
            (nowMs - new Date(team.last_report_at).getTime()) / 86400000
          )
        : null;
      if (
        team.member_count > 0 &&
        (daysSinceReport === null || daysSinceReport >= 14)
      ) {
        list.push({
          team_id: team.team_id,
          team_name: team.team_name,
          type: "no_reports",
          severity: "yellow",
          message:
            daysSinceReport === null
              ? "Never submitted a weekly report"
              : `No weekly report in ${daysSinceReport} days`,
          suggestion: "Remind about weekly report requirement",
        });
      }

      // Stalled: has tasks in progress but nothing approved recently
      if (
        team.tasks_in_progress >= 3 &&
        team.tasks_approved < 2 &&
        team.days_since_last_activity > 5
      ) {
        list.push({
          team_id: team.team_id,
          team_name: team.team_name,
          type: "stalled",
          severity: "yellow",
          message: `${team.tasks_in_progress} tasks in progress, but slow approvals`,
          suggestion: "Check if tasks are stuck in review",
        });
      }
    });

    list.sort((a, b) => {
      if (a.severity !== b.severity) {
        return a.severity === "red" ? -1 : 1;
      }
      return 0;
    });

    return list;
  }, [teams]);

  const alertIcon = (type: Alert["type"]) => {
    switch (type) {
      case "zero_tasks":
        return <Target className="h-4 w-4" />;
      case "no_reports":
        return <FileText className="h-4 w-4" />;
      case "stalled":
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-green-500" />
            At-Risk Teams
          </CardTitle>
          <CardDescription>Teams that may need attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground flex items-center justify-center py-8">
            All teams are on track!
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          At-Risk Teams
          <Badge variant="secondary" className="ml-2">
            {alerts.length} alert{alerts.length !== 1 ? "s" : ""}
          </Badge>
        </CardTitle>
        <CardDescription>Teams that may need attention</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert, idx) => (
            <div
              key={`${alert.team_id}-${alert.type}-${idx}`}
              className={`rounded-lg border p-3 ${
                alert.severity === "red"
                  ? "border-red-200 bg-red-50"
                  : "border-yellow-200 bg-yellow-50"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 ${
                    alert.severity === "red"
                      ? "text-red-600"
                      : "text-yellow-600"
                  }`}
                >
                  {alertIcon(alert.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{alert.team_name}</span>
                    <Badge
                      className={
                        alert.severity === "red"
                          ? "bg-red-100 text-red-800 hover:bg-red-100"
                          : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                      }
                    >
                      {alert.severity === "red" ? "Urgent" : "Warning"}
                    </Badge>
                  </div>
                  <p
                    className={`text-sm ${
                      alert.severity === "red"
                        ? "text-red-700"
                        : "text-yellow-700"
                    }`}
                  >
                    {alert.message}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Suggested: {alert.suggestion}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
