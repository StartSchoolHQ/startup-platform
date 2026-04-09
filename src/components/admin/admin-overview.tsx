"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  RefreshCw,
  ListChecks,
  Users,
  UsersRound,
  FileSearch,
  TrendingUp,
  FileText,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { ProgramHealthCards } from "./program-health-cards";
import { WeeklyTrendsChart } from "./weekly-trends-chart";
import { TaskStatusChart } from "./task-status-chart";
import { AdminCharts } from "./admin-charts";
import { NeedsAttentionFeed } from "./needs-attention-feed";

interface TeamData {
  id: string;
  name: string;
  team_points: number;
  total_xp?: number;
}

interface Stats {
  users: { total: number; confirmed: number; pending: number };
  teams: { total: number; active: number };
  tasks: { total: number; completed: number; inProgress: number };
  meetings: number;
  strikes: number;
  reports: number;
  tasksByStatus: {
    completed: number;
    in_progress: number;
    pending_review: number;
    not_started: number;
  };
  teamPoints: TeamData[];
  teamXp: TeamData[];
  weeklyTrends: {
    week_number: number;
    week_year: number;
    week_label: string;
    report_submissions: number;
    tasks_completed: number;
    active_students: number;
  }[];
  programHealth: {
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
  } | null;
}

function OverviewSkeleton() {
  return (
    <div className="space-y-4">
      {/* Health cards skeleton */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="mb-3 h-3 w-20" />
              <Skeleton className="mb-2 h-7 w-16" />
              <Skeleton className="h-3 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Charts skeleton */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="mb-4 h-4 w-40" />
            <Skeleton className="h-52 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="mb-4 h-4 w-40" />
            <Skeleton className="h-52 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const ADMIN_LINKS = [
  {
    title: "Tasks",
    icon: ListChecks,
    href: "/dashboard/admin/tasks",
    color: "text-blue-600",
  },
  {
    title: "Users",
    icon: Users,
    href: "/dashboard/admin/users",
    color: "text-green-600",
  },
  {
    title: "Teams",
    icon: UsersRound,
    href: "/dashboard/admin/teams",
    color: "text-purple-600",
  },
  {
    title: "Peer Reviews",
    icon: FileSearch,
    href: "/dashboard/admin/peer-reviews",
    color: "text-pink-600",
  },
  {
    title: "Progress",
    icon: TrendingUp,
    href: "/dashboard/admin/progress",
    color: "text-teal-600",
  },
  {
    title: "Audit Logs",
    icon: FileText,
    href: "/dashboard/admin/audit-logs",
    color: "text-orange-600",
  },
];

function QuickNav() {
  return (
    <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
      {ADMIN_LINKS.map((link) => {
        const Icon = link.icon;
        return (
          <Link key={link.href} href={link.href}>
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-2 p-3">
                <Icon className={`h-4 w-4 ${link.color}`} />
                <span className="text-sm font-medium">{link.title}</span>
                <ArrowRight className="text-muted-foreground ml-auto h-3.5 w-3.5" />
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

export function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = () => {
    setLoading(true);
    setStats(null);
    fetch("/api/admin/stats")
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStats();
  }, []);

  if (loading) {
    return <OverviewSkeleton />;
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <AlertTriangle className="text-muted-foreground h-10 w-10" />
          <div className="text-center">
            <p className="font-medium">Failed to load platform stats</p>
            <p className="text-muted-foreground mt-1 text-sm">
              This is usually temporary. Please try again.
            </p>
          </div>
          <Button variant="outline" onClick={fetchStats} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Program Health — the most important section */}
      {stats.programHealth && (
        <ProgramHealthCards health={stats.programHealth} />
      )}

      {/* Needs Attention — actionable items */}
      <NeedsAttentionFeed health={stats.programHealth} />

      {/* Charts row: Weekly Trends + Task Pipeline */}
      <div className="grid gap-4 md:grid-cols-2">
        {stats.weeklyTrends && stats.weeklyTrends.length > 0 && (
          <WeeklyTrendsChart data={stats.weeklyTrends} />
        )}
        <TaskStatusChart data={stats.tasksByStatus} />
      </div>

      {/* Team Rankings */}
      <AdminCharts teamPoints={stats.teamPoints} teamXp={stats.teamXp} />

      {/* Quick Nav */}
      <QuickNav />
    </div>
  );
}
