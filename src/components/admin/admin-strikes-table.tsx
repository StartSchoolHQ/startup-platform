"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAdminStrikes, resolveStrike } from "@/lib/database";
import { useAppContext } from "@/contexts/app-context";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ReviewStrikeModal } from "@/components/admin/review-strike-modal";

interface AdminStrike {
  id: string;
  team_id: string;
  user_id: string | null;
  strike_type: string;
  title: string;
  description: string | null;
  status: string | null;
  explanation: string | null;
  explained_by_user_id: string | null;
  explained_at: string | null;
  resolved_by_user_id: string | null;
  resolved_at: string | null;
  created_at: string | null;
  teams: { id: string; name: string } | null;
  strike_user: { id: string; name: string | null; email: string } | null;
}

export function AdminStrikesTable() {
  const { user } = useAppContext();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'pending' | 'resolved' | 'all'>('pending');
  const [selectedStrike, setSelectedStrike] = useState<AdminStrike | null>(null);

  const { data: strikes = [], isLoading } = useQuery({
    queryKey: ["admin", "strikes", filter],
    queryFn: () => getAdminStrikes(filter),
  });

  const resolveMutation = useMutation({
    mutationFn: async (strikeId: string) => {
      if (!user?.id) throw new Error("User not found");
      return await resolveStrike(strikeId, user.id);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "strikes"] });
      if (data.team_id) {
        queryClient.invalidateQueries({ queryKey: ["teamJourney", "strikes", data.team_id] });
      }
      toast.success("Strike resolved successfully");
      setSelectedStrike(null);
    },
    onError: (error: Error) => {
      console.error("Error resolving strike:", error);
      toast.error("Failed to resolve strike");
    },
  });

  const getStrikeTypeBadge = (type: string) => {
    const types: Record<string, { text: string; variant: 'default' | 'secondary' | 'destructive' }> = {
      missed_weekly_report: { text: "Missed Report", variant: "destructive" },
      missed_meetings: { text: "Missed Meeting", variant: "destructive" },
      missed_task_deadline: { text: "Missed Deadline", variant: "destructive" },
      other: { text: "Other", variant: "secondary" },
    };
    return types[type] || types.other;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading strikes...</div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {strikes.length} {strikes.length === 1 ? 'strike' : 'strikes'}
          </div>
          <Select value={filter} onValueChange={(value: typeof filter) => setFilter(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending Review</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="all">All Strikes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {strikes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No strikes found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Team</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">User</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Type</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Title</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Created</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {strikes.map((strike, index) => {
                  const typeConfig = getStrikeTypeBadge(strike.strike_type);
                  const hasExplanation = !!strike.explanation;
                  const isResolved = !!strike.resolved_at;

                  return (
                    <tr
                      key={strike.id}
                      className={`${
                        index < strikes.length - 1 ? "border-b border-border" : ""
                      } hover:bg-muted/20 transition-colors`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-medium text-sm">
                          {strike.teams?.name || "Unknown Team"}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          {strike.strike_user?.name || strike.strike_user?.email || "Unknown User"}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={typeConfig.variant}>{typeConfig.text}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm max-w-xs truncate">{strike.title}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-xs text-muted-foreground">
                          {strike.created_at ? formatDistanceToNow(new Date(strike.created_at), { addSuffix: true }) : 'N/A'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {isResolved ? (
                          <Badge variant="secondary" className="bg-primary/10 text-primary">
                            Resolved
                          </Badge>
                        ) : hasExplanation ? (
                          <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700">
                            Awaiting Review
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-destructive/10 text-destructive">
                            No Explanation
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedStrike(strike)}
                          >
                            Review
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedStrike && (
        <ReviewStrikeModal
          open={!!selectedStrike}
          onOpenChange={(open: boolean) => !open && setSelectedStrike(null)}
          strike={selectedStrike}
          onResolve={() => resolveMutation.mutate(selectedStrike.id)}
          isResolving={resolveMutation.isPending}
        />
      )}
    </>
  );
}
