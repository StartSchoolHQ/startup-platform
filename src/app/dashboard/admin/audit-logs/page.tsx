"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, RefreshCw, ChevronDown, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  formatAuditLogV2,
  formatRewardActivity,
  type AuditLogV2,
  type RewardActivity,
} from "@/lib/audit-log-formatter-v2";

interface UserOption {
  id: string;
  name: string;
  email: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogV2[]>([]);
  const [rewards, setRewards] = useState<RewardActivity[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [rewardsLoading, setRewardsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("activity");

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const fetchUsers = async () => {
    try {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).rpc("get_users_for_filter");
      if (data) {
        setUsers(data);
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: rpcError } = await (supabase as any).rpc(
        "get_audit_logs_v2",
        {
          p_category: categoryFilter === "all" ? null : categoryFilter,
          p_user_id: userFilter === "all" ? null : userFilter,
          p_from_date: fromDate || null,
          p_to_date: toDate || null,
          p_limit: 100,
          p_offset: 0,
        }
      );

      if (rpcError) {
        setError(rpcError.message);
        return;
      }

      setLogs(data || []);
    } catch (err) {
      setError("Failed to fetch audit logs");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRewards = async () => {
    setRewardsLoading(true);

    try {
      const supabase = createClient();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: rpcError } = await (supabase as any).rpc(
        "get_rewards_activity",
        {
          p_user_id: userFilter === "all" ? null : userFilter,
          p_from_date: fromDate || null,
          p_to_date: toDate || null,
          p_limit: 100,
          p_offset: 0,
        }
      );

      if (rpcError) {
        console.error("Failed to fetch rewards:", rpcError);
        return;
      }

      setRewards(data || []);
    } catch (err) {
      console.error("Failed to fetch rewards", err);
    } finally {
      setRewardsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === "rewards" && rewards.length === 0) {
      fetchRewards();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleApplyFilters = () => {
    fetchLogs();
    if (activeTab === "rewards") {
      fetchRewards();
    }
  };

  const handleReset = () => {
    setCategoryFilter("all");
    setUserFilter("all");
    setFromDate("");
    setToDate("");
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFullDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Activity Log</h1>
        <p className="text-muted-foreground">
          Track all platform activity and rewards
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Category Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  <SelectItem value="team">👥 Team Activity</SelectItem>
                  <SelectItem value="task">✅ Tasks</SelectItem>
                  <SelectItem value="strike">⚠️ Strikes</SelectItem>
                  <SelectItem value="report">📊 Reports</SelectItem>
                  <SelectItem value="meeting">📅 Meetings</SelectItem>
                  <SelectItem value="user">👤 User Profiles</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* User Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">User</label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* From Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium">From</label>
              <Input
                type="datetime-local"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            {/* To Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium">To</label>
              <Input
                type="datetime-local"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button onClick={handleApplyFilters}>Apply</Button>
            <Button variant="outline" onClick={handleReset}>
              Reset
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleApplyFilters}
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="activity">Activity ({logs.length})</TabsTrigger>
          <TabsTrigger value="rewards">
            Rewards & Points ({rewards.length})
          </TabsTrigger>
        </TabsList>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Platform changes and user actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-muted-foreground py-8 text-center">
                  Loading...
                </div>
              ) : logs.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center">
                  No activity found
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => {
                    const formatted = formatAuditLogV2(log);

                    return (
                      <div
                        key={log.id}
                        className="hover:bg-muted/50 rounded-lg border p-4 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            {/* Summary */}
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{formatted.icon}</span>
                              <span className="font-medium">
                                {formatted.summary}
                              </span>
                            </div>

                            {/* Details */}
                            {formatted.details && (
                              <p className="text-muted-foreground mt-1 pl-8 text-sm">
                                {formatted.details}
                              </p>
                            )}
                          </div>

                          {/* Right side */}
                          <div className="flex flex-col items-end gap-2">
                            <div className="text-muted-foreground flex items-center gap-1 text-xs">
                              <Calendar className="h-3 w-3" />
                              {formatDate(log.created_at)}
                            </div>
                            <Badge
                              variant="secondary"
                              className={`text-xs ${formatted.categoryColor}`}
                            >
                              {formatted.categoryLabel}
                            </Badge>
                          </div>
                        </div>

                        {/* Expandable raw data (hidden by default) */}
                        {!formatted.hideRawData && (
                          <details className="mt-3 pl-8">
                            <summary className="text-muted-foreground hover:text-foreground flex w-fit cursor-pointer items-center gap-1 text-xs">
                              <ChevronDown className="h-3 w-3" />
                              Technical details
                            </summary>
                            <div className="bg-muted/50 mt-2 rounded p-3 text-xs">
                              <pre className="overflow-x-auto">
                                {JSON.stringify(
                                  {
                                    table: log.table_name,
                                    action: log.action,
                                    changed_fields: log.changed_fields,
                                  },
                                  null,
                                  2
                                )}
                              </pre>
                            </div>
                          </details>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rewards Tab */}
        <TabsContent value="rewards">
          <Card>
            <CardHeader>
              <CardTitle>Rewards & Points</CardTitle>
              <CardDescription>
                XP and points earned from tasks, meetings, and activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rewardsLoading ? (
                <div className="text-muted-foreground py-8 text-center">
                  Loading...
                </div>
              ) : rewards.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center">
                  No rewards found
                </div>
              ) : (
                <div className="space-y-3">
                  {rewards.map((reward) => {
                    const formatted = formatRewardActivity(reward);

                    return (
                      <div
                        key={reward.id}
                        className="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-4 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{formatted.icon}</span>
                          <div>
                            <p className="font-medium">{formatted.summary}</p>
                            <p className="text-muted-foreground text-sm">
                              {reward.team_name && `${reward.team_name} • `}
                              {formatFullDate(reward.created_at)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {reward.xp_change !== 0 && (
                            <Badge
                              variant={
                                reward.xp_change > 0 ? "default" : "destructive"
                              }
                              className="font-mono"
                            >
                              {formatted.xpBadge}
                            </Badge>
                          )}
                          {reward.points_change !== 0 && (
                            <Badge variant="secondary" className="font-mono">
                              {formatted.pointsBadge}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
