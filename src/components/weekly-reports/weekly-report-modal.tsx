"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import { getCurrentWeekBoundaries } from "@/lib/weekly-reports";
import { WeeklyReportSchema } from "@/lib/validation-schemas";
import { FileText, Trash2, Save } from "lucide-react";

interface WeeklyReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  userId: string;
  onSuccess?: () => void;
}

type CommitmentStatus = "completed" | "in_progress" | "not_done";

interface FormCommitment {
  text: string;
  status: CommitmentStatus;
  explanation: string;
}

interface FormData {
  commitments: FormCommitment[];
  blockers: string;
  meetingsHeld: number;
  keyInsight: string;
  mostImportantOutcome: string;
  measurableProgress: string;
  biggestAchievement: string;
  achievementImpact: string;
  nextWeekCommitments: string[];
  teamRecognition: string;
  alignmentScore: number;
  alignmentReason: string;
}

const getEmptyFormData = (): FormData => ({
  // Q1: Top 3 commitments from last week
  commitments: [
    { text: "", status: "completed", explanation: "" },
    { text: "", status: "completed", explanation: "" },
    { text: "", status: "completed", explanation: "" },
  ],
  // Q2: Blockers (optional, single field)
  blockers: "",
  // Q3: User/customer interactions
  meetingsHeld: 0,
  keyInsight: "",
  mostImportantOutcome: "",
  // Q4: Measurable progress
  measurableProgress: "",
  // Q5: Most important achievement
  biggestAchievement: "",
  achievementImpact: "",
  // Q6: Top 3 commitments for next week
  nextWeekCommitments: ["", "", ""],
  // Q7: Team recognition
  teamRecognition: "",
  // Q8: Alignment/motivation
  alignmentScore: 5,
  alignmentReason: "",
});

