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
  Loader2,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

interface UserDetailModalProps {
  userId: string | null;
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UserDetails {
  user: {
    id: string;
    name: string;
    email: string;
    total_xp: number;
    total_points: number;
    status: string;
    created_at: string;
    last_sign_in_at: string | null;
    xp_progress_percent: number;
  };
  team: {
    id: string;
    name: string;
  } | null;
  task_summary: {
    approved: number;
    in_progress: number;
    pending_review: number;
    not_started: number;
  };
  recent_activity: Array<{
    type: string;
    description: string;
    xp_change: number;
    points_change: number;
    created_at: string;
  }>;
  category_coverage: Array<{
    category: string;
    count: number;
  }>;
}

export function UserDetailModal({
  userId,
  userName,
  open,
  onOpenChange,
}: UserDetailModalProps) {
  const [details, setDetails] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDetails = async () => {
      if (!userId) return;
      setLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error: rpcError } = await (supabase as any).rpc(
          "get_user_progress_details",
          { p_user_id: userId }
        );
        if (rpcError) {
          setError(rpcError.message);
          return;
        }
        setDetails(data);
      } catch (err) {
        setError("Failed to fetch user details");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (open && userId) {
      loadDetails();
    }
  }, [open, userId]);

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
            <User className="h-5 w-5" />
            {userName}
          </DialogTitle>
          <DialogDescription>
            User progress and activity details
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
              {/* User Info + XP Progress */}
              <div className="rounded-lg border p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">
                      {details.user?.email}
                    </p>
                    {details.team && (
                      <div className="mt-1 flex items-center gap-1 text-sm">
                        <Users className="h-3 w-3" />
                        <span>{details.team.name}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      {details.user?.total_xp?.toLocaleString() || 0}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      / 8,000 XP
                    </div>
                  </div>
                </div>
                <div className="h-3 w-full rounded-full bg-gray-200">
                  <div
                    className="bg-primary h-3 rounded-full transition-all"
                    style={{
                      width: `${details.user?.xp_progress_percent || 0}%`,
                    }}
                  />
                </div>
                <div className="text-muted-foreground mt-1 text-right text-xs">
                  {details.user?.xp_progress_percent || 0}% to graduation
                </div>
              </div>

              <Separator />

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

              {/* Category Coverage */}
              {details.category_coverage &&
                details.category_coverage.length > 0 && (
                  <>
                    <div>
                      <h4 className="mb-3 font-semibold">
                        Approved by Category
                      </h4>
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
                    <Separator />
                  </>
                )}

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
                            <span>{activity.description || activity.type}</span>
                            {activity.xp_change > 0 && (
                              <Badge
                                variant="secondary"
                                className="ml-2 bg-green-100 text-xs text-green-800"
                              >
                                +{activity.xp_change} XP
                              </Badge>
                            )}
                            {activity.points_change > 0 && (
                              <Badge
                                variant="secondary"
                                className="ml-1 bg-blue-100 text-xs text-blue-800"
                              >
                                +{activity.points_change} pts
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

              {/* Stats Summary */}
              <Separator />
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-muted/50 rounded-lg px-2 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <TrendingUp className="text-primary h-4 w-4 flex-shrink-0" />
                    <span className="text-base font-bold">
                      {details.user?.total_points?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="text-muted-foreground text-[10px]">
                    Total Points
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg px-2 py-3">
                  <div className="text-sm font-bold">
                    {details.user?.last_sign_in_at
                      ? new Date(
                          details.user.last_sign_in_at
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Never"}
                  </div>
                  <div className="text-muted-foreground text-[10px]">
                    Last Login
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg px-2 py-3">
                  <div className="text-sm font-bold">
                    {new Date(
                      details.user?.created_at || ""
                    ).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                  <div className="text-muted-foreground text-[10px]">
                    Joined
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
