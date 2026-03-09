"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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

interface ExplainStrikeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strike: {
    id: string;
    title: string;
    datetime: string;
    description?: string;
  } | null;
  teamId: string;
}

export function ExplainStrikeModal({
  open,
  onOpenChange,
  strike,
  teamId,
}: ExplainStrikeModalProps) {
  const { user } = useAppContext();
  const queryClient = useQueryClient();
  const [explanation, setExplanation] = useState("");

  const submitExplanationMutation = useMutation({
    mutationFn: async () => {
      if (!strike || !user?.id || !explanation.trim()) {
        throw new Error("Missing required data");
      }

      const supabase = createClient();

      // Only allow explanation on active strikes (not resolved/rejected)
      const { error } = await supabase
        .from("team_strikes")
        .update({
          explanation: explanation.trim(),
          explained_by_user_id: user.id,
          explained_at: new Date().toISOString(),
          status: "explained",
        })
        .eq("id", strike.id)
        .in("status", ["active", "explained"]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["teamJourney", "strikes", teamId],
      });
      toast.success("Explanation submitted successfully!");
      onOpenChange(false);
      setExplanation("");
    },
    onError: (error: Error) => {
      console.error("Error submitting explanation:", error);
      toast.error("Failed to submit explanation");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Explain Strike</DialogTitle>
          <DialogDescription>
            Provide an explanation for this strike.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">Strike Details</div>
            <div className="bg-muted space-y-1 rounded-md p-3">
              <div className="text-sm font-medium">{strike?.title}</div>
              <div className="text-muted-foreground text-xs">
                {strike?.datetime}
              </div>
              {strike?.description && (
                <div className="text-muted-foreground mt-2 text-xs">
                  {strike.description}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="explanation">Your Explanation *</Label>
            <Textarea
              id="explanation"
              placeholder="Explain the circumstances..."
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
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
            disabled={submitExplanationMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => submitExplanationMutation.mutate()}
            disabled={
              submitExplanationMutation.isPending || !explanation.trim()
            }
          >
            {submitExplanationMutation.isPending ? "Submitting..." : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