export function WeeklyReportModal({
  open,
  onOpenChange,
  teamId,
  userId,
  onSuccess,
}: WeeklyReportModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [formData, setFormData] = useState(getEmptyFormData());
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<FormData | null>(null);
  const [existingDraftId, setExistingDraftId] = useState<string | null>(null);
  const isInitialized = useRef(false);

  const DRAFT_KEY = `weekly-report-draft-${teamId}-${userId}`;
  const MIN_TEXT_LENGTH = 5; // Reduced from 20

  // Save draft to localStorage (for unsaved changes while modal is open)
  const saveDraft = useCallback(
    (data: typeof formData) => {
      const hasContent =
        data.commitments.some((c) => c.text.trim()) ||
        data.blockers ||
        data.biggestAchievement ||
        data.nextWeekCommitments.some((c) => c.trim());
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

  // Load draft from database when modal opens
  useEffect(() => {
    const loadDraftFromDatabase = async () => {
      if (!open || !teamId || !userId || isInitialized.current) return;
      
      setIsLoadingDraft(true);
      try {
        const supabase = createClient();
        const currentWeek = await getCurrentWeekBoundaries();
        
        if (!currentWeek) {
          isInitialized.current = true;
          setIsLoadingDraft(false);
          return;
        }

        // Check for existing draft in database
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: draftData, error } = await (supabase as any)
          .from("weekly_reports")
          .select("id, submission_data")
          .eq("user_id", userId)
          .eq("team_id", teamId)
          .eq("context", "team")
          .eq("week_number", currentWeek.week_number)
          .eq("week_year", currentWeek.week_year)
          .eq("status", "draft")
          .single();

        if (!error && draftData?.submission_data) {
          // Found a draft in database - load it
          const savedData = draftData.submission_data;
          setExistingDraftId(draftData.id);
          
          // Convert database format to form format
          const restoredForm: FormData = {
            commitments: savedData.commitments?.length > 0 
              ? savedData.commitments.map((c: { text: string; status: CommitmentStatus; explanation?: string }) => ({
                  text: c.text || "",
                  status: c.status || "completed",
                  explanation: c.explanation || "",
                }))
              : getEmptyFormData().commitments,
            blockers: savedData.blockers || "",
            meetingsHeld: savedData.meetingsHeld || 0,
            keyInsight: savedData.keyInsight || "",
            mostImportantOutcome: savedData.mostImportantOutcome || "",
            measurableProgress: savedData.measurableProgress || "",
            biggestAchievement: savedData.biggestAchievement || "",
            achievementImpact: savedData.achievementImpact || "",
            nextWeekCommitments: savedData.nextWeekCommitments?.length > 0
              ? [...savedData.nextWeekCommitments, "", "", ""].slice(0, 3)
              : ["", "", ""],
            teamRecognition: savedData.teamRecognition || "",
            alignmentScore: savedData.alignmentScore || 5,
            alignmentReason: savedData.alignmentReason || "",
          };
          
          // Ensure we have exactly 3 commitments
          while (restoredForm.commitments.length < 3) {
            restoredForm.commitments.push({ text: "", status: "completed", explanation: "" });
          }
          
          setFormData(restoredForm);
          toast.success("Draft loaded from your previous session!");
        } else {
          // No database draft - check localStorage for unsaved changes
          const savedDraft = localStorage.getItem(DRAFT_KEY);
          if (savedDraft) {
            try {
              const parsed = JSON.parse(savedDraft);
              setPendingDraft(parsed);
              setShowDraftDialog(true);
            } catch {
              clearDraft();
            }
          }
        }
      } catch (err) {
        console.error("Error loading draft:", err);
      } finally {
        isInitialized.current = true;
        setIsLoadingDraft(false);
      }
    };

    loadDraftFromDatabase();

    if (!open) {
      isInitialized.current = false;
      setFormData(getEmptyFormData());
      setExistingDraftId(null);
    }
  }, [open, teamId, userId, DRAFT_KEY, clearDraft]);

  // Auto-save draft on form changes (debounced) - only to localStorage
  useEffect(() => {
    if (open && isInitialized.current && !isLoadingDraft) {
      const timeoutId = setTimeout(() => {
        saveDraft(formData);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [formData, open, saveDraft, isLoadingDraft]);

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

  // Mutation for saving as draft to database
  const saveDraftMutation = useMutation({
    mutationFn: async (draftData: typeof formData) => {
      const supabase = createClient();
      const currentWeek = await getCurrentWeekBoundaries();

      if (!currentWeek) {
        throw new Error("Failed to get current week boundaries");
      }

      const submissionData = {
        commitments: draftData.commitments.filter(
          (c) => c.text.trim().length > 0,
        ),
        blockers: draftData.blockers,
        meetingsHeld: draftData.meetingsHeld,
        keyInsight: draftData.keyInsight,
        mostImportantOutcome: draftData.mostImportantOutcome,
        measurableProgress: draftData.measurableProgress,
        biggestAchievement: draftData.biggestAchievement,
        achievementImpact: draftData.achievementImpact,
        nextWeekCommitments: draftData.nextWeekCommitments.filter((c) =>
          c.trim(),
        ),
        teamRecognition: draftData.teamRecognition,
        alignmentScore: draftData.alignmentScore,
        alignmentReason: draftData.alignmentReason,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc(
        "save_weekly_report_draft",
        {
          p_user_id: userId,
          p_team_id: teamId,
          p_week_start_date: currentWeek.week_start,
          p_week_end_date: currentWeek.week_end,
          p_week_number: currentWeek.week_number,
          p_week_year: currentWeek.week_year,
          p_submission_data: submissionData,
        },
      );

      if (error) throw new Error(`Failed to save draft: ${error.message}`);
      if (!data?.success)
        throw new Error(data?.error || "Failed to save draft");
      return data;
    },
    onSuccess: () => {
      toast.success("Draft saved! You can continue later.");
      clearDraft();
      onOpenChange(false);
      setFormData(getEmptyFormData());
    },
    onError: (error: Error) => {
      console.error("Error saving draft:", error);
      toast.error(error.message || "Failed to save draft");
    },
  });

  const handleSaveAsDraft = () => {
    // No validation for drafts - save whatever they have
    saveDraftMutation.mutate(formData);
  };

  // Check if form has content (for showing draft indicator)
  const hasFormContent =
    formData.commitments.some((c) => c.text.trim()) ||
    formData.blockers ||
    formData.biggestAchievement ||
    formData.nextWeekCommitments.some((c) => c.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Transform formData to match schema (filter empty next week commitments)
    const dataToValidate = {
      ...formData,
      nextWeekCommitments: formData.nextWeekCommitments.filter((c) => c.trim()),
    };

    // Validate with Zod
    const result = WeeklyReportSchema.safeParse(dataToValidate);

    if (!result.success) {
      const firstError = result.error.issues[0];
      toast.error(firstError.message);
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const currentWeek = await getCurrentWeekBoundaries();

      if (!currentWeek) {
        throw new Error("Failed to get current week boundaries");
      }

      const submissionData = {
        commitments: formData.commitments.filter(
          (c) => c.text.trim().length > 0,
        ),
        blockers: formData.blockers,
        meetingsHeld: formData.meetingsHeld,
        keyInsight: formData.keyInsight,
        mostImportantOutcome: formData.mostImportantOutcome,
        measurableProgress: formData.measurableProgress,
        biggestAchievement: formData.biggestAchievement,
        achievementImpact: formData.achievementImpact,
        nextWeekCommitments: formData.nextWeekCommitments.filter((c) =>
          c.trim(),
        ),
        teamRecognition: formData.teamRecognition,
        alignmentScore: formData.alignmentScore,
        alignmentReason: formData.alignmentReason,
        submittedAt: new Date().toISOString(),
      };

      // If we have an existing draft, update it to submitted status
      // Otherwise, insert a new record
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let submitError: Error | null = null;
      
      if (existingDraftId) {
        // Update the draft to submitted
        const { error } = await (supabase as any)
          .from("weekly_reports")
          .update({
            submission_data: submissionData,
            status: "submitted",
            submitted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingDraftId);
        
        if (error) submitError = new Error(`Failed to submit report: ${error.message}`);
      } else {
        // Insert new record
        const { error } = await (supabase as any)
          .from("weekly_reports")
          .insert({
            user_id: userId,
            team_id: teamId,
            context: "team",
            week_start_date: currentWeek.week_start,
            week_end_date: currentWeek.week_end,
            week_number: currentWeek.week_number,
            week_year: currentWeek.week_year,
            submission_data: submissionData,
            status: "submitted",
            submitted_at: new Date().toISOString(),
          });
        
        if (error) submitError = new Error(`Failed to submit report: ${error.message}`);
      }

      if (submitError) {
        throw submitError;
      }

      toast.success("Weekly report submitted successfully!");
      clearDraft();
      if (onSuccess) onSuccess();
      onOpenChange(false);
      setFormData(getEmptyFormData());
    } catch (error) {
      console.error("Error submitting weekly report:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to submit weekly report. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPending = isSubmitting || saveDraftMutation.isPending;

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
              You have an unsaved weekly report draft. Would you like to
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
              Submit Weekly Report
              {hasFormContent && (
                <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  Draft auto-saved
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              Share your weekly progress with your team.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Q1: Top 3 commitments from last week */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                1. What were your top 3 commitments from last week?{" "}
                <span className="text-red-500">*</span>
              </Label>
              <p className="text-sm text-muted-foreground">
                Provide status. Explanation is optional (shown only for
                incomplete items).
              </p>

              {formData.commitments.map((commitment, index) => (
                <div key={index} className="space-y-2 p-3 border rounded-lg">
                  <Label htmlFor={`commitment-${index}`}>
                    Commitment #{index + 1}
                  </Label>
                  <Textarea
                    id={`commitment-${index}`}
                    placeholder={`Describe commitment #${index + 1}...`}
                    value={commitment.text}
                    onChange={(e) => {
                      const newCommitments = [...formData.commitments];
                      newCommitments[index].text = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        commitments: newCommitments,
                      }));
                    }}
                    rows={2}
                  />
                  <div className="flex gap-2 items-center">
                    <Label htmlFor={`status-${index}`} className="text-sm">
                      Status:
                    </Label>
                    <Select
                      value={commitment.status}
                      onValueChange={(value) => {
                        const newCommitments = [...formData.commitments];
                        newCommitments[index].status = value as
                          | "completed"
                          | "in_progress"
                          | "not_done";
                        // Clear explanation if switching to completed
                        if (value === "completed") {
                          newCommitments[index].explanation = "";
                        }
                        setFormData((prev) => ({
                          ...prev,
                          commitments: newCommitments,
                        }));
                      }}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="completed">✅ Completed</SelectItem>
                        <SelectItem value="in_progress">
                          🔄 In Progress
                        </SelectItem>
                        <SelectItem value="not_done">❌ Not Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Conditional explanation - only show for in_progress or not_done */}
                  {(commitment.status === "in_progress" ||
                    commitment.status === "not_done") && (
                    <Input
                      placeholder="Brief explanation (optional)..."
                      value={commitment.explanation}
                      onChange={(e) => {
                        const newCommitments = [...formData.commitments];
                        newCommitments[index].explanation = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          commitments: newCommitments,
                        }));
                      }}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Q2: Blockers/challenges - OPTIONAL single field */}
            <div className="space-y-3">
              <Label htmlFor="blockers" className="text-base font-semibold">
                2. What blockers or challenges did you face? (optional)
              </Label>
              <Textarea
                id="blockers"
                placeholder="What happened and why it happened..."
                value={formData.blockers}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, blockers: e.target.value }))
                }
                rows={3}
              />
            </div>

            {/* Q3: User/customer interactions */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                3. What user or customer interactions did you have this week?{" "}
                <span className="text-red-500">*</span>
              </Label>
              <div className="space-y-2">
                <Label htmlFor="meetingsHeld">Number of meetings held</Label>
                <Input
                  id="meetingsHeld"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.meetingsHeld}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      meetingsHeld: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <Textarea
                placeholder="Key insight from interactions..."
                value={formData.keyInsight}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    keyInsight: e.target.value,
                  }))
                }
                rows={2}
              />
              <Textarea
                placeholder="Most important outcome..."
                value={formData.mostImportantOutcome}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    mostImportantOutcome: e.target.value,
                  }))
                }
                rows={2}
              />
            </div>

            {/* Q4: Measurable progress */}
            <div className="space-y-2">
              <Label
                htmlFor="measurableProgress"
                className="text-base font-semibold"
              >
                4. What measurable progress did you make toward traction or
                product improvements? <span className="text-red-500">*</span>
              </Label>
              <p className="text-sm text-muted-foreground">
                Data, not opinions: users onboarded, signups, conversions,
                prototype tested, etc.
              </p>
              <Textarea
                id="measurableProgress"
                placeholder="Describe measurable progress with specific data..."
                value={formData.measurableProgress}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    measurableProgress: e.target.value,
                  }))
                }
                rows={3}
                className={
                  formData.measurableProgress.trim().length > 0 &&
                  formData.measurableProgress.trim().length < MIN_TEXT_LENGTH
                    ? "border-red-500"
                    : ""
                }
              />
            </div>

            {/* Q5: Most important achievement */}
            <div className="space-y-2">
              <Label
                htmlFor="biggestAchievement"
                className="text-base font-semibold"
              >
                5. What was your most important achievement this week?{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="biggestAchievement"
                placeholder="Your most significant accomplishment..."
                value={formData.biggestAchievement}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    biggestAchievement: e.target.value,
                  }))
                }
                rows={2}
                className={
                  formData.biggestAchievement.trim().length > 0 &&
                  formData.biggestAchievement.trim().length < MIN_TEXT_LENGTH
                    ? "border-red-500"
                    : ""
                }
              />
              <Textarea
                placeholder="Why does it matter? (Impact on validation, product or revenue)"
                value={formData.achievementImpact}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    achievementImpact: e.target.value,
                  }))
                }
                rows={2}
              />
            </div>

            {/* Q6: Top 3 commitments for next week */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                6. Top 3 commitments for next week{" "}
                <span className="text-red-500">*</span>
              </Label>
              <p className="text-sm text-muted-foreground">
                What are you committing to accomplish next week?
              </p>
              {formData.nextWeekCommitments.map((commitment, index) => (
                <div key={index} className="space-y-1">
                  <Label
                    htmlFor={`next-commitment-${index}`}
                    className="text-sm"
                  >
                    Commitment #{index + 1}
                  </Label>
                  <Input
                    id={`next-commitment-${index}`}
                    placeholder={`Next week commitment #${index + 1}...`}
                    value={commitment}
                    onChange={(e) => {
                      const newCommitments = [...formData.nextWeekCommitments];
                      newCommitments[index] = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        nextWeekCommitments: newCommitments,
                      }));
                    }}
                    className={
                      index === 0 &&
                      commitment.trim().length > 0 &&
                      commitment.trim().length < MIN_TEXT_LENGTH
                        ? "border-red-500"
                        : ""
                    }
                  />
                </div>
              ))}
            </div>

            {/* Q7: Team recognition */}
            <div className="space-y-2">
              <Label
                htmlFor="teamRecognition"
                className="text-base font-semibold"
              >
                7. Who from the team deserves recognition this week? (optional)
              </Label>
              <Textarea
                id="teamRecognition"
                placeholder="Recognize team members and their contributions..."
                value={formData.teamRecognition}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    teamRecognition: e.target.value,
                  }))
                }
                rows={2}
              />
            </div>

            {/* Q8: Alignment/motivation */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                8. On a scale of 1–10, how aligned and motivated do you feel?{" "}
                <span className="text-red-500">*</span>
              </Label>
              <div className="flex items-center gap-4">
                <Label htmlFor="alignmentScore" className="text-sm">
                  Score:
                </Label>
                <Select
                  value={formData.alignmentScore.toString()}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      alignmentScore: parseInt(value),
                    }))
                  }
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                      <SelectItem key={score} value={score.toString()}>
                        {score}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                placeholder="Why do you feel this way?"
                value={formData.alignmentReason}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    alignmentReason: e.target.value,
                  }))
                }
                rows={2}
                className={
                  formData.alignmentReason.trim().length > 0 &&
                  formData.alignmentReason.trim().length < MIN_TEXT_LENGTH
                    ? "border-red-500"
                    : ""
                }
              />
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              {hasFormContent && (
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
              <Button
                type="submit"
                disabled={isPending}
                className="bg-[#ff78c8] hover:bg-[#ff78c8]/90 text-white disabled:bg-muted disabled:text-muted-foreground disabled:hover:bg-muted"
              >
                {isSubmitting ? "Submitting..." : "Submit Report"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
