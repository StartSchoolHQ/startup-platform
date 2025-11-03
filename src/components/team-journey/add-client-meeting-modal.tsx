"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { getTeamDetails } from "@/lib/database";

interface AddClientMeetingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  onSuccess?: () => void;
}

interface TeamMember {
  user_id: string;
  users: {
    name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
}

export function AddClientMeetingModal({
  open,
  onOpenChange,
  teamId,
  onSuccess,
}: AddClientMeetingModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [formData, setFormData] = useState({
    clientName: "",
    responsibleUserId: "",
  });

  const loadTeamMembers = useCallback(async () => {
    try {
      const teamDetails = await getTeamDetails(teamId);
      // Map to our simpler interface
      const simplifiedMembers =
        teamDetails.members?.map((member) => ({
          user_id: member.user_id,
          users: member.users
            ? {
                name: member.users.name,
                email: member.users.email,
                avatar_url: member.users.avatar_url,
              }
            : null,
        })) || [];
      setTeamMembers(simplifiedMembers);
    } catch (error) {
      console.error("Error loading team members:", error);
      toast.error("Failed to load team members");
    }
  }, [teamId]);

  // Load team members when modal opens
  useEffect(() => {
    if (open && teamId) {
      loadTeamMembers();
    }
  }, [open, teamId, loadTeamMembers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const supabase = createClient();

      // Call our RPC function to add the client meeting
      // Using any temporarily until types are updated
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)("add_client_meeting", {
        p_team_id: teamId,
        p_client_name: formData.clientName,
        p_responsible_user_id: formData.responsibleUserId,
      });

      if (error) {
        throw new Error(`Failed to create meeting: ${error.message}`);
      }

      // Success feedback
      toast.success("Client meeting created successfully!");

      // Call success callback to refresh the table
      if (onSuccess) {
        onSuccess();
      }

      // Close modal and reset form
      onOpenChange(false);
      setFormData({
        clientName: "",
        responsibleUserId: "",
      });
    } catch (error) {
      console.error("Error creating client meeting:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create client meeting. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Client Meeting</DialogTitle>
          <DialogDescription>
            Schedule a new client meeting for your team. Complete it to earn 50
            XP + 25 points!
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clientName">Client Name</Label>
            <Input
              id="clientName"
              placeholder="Enter client or company name..."
              value={formData.clientName}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  clientName: e.target.value,
                }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="responsiblePerson">Responsible Person</Label>
            <Select
              value={formData.responsibleUserId}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  responsibleUserId: value,
                }))
              }
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select team member..." />
              </SelectTrigger>
              <SelectContent>
                {teamMembers.map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    {member.users?.name ||
                      member.users?.email ||
                      "Unknown User"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Meeting"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
