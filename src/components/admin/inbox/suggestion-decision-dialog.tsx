"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { useAppContext } from "@/contexts/app-context";
import type {
  SuggestionStatus,
  TaskSuggestionRow,
} from "@/types/support-inbox";

interface Props {
  suggestion: TaskSuggestionRow | null;
  decision: Exclude<SuggestionStatus, "pending">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SuggestionDecisionDialog({
  suggestion,
  decision,
  open,
  onOpenChange,
}: Props) {
  const { user } = useAppContext();
  const queryClient = useQueryClient();
  const [note, setNote] = useState(suggestion?.admin_note ?? "");

  const decide = useMutation({
    retry: 0,
    mutationFn: async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from("task_suggestions")
        .update({
          status: decision,
          admin_note: note.trim() || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by_user_id: user?.id ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", suggestion!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "inbox", "task-suggestions"],
      });
      toast.success(
        decision === "accepted" ? "Suggestion accepted" : "Suggestion declined"
      );
      onOpenChange(false);
    },
    onError: () => toast.error("Couldn't update the suggestion. Try again."),
  });

  if (!suggestion) return null;
  const verb = decision === "accepted" ? "Accept" : "Decline";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {verb} “{suggestion.title}”
          </DialogTitle>
          <DialogDescription>
            {decision === "accepted"
              ? "Accepting only records the decision. Create the task itself on the Tasks page."
              : "The student is not notified. The note is for admins."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="decision-note">Note (optional)</Label>
          <Textarea
            id="decision-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            disabled={decide.isPending}
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={decide.isPending}
          >
            Cancel
          </Button>
          <Button
            variant={decision === "declined" ? "destructive" : "default"}
            onClick={() => decide.mutate()}
            disabled={decide.isPending}
          >
            {decide.isPending ? "Saving…" : verb}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
