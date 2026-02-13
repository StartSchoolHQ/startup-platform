"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertTriangle,
  DollarSign,
} from "lucide-react";

interface TeamDetailsModalProps {
  teamId: string | null;
  onClose: () => void;
}

export function TeamDetailsModal({ teamId, onClose }: TeamDetailsModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!teamId) return;

    setLoading(true);
    fetch(`/api/admin/teams/${teamId}`)
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [teamId]);

  if (!teamId) return null;

  return (
    <Dialog open={!!teamId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto transition-all duration-300 ease-in-out">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {loading ? "Loading..." : data?.team?.name}
          </DialogTitle>
          <DialogDescription>
            Comprehensive team overview and management
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <p className="text-muted-foreground">Loading team details...</p>
          </div>
        ) : !data ? (
          <div className="flex items-center justify-center p-12">
            <p className="text-destructive">Failed to load team details</p>
          </div>
        ) : (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="meetings">Meetings</TabsTrigger>
              <TabsTrigger value="strikes">Strikes</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
            </TabsList>

            <div className="min-h-[600px] transition-all duration-300 ease-in-out">
              {/* Overview Tab */}
              <TabsContent
                value="overview"
                className="animate-in fade-in-50 mt-4 space-y-4 duration-300"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Team Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge
                          variant={
                            data.team.status === "active"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {data.team.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Founder:</span>
                        <span className="font-medium">
                          {data.team.founder?.name || "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Members:</span>
                        <span className="font-medium">
                          {data.team.member_count}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Created:</span>
                        <span>
                          {new Date(data.team.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {data.team.website && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Website:
                          </span>
                          <a
                            href={data.team.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            Link
                          </a>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Points & Economy
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Team Points:
                        </span>
                        <span className="text-lg font-medium">
                          {data.team.team_points?.toLocaleString() || 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Formation Cost:
                        </span>
                        <span>{data.team.formation_cost || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Weekly Maintenance:
                        </span>
                        <span>{data.team.weekly_maintenance_cost || 0}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Tasks Completed
                      </CardTitle>
                      <CheckCircle2 className="text-muted-foreground h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {data.tasks.stats.completed}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        of {data.tasks.stats.total} total
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Meetings Held
                      </CardTitle>
                      <Users className="text-muted-foreground h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {data.meetings.stats.completed}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {data.meetings.stats.scheduled} scheduled
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">MRR</CardTitle>
                      <DollarSign className="text-muted-foreground h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        ${data.revenue.total_mrr}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {data.revenue.verified_streams} verified streams
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Strikes
                      </CardTitle>
                      <AlertTriangle className="text-muted-foreground h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {data.strikes.stats.active}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {data.strikes.stats.resolved} resolved
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {data.team.description && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground text-sm">
                        {data.team.description}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Members Tab */}
              <TabsContent
                value="members"
                className="animate-in fade-in-50 mt-4 duration-300"
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Team Members</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>XP</TableHead>
                          <TableHead>Points</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.members.map((member: any) => (
                          <TableRow key={member.id}>
                            <TableCell className="font-medium">
                              {member.user?.name || "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {member.team_role.replace("_", " ")}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {member.user?.total_xp?.toLocaleString() || 0}
                            </TableCell>
                            <TableCell>
                              {member.user?.total_points?.toLocaleString() || 0}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {new Date(member.joined_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {member.left_at ? (
                                <Badge variant="secondary">Left</Badge>
                              ) : (
                                <Badge variant="default">Active</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tasks Tab */}
              <TabsContent
                value="tasks"
                className="animate-in fade-in-50 mt-4 duration-300"
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Task Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Task</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Points</TableHead>
                          <TableHead>Completed</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.tasks.recent.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="text-muted-foreground text-center"
                            >
                              No tasks found
                            </TableCell>
                          </TableRow>
                        ) : (
                          data.tasks.recent.map((task: any) => (
                            <TableRow key={task.id}>
                              <TableCell className="font-medium">
                                {task.task?.title || "—"}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {task.task?.category || "—"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    task.status === "completed"
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {task.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {task.points_awarded ||
                                  task.task?.base_points_reward ||
                                  0}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {task.completed_at
                                  ? new Date(
                                      task.completed_at
                                    ).toLocaleDateString()
                                  : "—"}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Meetings Tab */}
              <TabsContent
                value="meetings"
                className="animate-in fade-in-50 mt-4 duration-300"
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Client Meetings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Client</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Responsible</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.meetings.recent.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="text-muted-foreground text-center"
                            >
                              No meetings found
                            </TableCell>
                          </TableRow>
                        ) : (
                          data.meetings.recent.map((meeting: any) => (
                            <TableRow key={meeting.id}>
                              <TableCell className="font-medium">
                                {meeting.client_name}
                              </TableCell>
                              <TableCell>
                                {meeting.call_type ||
                                  meeting.client_type ||
                                  "—"}
                              </TableCell>
                              <TableCell>
                                {meeting.responsible_user?.name || "—"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    meeting.status === "completed"
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {meeting.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {new Date(
                                  meeting.meeting_date
                                ).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Strikes Tab */}
              <TabsContent
                value="strikes"
                className="animate-in fade-in-50 mt-4 duration-300"
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Strike History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Penalty</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.strikes.recent.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className="text-muted-foreground text-center"
                            >
                              No strikes found
                            </TableCell>
                          </TableRow>
                        ) : (
                          data.strikes.recent.map((strike: any) => (
                            <TableRow key={strike.id}>
                              <TableCell>
                                <Badge variant="outline">
                                  {strike.strike_type.replace("_", " ")}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">
                                {strike.title}
                              </TableCell>
                              <TableCell>{strike.user?.name || "—"}</TableCell>
                              <TableCell>
                                {strike.xp_penalty > 0 &&
                                  `-${strike.xp_penalty} XP `}
                                {strike.points_penalty > 0 &&
                                  `-${strike.points_penalty} pts`}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    strike.status === "active"
                                      ? "destructive"
                                      : "secondary"
                                  }
                                >
                                  {strike.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {new Date(
                                  strike.created_at
                                ).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Transactions Tab */}
              <TabsContent
                value="transactions"
                className="animate-in fade-in-50 mt-4 duration-300"
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Transaction History (Last 50)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead className="text-right">XP</TableHead>
                          <TableHead className="text-right">Points</TableHead>
                          <TableHead>Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.transactions.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className="text-muted-foreground text-center"
                            >
                              No transactions found
                            </TableCell>
                          </TableRow>
                        ) : (
                          data.transactions.map((tx: any) => (
                            <TableRow key={tx.id}>
                              <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                                {new Date(tx.created_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {tx.type.replace("_", " ")}
                                </Badge>
                              </TableCell>
                              <TableCell>{tx.user?.name || "—"}</TableCell>
                              <TableCell
                                className={`text-right font-mono ${
                                  tx.xp_change > 0
                                    ? "text-green-600"
                                    : tx.xp_change < 0
                                      ? "text-red-600"
                                      : ""
                                }`}
                              >
                                {tx.xp_change > 0 ? "+" : ""}
                                {tx.xp_change}
                              </TableCell>
                              <TableCell
                                className={`text-right font-mono ${
                                  tx.points_change > 0
                                    ? "text-green-600"
                                    : tx.points_change < 0
                                      ? "text-red-600"
                                      : ""
                                }`}
                              >
                                {tx.points_change > 0 ? "+" : ""}
                                {tx.points_change}
                              </TableCell>
                              <TableCell className="max-w-xs truncate text-sm">
                                {tx.description}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
