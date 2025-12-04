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
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { getCurrentWeekBoundaries } from "@/lib/weekly-reports";

interface IndividualWeeklyReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSuccess?: () => void;
}

export function IndividualWeeklyReportModal({
  open,
  onOpenChange,
  userId,
  onSuccess,
}: IndividualWeeklyReportModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    tasksCompleted: "",
    skillsLearned: "",
    challengesFaced: "",
    goalsNextWeek: "",
    additionalNotes: "",
  });

  // Validation constant
  const MIN_TEXT_LENGTH = 20;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate minimum text length for required fields
    if (formData.tasksCompleted.trim().length < MIN_TEXT_LENGTH) {
      toast.error(
        `"Tasks/Projects Completed" must be at least ${MIN_TEXT_LENGTH} characters long.`
      );
      return;
    }

    if (formData.skillsLearned.trim().length < MIN_TEXT_LENGTH) {
      toast.error(
        `"New Skills/Knowledge Acquired" must be at least ${MIN_TEXT_LENGTH} characters long.`
      );
      return;
    }

    if (formData.challengesFaced.trim().length < MIN_TEXT_LENGTH) {
      toast.error(
        `"Challenges & How You Overcame Them" must be at least ${MIN_TEXT_LENGTH} characters long.`
      );
      return;
    }

    if (formData.goalsNextWeek.trim().length < MIN_TEXT_LENGTH) {
      toast.error(
        `"Goals for Next Week" must be at least ${MIN_TEXT_LENGTH} characters long.`
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const currentWeek = await getCurrentWeekBoundaries();

      if (!currentWeek) {
        throw new Error("Unable to get current week boundaries");
      }

      // Prepare submission data
      const submissionData = {
        ...formData,
        submittedAt: new Date().toISOString(),
      };

      // Insert the individual weekly report
      // Using type assertion to bypass TypeScript limitations until types are updated
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await (supabase as any)
        .from("weekly_reports")
        .insert({
          user_id: userId,
          team_id: null,
          context: "individual",
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
      toast.success("Individual weekly report submitted successfully!");

      // Call success callback to refresh status
      if (onSuccess) {
        onSuccess();
      }

      // Reset form and close modal
      setFormData({
        tasksCompleted: "",
        skillsLearned: "",
        challengesFaced: "",
        goalsNextWeek: "",
        additionalNotes: "",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting individual weekly report:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to submit report"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit Individual Weekly Report</DialogTitle>
          <DialogDescription>
            Share your personal learning progress, challenges, and goals for
            this week.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="tasksCompleted">
              Tasks/Projects Completed This Week (min {MIN_TEXT_LENGTH} chars)
            </Label>
            <Textarea
              id="tasksCompleted"
              placeholder="Describe what you accomplished this week..."
              value={formData.tasksCompleted}
              onChange={(e) =>
                handleInputChange("tasksCompleted", e.target.value)
              }
              className={`min-h-[80px] ${
                formData.tasksCompleted.trim().length > 0 &&
                formData.tasksCompleted.trim().length < MIN_TEXT_LENGTH
                  ? "border-red-500"
                  : ""
              }`}
              required
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="skillsLearned">
              New Skills/Knowledge Acquired (min {MIN_TEXT_LENGTH} chars)
            </Label>
            <Textarea
              id="skillsLearned"
              placeholder="What new skills or knowledge did you gain?"
              value={formData.skillsLearned}
              onChange={(e) =>
                handleInputChange("skillsLearned", e.target.value)
              }
              className={`min-h-[80px] ${
                formData.skillsLearned.trim().length > 0 &&
                formData.skillsLearned.trim().length < MIN_TEXT_LENGTH
                  ? "border-red-500"
                  : ""
              }`}
              required
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="challengesFaced">
              Challenges & How You Overcame Them (min {MIN_TEXT_LENGTH} chars)
            </Label>
            <Textarea
              id="challengesFaced"
              placeholder="What challenges did you face and how did you solve them?"
              value={formData.challengesFaced}
              onChange={(e) =>
                handleInputChange("challengesFaced", e.target.value)
              }
              className={`min-h-[80px] ${
                formData.challengesFaced.trim().length > 0 &&
                formData.challengesFaced.trim().length < MIN_TEXT_LENGTH
                  ? "border-red-500"
                  : ""
              }`}
              required
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="goalsNextWeek">
              Goals for Next Week (min {MIN_TEXT_LENGTH} chars)
            </Label>
            <Textarea
              id="goalsNextWeek"
              placeholder="What do you plan to focus on next week?"
              value={formData.goalsNextWeek}
              onChange={(e) =>
                handleInputChange("goalsNextWeek", e.target.value)
              }
              className={`min-h-[80px] ${
                formData.goalsNextWeek.trim().length > 0 &&
                formData.goalsNextWeek.trim().length < MIN_TEXT_LENGTH
                  ? "border-red-500"
                  : ""
              }`}
              required
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="additionalNotes">
              Additional Notes/Reflections
            </Label>
            <Textarea
              id="additionalNotes"
              placeholder="Any additional thoughts, feedback, or reflections..."
              value={formData.additionalNotes}
              onChange={(e) =>
                handleInputChange("additionalNotes", e.target.value)
              }
              className="min-h-[60px]"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                formData.tasksCompleted.trim().length < MIN_TEXT_LENGTH ||
                formData.skillsLearned.trim().length < MIN_TEXT_LENGTH ||
                formData.challengesFaced.trim().length < MIN_TEXT_LENGTH ||
                formData.goalsNextWeek.trim().length < MIN_TEXT_LENGTH
              }
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
