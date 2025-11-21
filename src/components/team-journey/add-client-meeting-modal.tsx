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
import { Textarea } from "@/components/ui/textarea";
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
    howItWent: "",
    clientType: "",
    callType: "",
    newThingsLearned: "",
  });

  const loadTeamMembers = useCallback(async () => {
    try {
      const teamDetails = await getTeamDetails(teamId);
      // Map to our simpler interface
      const simplifiedMembers =
        teamDetails.members?.map((member: unknown) => {
          const m = member as {
            user_id: string;
            users: {
              name: string | null;
              email: string;
              avatar_url: string | null;
            } | null;
          };
          return {
            user_id: m.user_id,
            users: m.users
              ? {
                  name: m.users.name,
                  email: m.users.email,
                  avatar_url: m.users.avatar_url,
                }
              : null,
          };
        }) || [];
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
        p_how_it_went: formData.howItWent,
        p_client_type: formData.clientType,
        p_call_type: formData.callType,
        p_new_things_learned: formData.newThingsLearned,
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
        howItWent: "",
        clientType: "",
        callType: "",
        newThingsLearned: "",
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
            XP + 25 points (split evenly among team members)!
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

          <div className="space-y-2">
            <Label htmlFor="clientType">Client Type</Label>
            <Select
              value={formData.clientType}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  clientType: value,
                }))
              }
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select client type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New Client</SelectItem>
                <SelectItem value="returning">Returning Client</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="callType">Type of Call</Label>
            <Select
              value={formData.callType}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  callType: value,
                }))
              }
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select call type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="discovery">Discovery Call</SelectItem>
                <SelectItem value="demo">Product Demo</SelectItem>
                <SelectItem value="follow_up">Follow-up Call</SelectItem>
                <SelectItem value="consultation">Consultation</SelectItem>
                <SelectItem value="proposal">Proposal Presentation</SelectItem>
                <SelectItem value="check_in">Check-in Meeting</SelectItem>
                <SelectItem value="support">Support Call</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="howItWent">How It Went</Label>
            <Select
              value={formData.howItWent}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  howItWent: value,
                }))
              }
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select outcome..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excellent">
                  Excellent - Exceeded expectations
                </SelectItem>
                <SelectItem value="good">Good - Met expectations</SelectItem>
                <SelectItem value="average">
                  Average - Some challenges
                </SelectItem>
                <SelectItem value="poor">Poor - Major issues</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newThingsLearned">New Things You Learned</Label>
            <Textarea
              id="newThingsLearned"
              placeholder="Share insights, client feedback, or lessons learned from this meeting..."
              value={formData.newThingsLearned}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  newThingsLearned: e.target.value,
                }))
              }
              rows={3}
            />
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
