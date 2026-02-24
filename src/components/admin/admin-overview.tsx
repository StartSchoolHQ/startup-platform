"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Users,
  UsersRound,
  CheckCircle,
  ListTodo,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { AdminCharts } from "./admin-charts";

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
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="mb-1 h-7 w-16" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.users.total}</div>
            <p className="text-muted-foreground text-xs">
              {stats.users.confirmed} confirmed, {stats.users.pending} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Teams</CardTitle>
            <UsersRound className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.teams.active}</div>
            <p className="text-muted-foreground text-xs">
              {stats.teams.total} total teams
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tasks Available
            </CardTitle>
            <ListTodo className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tasks.total}</div>
            <p className="text-muted-foreground text-xs">
              Template tasks created
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completed Tasks
            </CardTitle>
            <CheckCircle className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tasks.completed}</div>
            <p className="text-muted-foreground text-xs">
              {stats.tasks.inProgress} in progress
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <AdminCharts
        meetings={stats.meetings}
        strikes={stats.strikes}
        reports={stats.reports}
        tasksByStatus={stats.tasksByStatus}
        teamPoints={stats.teamPoints}
        teamXp={stats.teamXp}
      />
    </div>
  );
}
