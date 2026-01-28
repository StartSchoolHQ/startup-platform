"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { ClientMeetingSchema } from "@/lib/validation-schemas";
import { FileText, Trash2, Pencil, Save } from "lucide-react";

interface EditMeetingData {
  id: string;
  client_name: string;
  responsible_user_id: string;
  status?: "draft" | "scheduled" | "completed" | "cancelled";
  meeting_data?: {
    clientRole?: string;
    clientResponsibilities?: string;
    segmentRelevance?: string;
    meetingGoal?: string;
    assumptionsTested?: string;
    clientFeedback?: string;
    feedbackValidation?: string;
    feedbackChallenges?: string;
    mainLearnings?: string;
    nextStepsClient?: string;
    interestLevel?: string;
    internalActions?: string;
    actionDeadline?: string;
    actionResponsible?: string;
    teamImprovements?: string;
    meetingDate?: string;
  };
  created_at?: string | null;
}

interface AddClientMeetingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  editMeeting?: EditMeetingData | null;
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
  editMeeting,
}: AddClientMeetingModalProps) {
  const queryClient = useQueryClient();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<typeof formData | null>(
    null,
  );
  const isInitialized = useRef(false);

  // Check if we're in edit mode
  const isEditMode = !!editMeeting;

  const getEmptyFormData = () => ({
    clientName: "",
    responsibleUserId: "",
    meetingDate: new Date().toISOString().split("T")[0],
    clientRole: "",
    clientResponsibilities: "",
    segmentRelevance: "",
    meetingGoal: "",
    assumptionsTested: "",
    clientFeedback: "",
    feedbackValidation: "",
    feedbackChallenges: "",
    mainLearnings: "",
    nextStepsClient: "",
    interestLevel: "",
    internalActions: "",
    actionDeadline: "",
    actionResponsible: "",
    teamImprovements: "",
  });

  const [formData, setFormData] = useState(getEmptyFormData());

  const DRAFT_KEY = `client-meeting-draft-${teamId}`;

  // Save draft to localStorage whenever form changes
  const saveDraft = useCallback(
    (data: typeof formData) => {
      // Only save if there's meaningful content
      const hasContent =
        data.clientName ||
        data.meetingGoal ||
        data.clientFeedback ||
        data.mainLearnings;
      if (hasContent) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
      }
    },
    [DRAFT_KEY],
  );

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
  }, [DRAFT_KEY]);

  // Check for existing draft when modal opens (only for new meetings, not edits)
  useEffect(() => {
    if (open && teamId && !isInitialized.current) {
      // If editing, pre-populate with existing meeting data
      if (isEditMode && editMeeting) {
        const meetingData = editMeeting.meeting_data || {};
        // Try to parse meeting date from meeting_data or created_at
        let meetingDate = new Date().toISOString().split("T")[0];
        if (meetingData.meetingDate) {
          meetingDate = meetingData.meetingDate.split("T")[0];
        } else if (editMeeting.created_at) {
          meetingDate = editMeeting.created_at.split("T")[0];
        }

        setFormData({
          clientName: editMeeting.client_name || "",
          responsibleUserId: editMeeting.responsible_user_id || "",
          meetingDate: meetingDate,
          clientRole: meetingData.clientRole || "",
          clientResponsibilities: meetingData.clientResponsibilities || "",
          segmentRelevance: meetingData.segmentRelevance || "",
          meetingGoal: meetingData.meetingGoal || "",
          assumptionsTested: meetingData.assumptionsTested || "",
          clientFeedback: meetingData.clientFeedback || "",
          feedbackValidation: meetingData.feedbackValidation || "",
          feedbackChallenges: meetingData.feedbackChallenges || "",
          mainLearnings: meetingData.mainLearnings || "",
          nextStepsClient: meetingData.nextStepsClient || "",
          interestLevel: meetingData.interestLevel || "",
          internalActions: meetingData.internalActions || "",
          actionDeadline: meetingData.actionDeadline || "",
          actionResponsible: meetingData.actionResponsible || "",
          teamImprovements: meetingData.teamImprovements || "",
        });
        isInitialized.current = true;
        return;
      }

      // Otherwise check for draft (only for new meetings)
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          setPendingDraft(parsed);
          setShowDraftDialog(true);
        } catch {
          // Invalid draft, clear it
          clearDraft();
        }
      }
      isInitialized.current = true;
    }

    // Reset initialization when modal closes
    if (!open) {
      isInitialized.current = false;
      // Reset form when closing
      if (!isEditMode) {
        setFormData(getEmptyFormData());
      }
    }
  }, [open, teamId, DRAFT_KEY, clearDraft, isEditMode, editMeeting]);

  // Auto-save draft on form changes (debounced effect) - only for new meetings
  useEffect(() => {
    if (open && isInitialized.current && !isEditMode) {
      const timeoutId = setTimeout(() => {
        saveDraft(formData);
      }, 500); // Debounce 500ms
      return () => clearTimeout(timeoutId);
    }
  }, [formData, open, saveDraft]);

  const handleRestoreDraft = () => {
    if (pendingDraft) {
      setFormData(pendingDraft);
      toast.success("Draft restored!");
    }
    setShowDraftDialog(false);
    setPendingDraft(null);
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setFormData(getEmptyFormData());
    setShowDraftDialog(false);
    setPendingDraft(null);
  };

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

  // Mutation for creating client meeting
  const createMeetingMutation = useMutation({
    mutationFn: async (meetingFormData: typeof formData) => {
      const supabase = createClient();

      // Prepare meeting data for JSONB column
      const meetingData = {
        // Q1: Who & relevance
        clientRole: meetingFormData.clientRole,
        clientResponsibilities: meetingFormData.clientResponsibilities,
        segmentRelevance: meetingFormData.segmentRelevance,
        // Q2: Goal & assumptions
        meetingGoal: meetingFormData.meetingGoal,
        assumptionsTested: meetingFormData.assumptionsTested,
        // Q3: Feedback
        clientFeedback: meetingFormData.clientFeedback,
        feedbackValidation: meetingFormData.feedbackValidation,
        feedbackChallenges: meetingFormData.feedbackChallenges,
        // Q4: Main learnings
        mainLearnings: meetingFormData.mainLearnings,
        // Q5: Next steps
        nextStepsClient: meetingFormData.nextStepsClient,
        interestLevel: meetingFormData.interestLevel,
        // Q6: Internal actions
        internalActions: meetingFormData.internalActions,
        actionDeadline: meetingFormData.actionDeadline,
        actionResponsible: meetingFormData.actionResponsible,
        // Q7: Team improvements
        teamImprovements: meetingFormData.teamImprovements,
      };

      // Use the selected meeting date (allows backdating)
      const selectedDate = new Date(meetingFormData.meetingDate);
      selectedDate.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues

      const { error } = await (supabase as any).from("client_meetings").insert({
        team_id: teamId,
        client_name: meetingFormData.clientName,
        responsible_user_id: meetingFormData.responsibleUserId,
        status: "completed",
        meeting_data: meetingData,
        meeting_date: selectedDate.toISOString(),
        completed_at: selectedDate.toISOString(),
      });

      if (error) {
        throw new Error(`Failed to create meeting: ${error.message}`);
      }
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["clientMeetings"] });
      queryClient.invalidateQueries({ queryKey: ["teamJourney", "stats"] });
      queryClient.invalidateQueries({
        queryKey: ["teamJourney", "weeklyReports"],
      });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["user", "profile"] });

      toast.success("Client meeting created successfully!");

      // Clear draft and close modal
      clearDraft();
      onOpenChange(false);
      setFormData(getEmptyFormData());
    },
    onError: (error: Error) => {
      console.error("Error creating client meeting:", error);
      toast.error(
        error.message || "Failed to create client meeting. Please try again.",
      );
    },
  });

  // Mutation for updating existing client meeting
  const updateMeetingMutation = useMutation({
    mutationFn: async (meetingFormData: typeof formData) => {
      if (!editMeeting?.id) throw new Error("No meeting ID for update");

      const supabase = createClient();

      // Prepare meeting data for JSONB column
      const meetingData = {
        clientRole: meetingFormData.clientRole,
        clientResponsibilities: meetingFormData.clientResponsibilities,
        segmentRelevance: meetingFormData.segmentRelevance,
        meetingGoal: meetingFormData.meetingGoal,
        assumptionsTested: meetingFormData.assumptionsTested,
        clientFeedback: meetingFormData.clientFeedback,
        feedbackValidation: meetingFormData.feedbackValidation,
        feedbackChallenges: meetingFormData.feedbackChallenges,
        mainLearnings: meetingFormData.mainLearnings,
        nextStepsClient: meetingFormData.nextStepsClient,
        interestLevel: meetingFormData.interestLevel,
        internalActions: meetingFormData.internalActions,
        actionDeadline: meetingFormData.actionDeadline,
        actionResponsible: meetingFormData.actionResponsible,
        teamImprovements: meetingFormData.teamImprovements,
        meetingDate: meetingFormData.meetingDate,
      };

      const { error } = await supabase
        .from("client_meetings")
        .update({
          client_name: meetingFormData.clientName,
          responsible_user_id: meetingFormData.responsibleUserId,
          meeting_data: meetingData,
        })
        .eq("id", editMeeting.id);

      if (error) {
        throw new Error(`Failed to update meeting: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientMeetings"] });
      toast.success("Client meeting updated successfully!");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      console.error("Error updating client meeting:", error);
      toast.error(
        error.message || "Failed to update client meeting. Please try again.",
      );
    },
  });

  // Mutation for saving as draft (new meetings only)
  const saveDraftMutation = useMutation({
    mutationFn: async (meetingFormData: typeof formData) => {
      const supabase = createClient();

      // Prepare meeting data for JSONB column
      const meetingData = {
        clientRole: meetingFormData.clientRole,
        clientResponsibilities: meetingFormData.clientResponsibilities,
        segmentRelevance: meetingFormData.segmentRelevance,
        meetingGoal: meetingFormData.meetingGoal,
        assumptionsTested: meetingFormData.assumptionsTested,
        clientFeedback: meetingFormData.clientFeedback,
        feedbackValidation: meetingFormData.feedbackValidation,
        feedbackChallenges: meetingFormData.feedbackChallenges,
        mainLearnings: meetingFormData.mainLearnings,
        nextStepsClient: meetingFormData.nextStepsClient,
        interestLevel: meetingFormData.interestLevel,
        internalActions: meetingFormData.internalActions,
        actionDeadline: meetingFormData.actionDeadline,
        actionResponsible: meetingFormData.actionResponsible,
        teamImprovements: meetingFormData.teamImprovements,
        meetingDate: meetingFormData.meetingDate,
      };

      // Call the save_meeting_draft RPC function
      // Cast to any to bypass TypeScript - function exists but types not regenerated
      const { data, error } = await (supabase as any).rpc(
        "save_meeting_draft",
        {
          p_team_id: teamId,
          p_client_name: meetingFormData.clientName || "Untitled Draft",
          p_responsible_user_id: meetingFormData.responsibleUserId,
          p_meeting_data: meetingData,
        },
      );

      if (error) {
        throw new Error(`Failed to save draft: ${error.message}`);
      }
      if (!data?.success) {
        throw new Error(data?.error || "Failed to save draft");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientMeetings"] });
      toast.success("Draft saved to database! You can submit it later.");

      // Clear localStorage draft since it's now in database
      clearDraft();
      onOpenChange(false);
      setFormData(getEmptyFormData());
    },
    onError: (error: Error) => {
      console.error("Error saving draft:", error);
      toast.error(error.message || "Failed to save draft. Please try again.");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if we're editing a draft - drafts don't need full validation
    const isEditingDraft = isEditMode && editMeeting?.status === "draft";

    if (isEditingDraft) {
      // For drafts, only require client name and responsible user
      if (!formData.clientName?.trim()) {
        toast.error("Please enter a client name");
        return;
      }
      if (!formData.responsibleUserId) {
        toast.error("Please select a responsible person");
        return;
      }
      updateMeetingMutation.mutate(formData);
      return;
    }

    // For completed meetings or new submissions, validate all required fields
    const result = ClientMeetingSchema.safeParse(formData);

    if (!result.success) {
      const firstError = result.error.issues[0];
      toast.error(firstError.message);
      return;
    }

    if (isEditMode) {
      updateMeetingMutation.mutate(formData);
    } else {
      createMeetingMutation.mutate(formData);
    }
  };

  // Handler for save as draft button
  const handleSaveAsDraft = () => {
    // Basic validation - at minimum need client name and responsible user
    if (!formData.clientName?.trim()) {
      toast.error("Please enter a client name to save as draft");
      return;
    }
    if (!formData.responsibleUserId) {
      toast.error("Please select a responsible person to save as draft");
      return;
    }
    saveDraftMutation.mutate(formData);
  };

  // Check if mutation is pending
  const isPending =
    createMeetingMutation.isPending ||
    updateMeetingMutation.isPending ||
    saveDraftMutation.isPending;

  // Check if form has any content (for showing draft indicator)
  const hasFormContent =
    formData.clientName ||
    formData.meetingGoal ||
    formData.clientFeedback ||
    formData.mainLearnings;

  return (
    <>
      {/* Draft Restore Dialog */}
      <AlertDialog open={showDraftDialog} onOpenChange={setShowDraftDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              Draft Found
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have an unsaved draft for this team. Would you like to
              continue where you left off?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDiscardDraft}>
              <Trash2 className="h-4 w-4 mr-2" />
              Discard Draft
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreDraft}>
              Continue Editing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isEditMode ? (
                <>
                  <Pencil className="h-4 w-4" />
                  Edit Client Meeting
                </>
              ) : (
                <>
                  Add Client Meeting
                  {hasFormContent && (
                    <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      Draft auto-saved
                    </span>
                  )}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "Update the meeting details. Note: XP and points will not be awarded again."
                : "Document your client interaction. Complete to earn 50 XP + 25 points!"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">
                  Client/Company Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="clientName"
                  placeholder="Enter name..."
                  value={formData.clientName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      clientName: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="responsiblePerson">
                  Responsible Person <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.responsibleUserId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      responsibleUserId: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.users?.name || member.users?.email || "Unknown"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Meeting Date - allows backdating */}
            <div className="space-y-2">
              <Label htmlFor="meetingDate">
                Meeting Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="meetingDate"
                type="date"
                max={new Date().toISOString().split("T")[0]}
                value={formData.meetingDate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    meetingDate: e.target.value,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Select the date when the meeting took place (can be a past date)
              </p>
            </div>

            {/* Q1: Who & relevance */}
            <div className="space-y-3 border-t pt-4">
              <Label className="text-base font-semibold">
                Who did you meet and why is this person relevant?
              </Label>
              <p className="text-sm text-muted-foreground">
                Role, responsibilities (optional), how they match your target
                segment (optional)
              </p>
              <div className="space-y-1">
                <Label className="text-sm">
                  Role <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="e.g., CEO, Marketing Director, Potential User, End Consumer, Student..."
                  value={formData.clientRole}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      clientRole: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">
                  Responsibilities & decision authority (optional)
                </Label>
                <Textarea
                  placeholder="What are their responsibilities? Do they have decision-making authority?"
                  value={formData.clientResponsibilities}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      clientResponsibilities: e.target.value,
                    }))
                  }
                  rows={2}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">
                  Target segment match (optional)
                </Label>
                <Textarea
                  placeholder="How do they match your target customer segment?"
                  value={formData.segmentRelevance}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      segmentRelevance: e.target.value,
                    }))
                  }
                  rows={2}
                />
              </div>
            </div>

            {/* Q2: Goal & assumptions - Combined into single field */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Meeting Goal & Assumptions{" "}
                <span className="text-red-500">*</span>
              </Label>
              <p className="text-sm text-muted-foreground">
                What did you want to learn? What assumptions were you testing?
              </p>
              <Textarea
                placeholder="Example: We wanted to validate that small business owners struggle with inventory tracking. Our assumption was that they spend 5+ hours/week on manual inventory counts..."
                value={formData.meetingGoal}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    meetingGoal: e.target.value,
                    // Also populate assumptionsTested for backwards compatibility
                    assumptionsTested: e.target.value,
                  }))
                }
                rows={3}
              />
            </div>

            {/* Q3: Feedback */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Client Feedback <span className="text-red-500">*</span>
              </Label>
              <p className="text-sm text-muted-foreground">
                What did the client say? Note what validated and challenged your
                assumptions.
              </p>
              <Textarea
                placeholder="Overall client feedback - what did they say about your idea/product?"
                value={formData.clientFeedback}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    clientFeedback: e.target.value,
                  }))
                }
                rows={2}
              />
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">
                  What validated your assumptions? (optional)
                </Label>
                <Textarea
                  placeholder="What feedback confirmed your hypotheses?"
                  value={formData.feedbackValidation}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      feedbackValidation: e.target.value,
                    }))
                  }
                  rows={2}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">
                  What challenged your assumptions? (optional)
                </Label>
                <Textarea
                  placeholder="What feedback contradicted your hypotheses?"
                  value={formData.feedbackChallenges}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      feedbackChallenges: e.target.value,
                    }))
                  }
                  rows={2}
                />
              </div>
            </div>

            {/* Q4: Main learnings */}
            <div className="space-y-2">
              <Label
                htmlFor="mainLearnings"
                className="text-base font-semibold"
              >
                Main Learnings <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="mainLearnings"
                placeholder="What are the key insights and lessons from this meeting? What will you do differently?"
                value={formData.mainLearnings}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    mainLearnings: e.target.value,
                  }))
                }
                rows={3}
              />
            </div>

            {/* Q5: Next steps */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Next Steps <span className="text-red-500">*</span>
              </Label>
              <p className="text-sm text-muted-foreground">
                What was agreed with the client? What&apos;s their level of
                interest?
              </p>
              <Textarea
                placeholder="What was agreed with the client? Any follow-up meetings, trials, or next actions?"
                value={formData.nextStepsClient}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    nextStepsClient: e.target.value,
                  }))
                }
                rows={2}
              />
              <div className="space-y-1">
                <Label className="text-sm">
                  Level of Interest <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.interestLevel}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      interestLevel: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select interest level..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="intent_to_try">Intent to try</SelectItem>
                    <SelectItem value="willingness_to_pay">
                      Willingness to pay
                    </SelectItem>
                    <SelectItem value="introductions">
                      Offered introductions
                    </SelectItem>
                    <SelectItem value="not_interested">
                      Not interested
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Q6: Internal actions */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Internal Actions <span className="text-red-500">*</span>
              </Label>
              <p className="text-sm text-muted-foreground">
                What do you need to do next? Set a deadline and assign
                responsibility.
              </p>
              <Textarea
                placeholder="What actions will your team take based on this meeting?"
                value={formData.internalActions}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    internalActions: e.target.value,
                  }))
                }
                rows={2}
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-sm">
                    Deadline <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={formData.actionDeadline}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        actionDeadline: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">
                    Responsible <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.actionResponsible}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        actionResponsible: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers.map((member) => (
                        <SelectItem
                          key={member.user_id}
                          value={
                            member.users?.name ||
                            member.users?.email ||
                            member.user_id
                          }
                        >
                          {member.users?.name ||
                            member.users?.email ||
                            "Unknown"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Q7: Team improvements (optional) */}
            <div className="space-y-2">
              <Label
                htmlFor="teamImprovements"
                className="text-base font-semibold"
              >
                Any learnings for the team? (optional)
              </Label>
              <p className="text-sm text-muted-foreground">
                How to improve the next meeting
              </p>
              <Textarea
                id="teamImprovements"
                placeholder="Process improvements, what to do differently next time..."
                value={formData.teamImprovements}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    teamImprovements: e.target.value,
                  }))
                }
                rows={2}
              />
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              {hasFormContent && !isEditMode && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    clearDraft();
                    setFormData(getEmptyFormData());
                    toast.success("Draft cleared");
                  }}
                  className="text-muted-foreground hover:text-destructive mr-auto"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear Draft
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              {/* Save as Draft button - only for new meetings */}
              {!isEditMode && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSaveAsDraft}
                  disabled={isPending}
                  className="border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                >
                  <Save className="h-4 w-4 mr-1" />
                  {saveDraftMutation.isPending ? "Saving..." : "Save as Draft"}
                </Button>
              )}
              <Button
                type="submit"
                disabled={isPending}
                className="bg-[#ff78c8] text-white hover:bg-[#ff78c8]/90"
              >
                {isPending
                  ? isEditMode
                    ? "Updating..."
                    : "Creating..."
                  : isEditMode
                    ? "Update Meeting"
                    : "Submit Meeting"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
