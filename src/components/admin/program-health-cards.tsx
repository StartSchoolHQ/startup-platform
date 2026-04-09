"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  AlertTriangle,
  FileText,
  ClipboardCheck,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  ShieldAlert,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
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

interface ProgramHealthCardsProps {
  health: ProgramHealth;
}

function TrendBadge({
  current,
  previous,
}: {
  current: number;
  previous: number;
}) {
  if (previous === 0 && current === 0) {
    return (
      <span className="text-muted-foreground flex items-center gap-1 text-xs">
        <Minus className="h-3 w-3" /> No change
      </span>
    );
  }

  const diff = current - previous;
  const isUp = diff > 0;
  const isDown = diff < 0;

  return (
    <span
      className={cn(
        "flex items-center gap-1 text-xs font-medium",
        isUp && "text-emerald-600",
        isDown && "text-red-500",
        !isUp && !isDown && "text-muted-foreground"
      )}
    >
      {isUp ? (
        <TrendingUp className="h-3 w-3" />
      ) : isDown ? (
        <TrendingDown className="h-3 w-3" />
      ) : (
        <Minus className="h-3 w-3" />
      )}
      {isUp ? "+" : ""}
      {diff} vs last week
    </span>
  );
}

export function ProgramHealthCards({ health }: ProgramHealthCardsProps) {
  const router = useRouter();

  const engagementRate =
    health.total_students > 0
      ? Math.round((health.active_7d / health.total_students) * 100)
      : 0;

  const reportRate =
    health.total_students > 0
      ? Math.round((health.reports_this_week / health.total_students) * 100)
      : 0;

  const cards = [
    {
      label: "Engagement Rate",
      value: `${engagementRate}%`,
      subtitle: `${health.active_7d} of ${health.total_students} active (7d)`,
      icon: Activity,
      href: "/dashboard/admin/progress",
      color:
        engagementRate >= 70
          ? "text-emerald-600"
          : engagementRate >= 40
            ? "text-amber-500"
            : "text-red-500",
      bgColor:
        engagementRate >= 70
          ? "bg-emerald-50 dark:bg-emerald-950/20"
          : engagementRate >= 40
            ? "bg-amber-50 dark:bg-amber-950/20"
            : "bg-red-50 dark:bg-red-950/20",
    },
    {
      label: "At Risk Students",
      value: health.at_risk_students,
      subtitle: "No activity in 14+ days",
      icon: AlertTriangle,
      href: "/dashboard/admin/progress",
      color:
        health.at_risk_students === 0
          ? "text-emerald-600"
          : health.at_risk_students <= 5
            ? "text-amber-500"
            : "text-red-500",
      bgColor:
        health.at_risk_students === 0
          ? "bg-emerald-50 dark:bg-emerald-950/20"
          : health.at_risk_students <= 5
            ? "bg-amber-50 dark:bg-amber-950/20"
            : "bg-red-50 dark:bg-red-950/20",
    },
    {
      label: "Reports This Week",
      value: `${health.reports_this_week}/${health.total_students}`,
      subtitle: (
        <TrendBadge
          current={health.reports_this_week}
          previous={health.reports_last_week}
        />
      ),
      icon: FileText,
      href: "/dashboard/admin/audit-logs",
      color:
        reportRate >= 60
          ? "text-emerald-600"
          : reportRate >= 30
            ? "text-amber-500"
            : "text-red-500",
      bgColor:
        reportRate >= 60
          ? "bg-emerald-50 dark:bg-emerald-950/20"
          : reportRate >= 30
            ? "bg-amber-50 dark:bg-amber-950/20"
            : "bg-red-50 dark:bg-red-950/20",
    },
    {
      label: "Tasks This Week",
      value: health.tasks_this_week,
      subtitle: (
        <TrendBadge
          current={health.tasks_this_week}
          previous={health.tasks_last_week}
        />
      ),
      icon: ClipboardCheck,
      href: "/dashboard/admin/tasks",
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
    },
    {
      label: "Pending Reviews",
      value: health.pending_reviews,
      subtitle: "Awaiting peer review",
      icon: Eye,
      href: "/dashboard/admin/peer-reviews?status=pending_review",
      color: health.pending_reviews > 0 ? "text-amber-500" : "text-emerald-600",
      bgColor:
        health.pending_reviews > 0
          ? "bg-amber-50 dark:bg-amber-950/20"
          : "bg-emerald-50 dark:bg-emerald-950/20",
    },
    {
      label: "Active Strikes",
      value: health.pending_strikes,
      subtitle: "Unresolved penalties",
      icon: ShieldAlert,
      href: "/dashboard/admin/teams",
      color: health.pending_strikes > 0 ? "text-red-500" : "text-emerald-600",
      bgColor:
        health.pending_strikes > 0
          ? "bg-red-50 dark:bg-red-950/20"
          : "bg-emerald-50 dark:bg-emerald-950/20",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.label}
            className="cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
            onClick={() => router.push(card.href)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-xs font-medium">
                  {card.label}
                </p>
                <div className={cn("rounded-md p-1.5", card.bgColor)}>
                  <Icon className={cn("h-3.5 w-3.5", card.color)} />
                </div>
              </div>
              <div className="mt-2">
                <p className={cn("text-2xl font-bold", card.color)}>
                  {card.value}
                </p>
                <div className="text-muted-foreground mt-1 text-xs">
                  {card.subtitle}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
