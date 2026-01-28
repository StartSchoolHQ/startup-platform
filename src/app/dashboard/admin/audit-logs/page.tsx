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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  User,
  Database,
  Filter,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { formatAuditLog, getEntityName } from "@/lib/audit-log-formatter";

interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  changed_fields: string[] | null;
  changed_by_user_id: string | null;
  changed_by_name: string | null;
  changed_by_email: string | null;
  created_at: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const { data, error: rpcError } = await (supabase as any).rpc(
        "get_audit_logs",
        {
          p_table_name: tableFilter === "all" ? null : tableFilter,
          p_action: actionFilter === "all" ? null : actionFilter,
          p_user_id: userFilter || null,
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

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleReset = () => {
    setTableFilter("all");
    setActionFilter("all");
    setUserFilter("");
    setFromDate("");
    setToDate("");
  };

  const getActionBadge = (action: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      INSERT: "default",
      UPDATE: "secondary",
      DELETE: "destructive",
    };
    return (
      <Badge variant={variants[action] || "default"} className="font-mono">
        {action}
      </Badge>
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Audit Logs</h1>
        <p className="text-muted-foreground">
          View all database changes and user actions
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Filter audit logs by table, action, user, or date range
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Table Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Table</label>
              <Select value={tableFilter} onValueChange={setTableFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All tables" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tables</SelectItem>
                  <SelectItem value="users">users</SelectItem>
                  <SelectItem value="teams">teams</SelectItem>
                  <SelectItem value="team_members">team_members</SelectItem>
                  <SelectItem value="team_invitations">
                    team_invitations
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Action</label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  <SelectItem value="INSERT">INSERT</SelectItem>
                  <SelectItem value="UPDATE">UPDATE</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* User Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">User ID</label>
              <Input
                type="text"
                placeholder="Filter by user ID"
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
              />
            </div>

            {/* From Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium">From Date</label>
              <Input
                type="datetime-local"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            {/* To Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium">To Date</label>
              <Input
                type="datetime-local"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={fetchLogs}>Apply Filters</Button>
            <Button variant="outline" onClick={handleReset}>
              Reset
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchLogs}
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

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Trail ({logs.length} records)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No audit logs found
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => {
                const formatted = formatAuditLog(log);
                const entityName = getEntityName(log);

                return (
                  <div
                    key={log.id}
                    className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
                  >
                    {/* Main Info */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        {/* Title with icon and user */}
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{formatted.icon}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {log.changed_by_name && (
                                <span className="font-medium">
                                  {log.changed_by_name}
                                </span>
                              )}
                              <span className="text-muted-foreground">
                                {formatted.title}
                              </span>
                              {entityName && (
                                <span className="font-medium">
                                  {entityName}
                                </span>
                              )}
                            </div>
                            {formatted.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {formatted.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Changes Summary */}
                        {formatted.changes.length > 0 && (
                          <div className="space-y-1.5 pl-7">
                            {formatted.changes.map((change, idx) => (
                              <div
                                key={idx}
                                className="flex items-baseline gap-2 text-sm"
                              >
                                <span className="text-muted-foreground min-w-[100px]">
                                  {change.field}:
                                </span>
                                <div className="flex items-center gap-2">
                                  {log.action === "UPDATE" && (
                                    <>
                                      <span className="text-red-600 line-through">
                                        {change.oldValue}
                                      </span>
                                      <span className="text-muted-foreground">
                                        →
                                      </span>
                                    </>
                                  )}
                                  <span className="text-green-600 font-medium">
                                    {change.newValue}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right side - Time and badges */}
                      <div className="flex flex-col items-end gap-2 min-w-[180px]">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(log.created_at)}
                        </div>
                        <div className="flex items-center gap-1">
                          {getActionBadge(log.action)}
                          <Badge variant="outline" className="text-xs">
                            {log.table_name}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Raw Data (Collapsible) */}
                    <details className="pl-7">
                      <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 w-fit">
                        <ChevronDown className="h-3 w-3" />
                        View raw data
                      </summary>
                      <div className="mt-2 space-y-2 p-3 bg-muted/50 rounded text-xs">
                        {log.changed_by_email && (
                          <div>
                            <span className="font-medium">Changed by: </span>
                            <span className="text-muted-foreground">
                              {log.changed_by_email}
                            </span>
                          </div>
                        )}
                        {log.old_data && (
                          <div>
                            <p className="font-medium mb-1">Old Data:</p>
                            <pre className="overflow-x-auto bg-background p-2 rounded">
                              {JSON.stringify(log.old_data, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.new_data && (
                          <div>
                            <p className="font-medium mb-1">New Data:</p>
                            <pre className="overflow-x-auto bg-background p-2 rounded">
                              {JSON.stringify(log.new_data, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </details>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
