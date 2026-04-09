"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, ArrowRight, FileWarning } from "lucide-react";
import { useRouter } from "next/navigation";

interface ProgramHealth {
  total_students: number;
  active_7d: number;
  active_14d: number;
  at_risk_students: number;
  reports_this_week: number;
  reports_last_week: number;
  tasks_this_week: number;
  tasks_last_week: number;
  pending_strikes: number;
  pending_reviews: number;
  avg_xp_per_student: number;
  total_active_teams: number;
}

interface NeedsAttentionFeedProps {
  health: ProgramHealth | null;
}

interface ActionItem {
  icon: React.ElementType;
  label: string;
  detail: string;
  severity: "critical" | "warning" | "info";
  href: string;
  count: number;
}

export function NeedsAttentionFeed({ health }: NeedsAttentionFeedProps) {
  const router = useRouter();

  if (!health) return null;

  const items: ActionItem[] = [];

  // Low report submission — adds context beyond what the card shows
  const reportRate =
    health.total_students > 0
      ? Math.round((health.reports_this_week / health.total_students) * 100)
      : 0;
  if (reportRate < 50) {
    items.push({
      icon: FileWarning,
      label: "Low report submission",
      detail: `Only ${reportRate}% submitted — ${health.total_students - health.reports_this_week} students still missing`,
      severity: reportRate < 20 ? "critical" : "warning",
      href: "/dashboard/admin/audit-logs",
      count: health.total_students - health.reports_this_week,
    });
  }

  // Task completion drop — only shows when there's a significant decline
  if (
    health.tasks_last_week > 0 &&
    health.tasks_this_week < health.tasks_last_week * 0.5
  ) {
    items.push({
      icon: Clock,
      label: "Task velocity dropping",
      detail: `Down ${Math.round((1 - health.tasks_this_week / health.tasks_last_week) * 100)}% — ${health.tasks_this_week} this week vs ${health.tasks_last_week} last week`,
      severity: "warning",
      href: "/dashboard/admin/tasks",
      count: health.tasks_last_week - health.tasks_this_week,
    });
  }

  // Pending strikes — only if there are unresolved ones needing admin action
  if (health.pending_strikes > 0) {
    items.push({
      icon: AlertTriangle,
      label: "Strikes need resolution",
      detail: `${health.pending_strikes} strike${health.pending_strikes !== 1 ? "s" : ""} waiting for admin decision`,
      severity: "critical",
      href: "/dashboard/admin/teams",
      count: health.pending_strikes,
    });
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground text-sm">
            All clear — no items need attention right now.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Sort: critical first, then warning, then info
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  items.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Needs Attention
          <Badge variant="secondary" className="ml-1 text-xs">
            {items.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-3 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`rounded-md p-2 ${
                    item.severity === "critical"
                      ? "bg-red-50 dark:bg-red-950/20"
                      : item.severity === "warning"
                        ? "bg-amber-50 dark:bg-amber-950/20"
                        : "bg-blue-50 dark:bg-blue-950/20"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${
                      item.severity === "critical"
                        ? "text-red-500"
                        : item.severity === "warning"
                          ? "text-amber-500"
                          : "text-blue-500"
                    }`}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-muted-foreground text-xs">{item.detail}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1"
                onClick={() => router.push(item.href)}
              >
                View
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
