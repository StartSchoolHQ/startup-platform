"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { toast } from "sonner";
import { useAppContext } from "@/contexts/app-context";

interface SuggestEditsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
}

export function SuggestEditsModal({
  open,
  onOpenChange,
  taskId,
  taskTitle,
}: SuggestEditsModalProps) {
  const { user } = useAppContext();
  const [suggestion, setSuggestion] = useState("");

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !suggestion.trim()) {
        throw new Error("Missing required data");
      }

      const supabase = createClient();

      const { error } = await supabase
        .from("task_edit_suggestions" as never)
        .insert({
          task_id: taskId,
          user_id: user.id,
          task_title: taskTitle,
          suggestion_text: suggestion.trim(),
        } as never);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Suggestion submitted successfully!");
      onOpenChange(false);
      setSuggestion("");
    },
    onError: (error: Error) => {
      console.error("Error submitting suggestion:", error);
      toast.error("Failed to submit suggestion");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Suggest Edits</DialogTitle>
          <DialogDescription>
            Have an idea to improve this task? Share your suggestion with the
            admin team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">Task</div>
            <div className="bg-muted rounded-md p-3">
              <div className="text-sm font-medium">{taskTitle}</div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="suggestion">Your Suggestion *</Label>
            <Textarea
              id="suggestion"
              placeholder="Describe what you'd like to change or improve..."
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              rows={6}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending || !suggestion.trim()}
          >
            {submitMutation.isPending ? "Submitting..." : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
