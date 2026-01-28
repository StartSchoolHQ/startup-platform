"use client";

import { useState } from "react";
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
import { getCurrentWeekBoundaries } from "@/lib/weekly-reports";
import { WeeklyReportSchema } from "@/lib/validation-schemas";

interface WeeklyReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  userId: string;
  onSuccess?: () => void;
}

interface Commitment {
  text: string;
  status: "completed" | "in_progress" | "not_done";
  explanation: string;
}

export function WeeklyReportModal({
  open,
  onOpenChange,
  teamId,
  userId,
  onSuccess,
}: WeeklyReportModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    // Q1: Top 3 commitments
    commitments: [
      {
        text: "",
        status: "completed" as "completed" | "in_progress" | "not_done",
        explanation: "",
      },
      {
        text: "",
        status: "completed" as "completed" | "in_progress" | "not_done",
        explanation: "",
      },
      {
        text: "",
        status: "completed" as "completed" | "in_progress" | "not_done",
        explanation: "",
      },
    ],
    // Q2: Blockers/challenges
    blockers: "",
    blockersAnalysis: "",
    helpNeeded: "",
    // Q4: User/customer interactions
    meetingsHeld: 0,
    keyInsight: "",
    mostImportantOutcome: "",
    // Q5: Measurable progress
    measurableProgress: "",
    // Q6: Most important achievement
    biggestAchievement: "",
    achievementImpact: "",
    // Q7: Next week priority
    nextWeekPriority: "",
    // Q8: Team recognition
    teamRecognition: "",
    // Q9: Alignment/motivation
    alignmentScore: 5,
    alignmentReason: "",
  });

  const MIN_TEXT_LENGTH = 20; // Keep for UI validation hints

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate with Zod
    const result = WeeklyReportSchema.safeParse(formData);

    if (!result.success) {
      const firstError = result.error.issues[0];
      toast.error(firstError.message);
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();

      // Get current week boundaries using our utility function
      const currentWeek = await getCurrentWeekBoundaries();

      if (!currentWeek) {
        throw new Error("Failed to get current week boundaries");
      }

      // Prepare submission data matching new template
      const submissionData = {
        commitments: formData.commitments.filter(
          (c) => c.text.trim().length > 0
        ),
        blockers: formData.blockers,
        blockersAnalysis: formData.blockersAnalysis,
        helpNeeded: formData.helpNeeded,
        meetingsHeld: formData.meetingsHeld,
        keyInsight: formData.keyInsight,
        mostImportantOutcome: formData.mostImportantOutcome,
        measurableProgress: formData.measurableProgress,
        biggestAchievement: formData.biggestAchievement,
        achievementImpact: formData.achievementImpact,
        nextWeekPriority: formData.nextWeekPriority,
        teamRecognition: formData.teamRecognition,
        alignmentScore: formData.alignmentScore,
        alignmentReason: formData.alignmentReason,
        submittedAt: new Date().toISOString(),
      };

      // Insert the weekly report
      // Using any to bypass TypeScript limitations until types are updated
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await (supabase as any)
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
          submitted_at: new Date().toISOString(),
        });

      if (insertError) {
        throw new Error(`Failed to submit report: ${insertError.message}`);
      }

      // Success feedback
      toast.success("Weekly report submitted successfully!");

      // Call success callback to refresh status
      if (onSuccess) {
        onSuccess();
      }

      // Close modal on success
      onOpenChange(false);

      // Reset form
      setFormData({
        commitments: [
          { text: "", status: "completed" as const, explanation: "" },
          { text: "", status: "completed" as const, explanation: "" },
          { text: "", status: "completed" as const, explanation: "" },
        ],
        blockers: "",
        blockersAnalysis: "",
        helpNeeded: "",
        meetingsHeld: 0,
        keyInsight: "",
        mostImportantOutcome: "",
        measurableProgress: "",
        biggestAchievement: "",
        achievementImpact: "",
        nextWeekPriority: "",
        teamRecognition: "",
        alignmentScore: 5,
        alignmentReason: "",
      });
    } catch (error) {
      console.error("Error submitting weekly report:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to submit weekly report. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit Weekly Report</DialogTitle>
          <DialogDescription>
            Share your weekly progress with your team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Q1: Top 3 commitments from last week */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              1. What were your top 3 commitments from last week?
            </Label>
            <p className="text-sm text-muted-foreground">
              Provide status (Completed / In progress / Not done) with brief
              explanation
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
                <Input
                  placeholder="Brief explanation..."
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
              </div>
            ))}
          </div>

          {/* Q2: Blockers/challenges */}
          <div className="space-y-3">
            <Label htmlFor="blockers" className="text-base font-semibold">
              2. What blockers or challenges did you face?
            </Label>
            <Textarea
              id="blockers"
              placeholder="Describe the challenges or obstacles..."
              value={formData.blockers}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, blockers: e.target.value }))
              }
              rows={2}
              className={
                formData.blockers.trim().length > 0 &&
                formData.blockers.trim().length < MIN_TEXT_LENGTH
                  ? "border-red-500"
                  : ""
              }
            />
            <Textarea
              placeholder="Why? Analyze what held you back..."
              value={formData.blockersAnalysis}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  blockersAnalysis: e.target.value,
                }))
              }
              rows={2}
            />
            <Textarea
              placeholder="What help do you need to resolve it?"
              value={formData.helpNeeded}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  helpNeeded: e.target.value,
                }))
              }
              rows={2}
            />
          </div>

          {/* Q4: User/customer interactions */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              4. What user or customer interactions did you have this week?
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

          {/* Q5: Measurable progress */}
          <div className="space-y-2">
            <Label
              htmlFor="measurableProgress"
              className="text-base font-semibold"
            >
              5. What measurable progress did you make toward traction or
              product improvements?
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

          {/* Q6: Most important achievement */}
          <div className="space-y-2">
            <Label
              htmlFor="biggestAchievement"
              className="text-base font-semibold"
            >
              6. What was your most important achievement this week?
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

          {/* Q7: Next week priority */}
          <div className="space-y-2">
            <Label
              htmlFor="nextWeekPriority"
              className="text-base font-semibold"
            >
              7. What is the single highest-impact priority for next week?
            </Label>
            <p className="text-sm text-muted-foreground">
              One key commitment that moves you forward
            </p>
            <Textarea
              id="nextWeekPriority"
              placeholder="Describe your top priority for next week..."
              value={formData.nextWeekPriority}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  nextWeekPriority: e.target.value,
                }))
              }
              rows={2}
              className={
                formData.nextWeekPriority.trim().length > 0 &&
                formData.nextWeekPriority.trim().length < MIN_TEXT_LENGTH
                  ? "border-red-500"
                  : ""
              }
            />
          </div>

          {/* Q8: Team recognition */}
          <div className="space-y-2">
            <Label
              htmlFor="teamRecognition"
              className="text-base font-semibold"
            >
              8. Who from the team deserves recognition this week?
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

          {/* Q9: Alignment/motivation */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              9. On a scale of 1–10, how aligned and motivated do you feel?
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#ff78c8] hover:bg-[#ff78c8]/90 text-white disabled:bg-muted disabled:text-muted-foreground disabled:hover:bg-muted"
            >
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
