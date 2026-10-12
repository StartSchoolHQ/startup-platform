"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ReassignCandidate } from "@/hooks/use-team-task";

/** Pick the member a team task moves to. */
export function ReassignTaskDialog({
  open,
  onOpenChange,
  members,
  currentUserId,
  pending,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: ReassignCandidate[];
  currentUserId: string | undefined;
  pending: boolean;
  onPick: (userId: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reassign task</DialogTitle>
          <DialogDescription>
            Choose the team member who takes this task over.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-60 space-y-1 overflow-y-auto">
          {members.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => onPick(member.id)}
              disabled={pending}
              className="hover:bg-muted flex w-full items-center gap-3 rounded-md p-2 text-left disabled:opacity-50"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={member.avatar_url || ""} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                  {member.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{member.name}</span>
              {member.id === currentUserId && (
                <span className="text-muted-foreground ml-auto text-xs">
                  Current
                </span>
              )}
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
