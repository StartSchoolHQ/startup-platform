"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface ReviewStrikeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strike: {
    id: string;
    title: string;
    description: string | null;
    strike_type: string;
    explanation: string | null;
    explained_at: string | null;
    created_at: string | null;
    resolved_at: string | null;
    teams: { name: string } | null;
    strike_user: { name: string | null; email: string } | null;
  };
  onResolve: () => void;
  isResolving: boolean;
}

export function ReviewStrikeModal({
  open,
  onOpenChange,
  strike,
  onResolve,
  isResolving,
}: ReviewStrikeModalProps) {
  const isResolved = !!strike.resolved_at;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Review Strike</DialogTitle>
          <DialogDescription>
            {isResolved
              ? "This strike has been resolved"
              : "Review and accept the user's explanation"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Strike Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-muted-foreground mb-1 text-xs">Team</div>
              <div className="text-sm font-medium">
                {strike.teams?.name || "Unknown"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1 text-xs">User</div>
              <div className="text-sm font-medium">
                {strike.strike_user?.name ||
                  strike.strike_user?.email ||
                  "Unknown"}
              </div>
            </div>
          </div>

          {/* Strike Details */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Strike Details</div>
            <div className="bg-muted space-y-2 rounded-md p-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">{strike.title}</div>
                <Badge variant="secondary">
                  {strike.strike_type.replace(/_/g, " ")}
                </Badge>
              </div>
              {strike.description && (
                <div className="text-muted-foreground text-sm">
                  {strike.description}
                </div>
              )}
              <div className="text-muted-foreground text-xs">
                Created{" "}
                {strike.created_at
                  ? formatDistanceToNow(new Date(strike.created_at), {
                      addSuffix: true,
                    })
                  : "Unknown"}
              </div>
            </div>
          </div>

          {/* Explanation */}
          {strike.explanation ? (
            <div className="space-y-2">
              <div className="text-sm font-medium">User's Explanation</div>
              <div className="bg-background rounded-md border p-4">
                <div className="text-sm whitespace-pre-wrap">
                  {strike.explanation}
                </div>
                {strike.explained_at && (
                  <div className="text-muted-foreground mt-3 border-t pt-3 text-xs">
                    Submitted{" "}
                    {formatDistanceToNow(new Date(strike.explained_at), {
                      addSuffix: true,
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground rounded-md border border-dashed p-4 text-center text-sm">
              No explanation provided yet
            </div>
          )}

          {isResolved && (
            <div className="bg-primary/10 text-primary rounded-md p-3 text-sm">
              ✓ Strike resolved{" "}
              {formatDistanceToNow(new Date(strike.resolved_at!), {
                addSuffix: true,
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          {!isResolved && strike.explanation && (
            <Button onClick={onResolve} disabled={isResolving}>
              {isResolving ? "Resolving..." : "Accept & Resolve"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
