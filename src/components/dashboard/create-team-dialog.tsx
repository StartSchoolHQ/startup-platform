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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { createTeam } from "@/lib/database";
import { useAppContext } from "@/contexts/app-context";
import { Loader2, CreditCard } from "lucide-react";
import posthog from "posthog-js";

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTeamCreated?: () => void;
}

export function CreateTeamDialog({
  open,
  onOpenChange,
  onTeamCreated,
}: CreateTeamDialogProps) {
  const [teamName, setTeamName] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { user, refreshUserData } = useAppContext();

  const TEAM_CREATION_COST = 100;

  // Validation constants
  const MIN_TEAM_NAME_LENGTH = 5;
  const MIN_DESCRIPTION_LENGTH = 20;
  const MAX_DESCRIPTION_LENGTH = 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      console.error("No user ID available");
      return;
    }

    setError("");
    setSuccess("");

    // Validation
    if (teamName.trim().length < MIN_TEAM_NAME_LENGTH) {
      setError(
        `Product/Team name must be at least ${MIN_TEAM_NAME_LENGTH} characters long.`
      );
      return;
    }

    if (description.trim().length < MIN_DESCRIPTION_LENGTH) {
      setError(
        `Description must be at least ${MIN_DESCRIPTION_LENGTH} characters long.`
      );
      return;
    }

    if (description.trim().length > MAX_DESCRIPTION_LENGTH) {
      setError(
        `Description must be at most ${MAX_DESCRIPTION_LENGTH} characters long.`
      );
      return;
    }

    if (user.total_points && user.total_points < TEAM_CREATION_COST) {
      setError(
        `Insufficient credits. You need ${TEAM_CREATION_COST} credits to create a team.`
      );
      return;
    }

    setIsLoading(true);

    try {
      await createTeam(user.id, teamName, description);

      // Track team creation
      posthog.capture("team_created", {
        team_name: teamName,
        description_length: description.length,
        cost: TEAM_CREATION_COST,
        user_points_before: user.total_points,
      });

      // Reset form
      setTeamName("");
      setDescription("");
      setWebsite("");

      // Close dialog
      onOpenChange(false);

      // Refresh data (async - don't await)
      refreshUserData();
      onTeamCreated?.();
    } catch (error) {
      console.error("Error creating team:", error);

      // Track failed team creation
      posthog.capture("team_creation_failed", {
        error_message: error instanceof Error ? error.message : "Unknown error",
        team_name: teamName,
      });

      setError(
        error instanceof Error ? error.message : "Failed to create team"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const canAfford = user
    ? (user.total_points ?? 0) >= TEAM_CREATION_COST
    : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Product Team</DialogTitle>
          <DialogDescription>
            Form a product team to collaborate with other entrepreneurs.
            Creating a product team costs {TEAM_CREATION_COST} credits.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 border-destructive/20 text-destructive rounded-lg border p-3 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-primary/10 border-primary/20 text-primary rounded-lg border p-3 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="teamName">
              Product/Team Name (min {MIN_TEAM_NAME_LENGTH} chars)
            </Label>
            <Input
              id="teamName"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Enter product/team name..."
              required
              disabled={isLoading}
              className="border-[#ff78c8] ring-[#ff78c8]/20 focus:border-[#ff78c8] focus:ring-[#ff78c8]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Description ({MIN_DESCRIPTION_LENGTH}-{MAX_DESCRIPTION_LENGTH}{" "}
              chars)
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setDescription(e.target.value)
              }
              placeholder="Describe your product idea or team mission..."
              rows={3}
              disabled={isLoading}
              maxLength={MAX_DESCRIPTION_LENGTH}
              className="border-[#ff78c8] ring-[#ff78c8]/20 focus:border-[#ff78c8] focus:ring-[#ff78c8]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website (optional)</Label>
            <Input
              id="website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com or example.com"
              disabled={isLoading}
              className="border-[#ff78c8] ring-[#ff78c8]/20 focus:border-[#ff78c8] focus:ring-[#ff78c8]"
            />
          </div>

          <div className="bg-muted flex items-center justify-between rounded-lg p-3">
            <div className="flex items-center gap-2">
              <CreditCard className="text-muted-foreground h-4 w-4" />
              <span className="text-sm">Creation Cost</span>
            </div>
            <span className="font-semibold">{TEAM_CREATION_COST} Credits</span>
          </div>

          <div className="bg-muted flex items-center justify-between rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">Your Balance</span>
            </div>
            <span
              className={`font-semibold ${
                canAfford ? "text-[#ff78c8]" : "text-destructive"
              }`}
            >
              {user?.total_points || 0} Credits
            </span>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isLoading ||
                !canAfford ||
                teamName.trim().length < MIN_TEAM_NAME_LENGTH ||
                description.trim().length < MIN_DESCRIPTION_LENGTH ||
                description.trim().length > MAX_DESCRIPTION_LENGTH
              }
              className="disabled:bg-muted disabled:text-muted-foreground disabled:hover:bg-muted bg-[#ff78c8] text-white hover:bg-[#ff78c8]/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                `Create Product Team (${TEAM_CREATION_COST} Credits)`
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
