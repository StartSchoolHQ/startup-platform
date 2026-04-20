"use client";

import { HealthSnapshot } from "@/components/admin/health-snapshot";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useApp } from "@/contexts/app-context";
import { createClient } from "@/lib/supabase/client";
import { RefreshCw, Users } from "lucide-react";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Tier = "all" | "active" | "slowing" | "at_risk";
type Scope = "students" | "teams";

interface TeamProgress {
  team_id: string;
  team_name: string;
  team_description: string | null;
  team_status: string;
  member_count: number;
  total_team_xp: number;
  avg_xp_per_member: number;
  tasks_approved: number;
  tasks_in_progress: number;
  tasks_pending_review: number;
  tasks_not_started: number;
  weekly_reports_count: number;
  last_task_completed_at: string | null;
  last_report_at: string | null;
  last_xp_gain_at: string | null;
  days_since_last_xp: number;
  health_status: "green" | "yellow" | "red";
}

interface StudentProgress {
  user_id: string;
  full_name: string | null;
  email: string;
  team_id: string | null;
  team_name: string | null;
  role: string;
  total_xp: number;
  last_sign_in_at: string | null;
  last_transaction_at: string | null;
  last_report_at: string | null;
  last_active_at: string | null;
  days_since_last_active: number;
  health_status: "green" | "yellow" | "red";
}

const TIER_FROM_HEALTH: Record<"green" | "yellow" | "red", Tier> = {
  green: "active",
  yellow: "slowing",
  red: "at_risk",
};

