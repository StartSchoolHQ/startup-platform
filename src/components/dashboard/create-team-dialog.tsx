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
import { createTeam, debugAuthStatus } from "@/lib/database";
import { useAppContext } from "@/contexts/app-context";
import { Loader2, CreditCard } from "lucide-react";

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { user, refreshUserData } = useAppContext();

  const TEAM_CREATION_COST = 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      console.error("No user ID available");
      return;
    }

    console.log("Creating team for user:", user.id);
    console.log("User credits:", user.total_points);

    // Debug auth status
    const authStatus = await debugAuthStatus();
    console.log("Auth debug:", authStatus);

    setError("");
    setSuccess("");

    if (user.total_points && user.total_points < TEAM_CREATION_COST) {
      setError(
        `Insufficient credits. You need ${TEAM_CREATION_COST} credits to create a team.`
      );
      return;
    }

    setIsLoading(true);

    try {
      await createTeam(user.id, teamName, description);
      await refreshUserData(); // Refresh user credits

      setSuccess(`Team "${teamName}" created successfully!`);
      setTeamName("");
      setDescription("");

      // Call callback to refresh parent data
      onTeamCreated?.();

      // Close dialog after 2 seconds
      setTimeout(() => {
        onOpenChange(false);
        setSuccess("");
      }, 2000);
    } catch (error) {
      console.error("Error creating team:", error);
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
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-primary text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="teamName">Product/Team Name</Label>
            <Input
              id="teamName"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Enter product/team name..."
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setDescription(e.target.value)
              }
              placeholder="Describe your product idea or team mission..."
              rows={3}
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Creation Cost</span>
            </div>
            <span className="font-semibold">{TEAM_CREATION_COST} Credits</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-sm">Your Balance</span>
            </div>
            <span
              className={`font-semibold ${
                canAfford ? "text-primary" : "text-destructive"
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
              disabled={isLoading || !canAfford || !teamName.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
