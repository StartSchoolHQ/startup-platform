"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UsersRound, CheckCircle, ListTodo } from "lucide-react";
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

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">Loading stats...</div>
    );
  }

  if (!stats) {
    return <div className="text-sm text-destructive">Failed to load stats</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.users.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.users.confirmed} confirmed, {stats.users.pending} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Teams</CardTitle>
            <UsersRound className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.teams.active}</div>
            <p className="text-xs text-muted-foreground">
              {stats.teams.total} total teams
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tasks Available
            </CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tasks.total}</div>
            <p className="text-xs text-muted-foreground">
              Template tasks created
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completed Tasks
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tasks.completed}</div>
            <p className="text-xs text-muted-foreground">
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
