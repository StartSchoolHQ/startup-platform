"use client";

import { StudentProgressAlerts } from "@/components/admin/student-progress-alerts";
import { TeamDetailModal } from "@/components/admin/team-detail-modal";
import { AdminSkeleton } from "@/components/ui/admin-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApp } from "@/contexts/app-context";
import { createClient } from "@/lib/supabase/client";
import { AlertTriangle, RefreshCw, TrendingUp, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";

interface TeamProgress {
  team_id: string;
  team_name: string;
  team_status: string;
  member_count: number;
  total_team_xp: number;
  tasks_approved: number;
  tasks_in_progress: number;
  tasks_pending_review: number;
  tasks_not_started: number;
  weekly_reports_count: number;
  last_task_completed_at: string | null;
  last_report_at: string | null;
  days_since_last_activity: number;
  health_status: "green" | "yellow" | "red";
}

export default function StudentProgressPage() {
  const { user, loading: appLoading } = useApp();
  const [teams, setTeams] = useState<TeamProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const fetchProgress = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: rpcError } = await (supabase as any).rpc(
        "get_student_progress_overview"
      );

      if (rpcError) {
        setError(rpcError.message);
        return;
      }

      setTeams(data || []);
    } catch (err) {
      setError("Failed to fetch progress data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.primary_role === "admin") {
      fetchProgress();
    }
  }, [user]);

  // Redirect if not admin
  if (!appLoading && (!user || user.primary_role !== "admin")) {
    redirect("/dashboard");
  }

  if (appLoading) {
    return <AdminSkeleton />;
  }

  const healthBadge = (status: "green" | "yellow" | "red") => {
    switch (status) {
      case "green":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            Active
          </Badge>
        );
      case "yellow":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            Slow
          </Badge>
        );
      case "red":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            Needs Help
          </Badge>
        );
    }
  };

  const formatDaysAgo = (days: number) => {
    if (days > 1000) return "Never";
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days}d ago`;
  };

  // Summary stats
  const redTeams = teams.filter((t) => t.health_status === "red").length;
  const yellowTeams = teams.filter((t) => t.health_status === "yellow").length;
  const greenTeams = teams.filter((t) => t.health_status === "green").length;

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Student Progress
          </h2>
          <p className="text-muted-foreground">
            Track team health and identify who needs help
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchProgress}
          disabled={loading}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Help</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold text-red-600">{redTeams}</div>
            )}
            <p className="text-muted-foreground text-xs">
              Inactive or no progress
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Slowing Down</CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold text-yellow-600">
                {yellowTeams}
              </div>
            )}
            <p className="text-muted-foreground text-xs">7-14 days inactive</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Track</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold text-green-600">
                {greenTeams}
              </div>
            )}
            <p className="text-muted-foreground text-xs">
              Active in last 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* At-Risk Alerts */}
      {!loading && <StudentProgressAlerts teams={teams} />}

      {/* Teams Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Teams</CardTitle>
          <CardDescription>
            {teams.length} active teams sorted by health status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4 text-red-800">
              {error}
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-4 w-8" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-8" />
                  <Skeleton className="h-4 w-8" />
                  <Skeleton className="h-4 w-8" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead className="text-center">Members</TableHead>
                  <TableHead className="text-right">Total XP</TableHead>
                  <TableHead className="text-center">Tasks Done</TableHead>
                  <TableHead className="text-center">In Progress</TableHead>
                  <TableHead className="text-center">Reports</TableHead>
                  <TableHead>Last Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((team) => (
                  <TableRow
                    key={team.team_id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() =>
                      setSelectedTeam({
                        id: team.team_id,
                        name: team.team_name,
                      })
                    }
                  >
                    <TableCell className="font-medium">
                      {team.team_name}
                    </TableCell>
                    <TableCell>{healthBadge(team.health_status)}</TableCell>
                    <TableCell className="text-center">
                      {team.member_count}
                    </TableCell>
                    <TableCell className="text-right">
                      {team.total_team_xp.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      {team.tasks_approved}
                    </TableCell>
                    <TableCell className="text-center">
                      {team.tasks_in_progress + team.tasks_pending_review}
                    </TableCell>
                    <TableCell className="text-center">
                      {team.weekly_reports_count}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDaysAgo(team.days_since_last_activity)}
                    </TableCell>
                  </TableRow>
                ))}
                {teams.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="text-muted-foreground/50 h-8 w-8" />
                        <p className="text-muted-foreground">
                          No active teams yet
                        </p>
                        <p className="text-muted-foreground/70 text-xs">
                          Teams will appear here once students are enrolled
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Team Detail Modal */}
      <TeamDetailModal
        teamId={selectedTeam?.id || null}
        teamName={selectedTeam?.name || ""}
        open={!!selectedTeam}
        onOpenChange={(open) => !open && setSelectedTeam(null)}
      />
    </div>
  );
}
