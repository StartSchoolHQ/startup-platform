"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Clock, FileText, Target } from "lucide-react";

interface TeamProgress {
  team_id: string;
  team_name: string;
  member_count: number;
  total_team_xp: number;
  tasks_approved: number;
  tasks_in_progress: number;
  weekly_reports_count: number;
  days_since_last_activity: number;
  health_status: "green" | "yellow" | "red";
}

interface Alert {
  team_id: string;
  team_name: string;
  type: "inactive" | "zero_tasks" | "no_reports" | "stalled";
  severity: "red" | "yellow";
  message: string;
  suggestion: string;
}

interface StudentProgressAlertsProps {
  teams: TeamProgress[];
}

export function StudentProgressAlerts({ teams }: StudentProgressAlertsProps) {
  // Generate alerts from team data
  const alerts: Alert[] = [];

  teams.forEach((team) => {
    // Inactive 14+ days
    if (
      team.days_since_last_activity >= 14 &&
      team.days_since_last_activity < 10000
    ) {
      alerts.push({
        team_id: team.team_id,
        team_name: team.team_name,
        type: "inactive",
        severity: "red",
        message: `No activity in ${team.days_since_last_activity} days`,
        suggestion: "Reach out to check if they need help",
      });
    }
    // Inactive 7-14 days
    else if (
      team.days_since_last_activity >= 7 &&
      team.days_since_last_activity < 14
    ) {
      alerts.push({
        team_id: team.team_id,
        team_name: team.team_name,
        type: "inactive",
        severity: "yellow",
        message: `Slowing down — ${team.days_since_last_activity} days since last activity`,
        suggestion: "Send a check-in message",
      });
    }

    // Zero approved tasks
    if (team.tasks_approved === 0) {
      alerts.push({
        team_id: team.team_id,
        team_name: team.team_name,
        type: "zero_tasks",
        severity: "red",
        message: "No completed tasks yet",
        suggestion: "Schedule onboarding call",
      });
    }

    // No weekly reports in last 2 weeks (heuristic: < 2 reports and team exists)
    if (team.weekly_reports_count === 0 && team.member_count > 0) {
      alerts.push({
        team_id: team.team_id,
        team_name: team.team_name,
        type: "no_reports",
        severity: "yellow",
        message: "Never submitted a weekly report",
        suggestion: "Remind about weekly report requirement",
      });
    }

    // Stalled: has tasks in progress but nothing approved recently
    if (
      team.tasks_in_progress >= 3 &&
      team.tasks_approved < 2 &&
      team.days_since_last_activity > 5
    ) {
      alerts.push({
        team_id: team.team_id,
        team_name: team.team_name,
        type: "stalled",
        severity: "yellow",
        message: `${team.tasks_in_progress} tasks in progress, but slow approvals`,
        suggestion: "Check if tasks are stuck in review",
      });
    }
  });

  // Sort by severity (red first), then by type
  alerts.sort((a, b) => {
    if (a.severity !== b.severity) {
      return a.severity === "red" ? -1 : 1;
    }
    return 0;
  });

  const alertIcon = (type: Alert["type"]) => {
    switch (type) {
      case "inactive":
        return <Clock className="h-4 w-4" />;
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
        <ScrollArea className="h-[300px] pr-4">
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
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
