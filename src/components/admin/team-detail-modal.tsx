"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import {
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

interface TeamDetailModalProps {
  teamId: string | null;
  teamName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TeamMember {
  user_id: string;
  name: string;
  email: string;
  total_xp: number;
  xp_progress_percent: number;
  joined_at: string;
}

interface TeamDetails {
  team: {
    id: string;
    name: string;
    status: string;
    created_at: string;
  };
  members: TeamMember[];
  task_summary: {
    approved: number;
    in_progress: number;
    pending_review: number;
    not_started: number;
  };
  category_coverage: Array<{
    category: string;
    count: number;
  }>;
  recent_activity: Array<{
    type: string;
    description: string;
    xp_change: number;
    created_at: string;
    user_name: string;
  }>;
  weekly_reports: Array<{
    submitted_at: string;
    status: string;
    week_start_date: string;
  }>;
}

export function TeamDetailModal({
  teamId,
  teamName,
  open,
  onOpenChange,
}: TeamDetailModalProps) {
  const [details, setDetails] = useState<TeamDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDetails = async () => {
      if (!teamId) return;
      setLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error: rpcError } = await (supabase as any).rpc(
          "get_team_progress_details",
          { p_team_id: teamId }
        );
        if (rpcError) {
          setError(rpcError.message);
          return;
        }
        setDetails(data);
      } catch (err) {
        setError("Failed to fetch team details");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (open && teamId) {
      loadDetails();
    }
  }, [open, teamId]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCategory = (category: string) => {
    return category
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {teamName}
          </DialogTitle>
          <DialogDescription>
            Team progress and member details
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 p-4 text-red-800">{error}</div>
        )}

        {details && !loading && (
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6">
              {/* Task Summary */}
              <div>
                <h4 className="mb-3 flex items-center gap-2 font-semibold">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Task Progress
                </h4>
                <div className="grid grid-cols-4 gap-2">
                  <div className="rounded-lg bg-green-50 px-2 py-3 text-center">
                    <div className="text-xl font-bold text-green-700">
                      {details.task_summary?.approved || 0}
                    </div>
                    <div className="text-[10px] text-green-600">Approved</div>
                  </div>
                  <div className="rounded-lg bg-blue-50 px-2 py-3 text-center">
                    <div className="text-xl font-bold text-blue-700">
                      {details.task_summary?.in_progress || 0}
                    </div>
                    <div className="text-[10px] text-blue-600">In Progress</div>
                  </div>
                  <div className="rounded-lg bg-yellow-50 px-2 py-3 text-center">
                    <div className="text-xl font-bold text-yellow-700">
                      {details.task_summary?.pending_review || 0}
                    </div>
                    <div className="text-[10px] text-yellow-600">Pending</div>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-2 py-3 text-center">
                    <div className="text-xl font-bold text-gray-700">
                      {details.task_summary?.not_started || 0}
                    </div>
                    <div className="text-[10px] text-gray-600">Not Started</div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Team Members */}
              <div>
                <h4 className="mb-3 flex items-center gap-2 font-semibold">
                  <TrendingUp className="text-primary h-4 w-4" />
                  Members XP Progress
                </h4>
                <div className="space-y-3">
                  {details.members?.map((member) => (
                    <div key={member.user_id} className="rounded-lg border p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-medium">{member.name}</span>
                        <span className="text-muted-foreground text-sm">
                          {member.total_xp.toLocaleString()} / 8,000 XP
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-200">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${member.xp_progress_percent}%` }}
                        />
                      </div>
                      <div className="text-muted-foreground mt-1 text-right text-xs">
                        {member.xp_progress_percent}% to graduation
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Category Coverage */}
              {details.category_coverage &&
                details.category_coverage.length > 0 && (
                  <div>
                    <h4 className="mb-3 font-semibold">Approved by Category</h4>
                    <div className="flex flex-wrap gap-2">
                      {details.category_coverage.map((cat) => (
                        <Badge
                          key={cat.category}
                          variant="secondary"
                          className="px-3 py-1"
                        >
                          {formatCategory(cat.category)} ({cat.count})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

              <Separator />

              {/* Weekly Reports */}
              <div>
                <h4 className="mb-3 flex items-center gap-2 font-semibold">
                  <FileText className="h-4 w-4 text-orange-600" />
                  Weekly Reports ({details.weekly_reports?.length || 0})
                </h4>
                {details.weekly_reports && details.weekly_reports.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {details.weekly_reports.slice(0, 8).map((report, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {new Date(report.submitted_at).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric" }
                        )}
                      </Badge>
                    ))}
                    {details.weekly_reports.length > 8 && (
                      <Badge variant="outline" className="text-xs">
                        +{details.weekly_reports.length - 8} more
                      </Badge>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No reports submitted yet
                  </p>
                )}
              </div>

              <Separator />

              {/* Recent Activity */}
              <div>
                <h4 className="mb-3 flex items-center gap-2 font-semibold">
                  <Clock className="h-4 w-4 text-blue-600" />
                  Recent Activity
                </h4>
                {details.recent_activity &&
                details.recent_activity.length > 0 ? (
                  <div className="space-y-2">
                    {details.recent_activity
                      .slice(0, 10)
                      .map((activity, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 border-l-2 border-gray-200 py-1 pl-3 text-sm"
                        >
                          <div className="flex-1">
                            <span className="font-medium">
                              {activity.user_name}
                            </span>
                            <span className="text-muted-foreground"> — </span>
                            <span>{activity.description || activity.type}</span>
                            {activity.xp_change > 0 && (
                              <Badge
                                variant="secondary"
                                className="ml-2 bg-green-100 text-xs text-green-800"
                              >
                                +{activity.xp_change} XP
                              </Badge>
                            )}
                          </div>
                          <span className="text-muted-foreground text-xs whitespace-nowrap">
                            {formatDate(activity.created_at)}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No recent activity
                  </p>
                )}
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