function formatDaysAgo(days: number) {
  if (days >= 9999) return "Never";
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function HealthDot({ status }: { status: "green" | "yellow" | "red" }) {
  const cls =
    status === "green"
      ? "bg-emerald-500"
      : status === "yellow"
        ? "bg-amber-500"
        : "bg-red-500";
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${cls}`} />;
}

function HealthBadge({ status }: { status: "green" | "yellow" | "red" }) {
  switch (status) {
    case "green":
      return (
        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
          Active
        </Badge>
      );
    case "yellow":
      return (
        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
          Slowing
        </Badge>
      );
    case "red":
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
          At Risk
        </Badge>
      );
  }
}

function OneLinerCell({ text }: { text: string | null }) {
  if (!text) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-muted-foreground block max-w-[220px] cursor-help truncate text-xs">
            {text}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm whitespace-normal">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function StudentProgressPage() {
  const { user, loading: appLoading } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialScope: Scope =
    searchParams.get("type") === "students" ? "students" : "teams";
  const initialFilter: Tier = (() => {
    const f = searchParams.get("filter");
    return f === "active" || f === "slowing" || f === "at_risk" ? f : "all";
  })();

  const [scope, setScope] = useState<Scope>(initialScope);
  const [filter, setFilter] = useState<Tier>(initialFilter);

  const [teams, setTeams] = useState<TeamProgress[]>([]);
  const [students, setStudents] = useState<StudentProgress[]>([]);
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
      const [teamsRes, studentsRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).rpc("get_student_progress_overview_v2"),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).rpc("get_students_health_overview_v2"),
      ]);

      if (teamsRes.error) throw new Error(teamsRes.error.message);
      if (studentsRes.error) throw new Error(studentsRes.error.message);

      setTeams(teamsRes.data || []);
      setStudents(studentsRes.data || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch progress data"
      );
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

  // Sync URL → local state (so in-page HealthSnapshot clicks update the view).
  useEffect(() => {
    const t = searchParams.get("type");
    const f = searchParams.get("filter");
    if (t === "students" || t === "teams") setScope(t);
    const validFilter: Tier =
      f === "active" || f === "slowing" || f === "at_risk" ? f : "all";
    setFilter(validFilter);
  }, [searchParams]);

  // Bucket counts for the compact header snapshot (derive from fetched rows).
  const teamBuckets = useMemo(() => {
    const b = { active: 0, slowing: 0, at_risk: 0 };
    teams.forEach((t) => {
      if (t.health_status === "green") b.active++;
      else if (t.health_status === "yellow") b.slowing++;
      else b.at_risk++;
    });
    return b;
  }, [teams]);

  const studentBuckets = useMemo(() => {
    const b = { active: 0, slowing: 0, at_risk: 0 };
    students.forEach((s) => {
      if (s.health_status === "green") b.active++;
      else if (s.health_status === "yellow") b.slowing++;
      else b.at_risk++;
    });
    return b;
  }, [students]);

  const filteredTeams = useMemo(() => {
    if (filter === "all") return teams;
    return teams.filter((t) => TIER_FROM_HEALTH[t.health_status] === filter);
  }, [teams, filter]);

  const filteredStudents = useMemo(() => {
    if (filter === "all") return students;
    return students.filter((s) => TIER_FROM_HEALTH[s.health_status] === filter);
  }, [students, filter]);

  // Map v2 teams → shape StudentProgressAlerts expects (v1 field names).
  // v2 returns 9999 as the "never had XP" sentinel; bump above StudentProgressAlerts'
  // `< 10000` filter so those teams aren't shown as "No activity in 9999 days"
  // (they still surface via the zero_tasks alert).
  const alertsInput = useMemo(
    () =>
      teams.map((t) => ({
        team_id: t.team_id,
        team_name: t.team_name,
        member_count: t.member_count,
        total_team_xp: t.total_team_xp,
        tasks_approved: t.tasks_approved,
        tasks_in_progress: t.tasks_in_progress,
        weekly_reports_count: t.weekly_reports_count,
        days_since_last_activity:
          t.days_since_last_xp >= 9999 ? 99999 : t.days_since_last_xp,
        health_status: t.health_status,
      })),
    [teams]
  );

  if (!appLoading && (!user || user.primary_role !== "admin")) {
    redirect("/dashboard");
  }
  if (appLoading) return <AdminSkeleton />;

  // Sync tab + filter to URL (so snapshot clicks persist and are shareable).
  const updateUrl = (nextScope: Scope, nextFilter: Tier) => {
    const params = new URLSearchParams();
    params.set("type", nextScope);
    if (nextFilter !== "all") params.set("filter", nextFilter);
    router.replace(`/dashboard/admin/progress?${params.toString()}`, {
      scroll: false,
    });
  };

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Student Progress
          </h2>
          <p className="text-muted-foreground">
            Weekly check-in — who&apos;s active, who&apos;s slipping
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

      {/* Health Snapshot (2x3 grid: students + teams). Clicking a row switches tab + filter. */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <Card key={i}>
              <CardContent className="space-y-3 p-5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <HealthSnapshot
          students={{
            ...studentBuckets,
            active_wow_delta: 0,
            at_risk_wow_delta: 0,
          }}
          teams={{
            ...teamBuckets,
            active_wow_delta: 0,
            at_risk_wow_delta: 0,
          }}
        />
      )}

      {/* At-Risk Alerts — actionable suggestions feed */}
      {!loading && <StudentProgressAlerts teams={alertsInput} />}

      {/* Students | Teams tabs with list */}
      <Tabs
        value={scope}
        onValueChange={(v) => {
          const s = v as Scope;
          setScope(s);
          updateUrl(s, filter);
        }}
      >
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="teams">Teams ({teams.length})</TabsTrigger>
            <TabsTrigger value="students">
              Students ({students.length})
            </TabsTrigger>
          </TabsList>

          {/* Filter chips */}
          <div className="flex items-center gap-1">
            {(
              [
                { value: "all", label: "All" },
                { value: "active", label: "🟢 Active" },
                { value: "slowing", label: "🟡 Slowing" },
                { value: "at_risk", label: "🔴 At Risk" },
              ] as { value: Tier; label: string }[]
            ).map((chip) => (
              <Button
                key={chip.value}
                size="sm"
                variant={filter === chip.value ? "default" : "outline"}
                onClick={() => {
                  setFilter(chip.value);
                  updateUrl(scope, chip.value);
                }}
              >
                {chip.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Teams tab */}
        <TabsContent value="teams">
          <Card>
            <CardHeader>
              <CardTitle>Teams</CardTitle>
              <CardDescription>
                {filteredTeams.length} of {teams.length} teams shown
                {filter !== "all" && ` — filtered to "${filter}"`}
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
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-6" />
                      <TableHead>Team</TableHead>
                      <TableHead className="hidden md:table-cell">
                        One-liner
                      </TableHead>
                      <TableHead className="text-center">Members</TableHead>
                      <TableHead className="text-right">
                        Total XP / Avg
                      </TableHead>
                      <TableHead>Last XP</TableHead>
                      <TableHead>Health</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTeams.map((team) => (
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
                        <TableCell>
                          <HealthDot status={team.health_status} />
                        </TableCell>
                        <TableCell className="font-medium">
                          {team.team_name}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <OneLinerCell text={team.team_description} />
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center gap-1">
                            <Users className="text-muted-foreground h-3.5 w-3.5" />
                            {team.member_count}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <div className="font-medium">
                            {team.total_team_xp.toLocaleString()} XP
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {Math.round(
                              team.avg_xp_per_member
                            ).toLocaleString()}
                            /member
                          </div>
                        </TableCell>
                        <TableCell
                          className={
                            team.days_since_last_xp >= 14
                              ? "text-red-600"
                              : team.days_since_last_xp >= 7
                                ? "text-amber-600"
                                : "text-muted-foreground"
                          }
                        >
                          {formatDaysAgo(team.days_since_last_xp)}
                        </TableCell>
                        <TableCell>
                          <HealthBadge status={team.health_status} />
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredTeams.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center">
                          <p className="text-muted-foreground text-sm">
                            No teams in this bucket
                          </p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Students tab */}
        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>Students</CardTitle>
              <CardDescription>
                {filteredStudents.length} of {students.length} students shown
                {filter !== "all" && ` — filtered to "${filter}"`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-6" />
                      <TableHead>Name</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">XP</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead>Health</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((s) => {
                      const daysSinceLogin = s.last_sign_in_at
                        ? Math.floor(
                            (Date.now() -
                              new Date(s.last_sign_in_at).getTime()) /
                              86400000
                          )
                        : 9999;
                      return (
                        <TableRow key={s.user_id} className="hover:bg-muted/50">
                          <TableCell>
                            <HealthDot status={s.health_status} />
                          </TableCell>
                          <TableCell className="font-medium">
                            {s.full_name || s.email}
                          </TableCell>
                          <TableCell>
                            {s.team_name ? (
                              <span className="text-sm">{s.team_name}</span>
                            ) : (
                              <span className="text-muted-foreground text-xs">
                                No team
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {s.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {s.total_xp.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDaysAgo(daysSinceLogin)}
                          </TableCell>
                          <TableCell
                            className={
                              s.days_since_last_active >= 14
                                ? "text-red-600"
                                : s.days_since_last_active >= 7
                                  ? "text-amber-600"
                                  : "text-muted-foreground"
                            }
                          >
                            {formatDaysAgo(s.days_since_last_active)}
                          </TableCell>
                          <TableCell>
                            <HealthBadge status={s.health_status} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredStudents.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="py-8 text-center">
                          <p className="text-muted-foreground text-sm">
                            No students in this bucket
                          </p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <TeamDetailModal
        teamId={selectedTeam?.id || null}
        teamName={selectedTeam?.name || ""}
        open={!!selectedTeam}
        onOpenChange={(open) => !open && setSelectedTeam(null)}
      />
    </div>
  );
}
