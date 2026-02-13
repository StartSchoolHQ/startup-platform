"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Suggestion {
  id: string;
  task_id: string;
  user_id: string;
  task_title: string;
  suggestion_text: string;
  status: "pending" | "reviewed";
  created_at: string;
  users: {
    name: string | null;
    email: string;
  } | null;
}

export function AdminSuggestionsTable() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "reviewed" | "all">(
    "pending"
  );

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ["admin", "suggestions", filter],
    queryFn: async () => {
      const supabase = createClient();

      let query = supabase
        .from("task_edit_suggestions" as never)
        .select(
          `
          id,
          task_id,
          user_id,
          task_title,
          suggestion_text,
          status,
          created_at,
          users!user_id (
            name,
            email
          )
        `
        )
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data as unknown as Suggestion[]) || [];
    },
  });

  const markAsReviewedMutation = useMutation({
    mutationFn: async (suggestionId: string) => {
      const supabase = createClient();

      const { error } = await supabase
        .from("task_edit_suggestions" as never)
        .update({ status: "reviewed" } as never)
        .eq("id", suggestionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "suggestions"] });
      toast.success("Suggestion marked as reviewed");
    },
    onError: (error: Error) => {
      console.error("Error updating suggestion:", error);
      toast.error("Failed to update suggestion");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading suggestions...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground text-sm">
          {suggestions.length}{" "}
          {suggestions.length === 1 ? "suggestion" : "suggestions"}
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("pending")}
          >
            Pending
          </Button>
          <Button
            variant={filter === "reviewed" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("reviewed")}
          >
            Reviewed
          </Button>
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            All
          </Button>
        </div>
      </div>

      {suggestions.length === 0 ? (
        <div className="text-muted-foreground py-8 text-center">
          No suggestions found
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-border border-b">
                <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                  Task
                </th>
                <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                  Suggestion
                </th>
                <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                  Submitted By
                </th>
                <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                  Date
                </th>
                <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                  Status
                </th>
                <th className="text-muted-foreground px-4 py-4 text-right font-medium">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map((suggestion, index) => (
                <tr
                  key={suggestion.id}
                  className={`${
                    index < suggestions.length - 1
                      ? "border-border border-b"
                      : ""
                  } hover:bg-muted/20 transition-colors`}
                >
                  <td className="px-4 py-3">
                    <div className="max-w-xs truncate text-sm font-medium">
                      {suggestion.task_title}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-muted-foreground line-clamp-3 max-w-md text-sm whitespace-pre-wrap">
                      {suggestion.suggestion_text}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      {suggestion.users?.name ||
                        suggestion.users?.email ||
                        "Unknown"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-muted-foreground text-xs whitespace-nowrap">
                      {formatDistanceToNow(new Date(suggestion.created_at), {
                        addSuffix: true,
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="secondary"
                      className={
                        suggestion.status === "pending"
                          ? "bg-yellow-500/10 text-yellow-700"
                          : "bg-green-500/10 text-green-700"
                      }
                    >
                      {suggestion.status === "pending" ? "Pending" : "Reviewed"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      {suggestion.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            markAsReviewedMutation.mutate(suggestion.id)
                          }
                          disabled={markAsReviewedMutation.isPending}
                        >
                          {markAsReviewedMutation.isPending
                            ? "Updating..."
                            : "Mark as Reviewed"}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
