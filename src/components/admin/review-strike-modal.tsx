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
            {isResolved ? "This strike has been resolved" : "Review and accept the user's explanation"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Strike Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Team</div>
              <div className="text-sm font-medium">{strike.teams?.name || "Unknown"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">User</div>
              <div className="text-sm font-medium">
                {strike.strike_user?.name || strike.strike_user?.email || "Unknown"}
              </div>
            </div>
          </div>

          {/* Strike Details */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Strike Details</div>
            <div className="rounded-md bg-muted p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-medium">{strike.title}</div>
                <Badge variant="secondary">
                  {strike.strike_type.replace(/_/g, " ")}
                </Badge>
              </div>
              {strike.description && (
                <div className="text-sm text-muted-foreground">{strike.description}</div>
              )}
              <div className="text-xs text-muted-foreground">
                Created {strike.created_at ? formatDistanceToNow(new Date(strike.created_at), { addSuffix: true }) : 'Unknown'}
              </div>
            </div>
          </div>

          {/* Explanation */}
          {strike.explanation ? (
            <div className="space-y-2">
              <div className="text-sm font-medium">User's Explanation</div>
              <div className="rounded-md border p-4 bg-background">
                <div className="text-sm whitespace-pre-wrap">{strike.explanation}</div>
                {strike.explained_at && (
                  <div className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                    Submitted {formatDistanceToNow(new Date(strike.explained_at), { addSuffix: true })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              No explanation provided yet
            </div>
          )}

          {isResolved && (
            <div className="rounded-md bg-primary/10 text-primary p-3 text-sm">
              ✓ Strike resolved {formatDistanceToNow(new Date(strike.resolved_at!), { addSuffix: true })}
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
            <Button
              onClick={onResolve}
              disabled={isResolving}
            >
              {isResolving ? "Resolving..." : "Accept & Resolve"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
