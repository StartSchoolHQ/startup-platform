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

interface WeeklyReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  userId: string;
  onSuccess?: () => void;
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
    whatDidYouDoThisWeek: "",
    whatWereYourBlockers: "",
    whatWasYourBiggestAchievement: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const supabase = createClient();

      // Get current week boundaries using our utility function
      const currentWeek = await getCurrentWeekBoundaries();

      if (!currentWeek) {
        throw new Error("Failed to get current week boundaries");
      }

      // Prepare submission data
      const submissionData = {
        whatDidYouDoThisWeek: formData.whatDidYouDoThisWeek,
        whatWereYourBlockers: formData.whatWereYourBlockers,
        whatWasYourBiggestAchievement: formData.whatWasYourBiggestAchievement,
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
        whatDidYouDoThisWeek: "",
        whatWereYourBlockers: "",
        whatWasYourBiggestAchievement: "",
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
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Submit Weekly Report</DialogTitle>
          <DialogDescription>
            Share your weekly progress with your team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="whatDidYouDoThisWeek">
              What did you do this week?
            </Label>
            <Textarea
              id="whatDidYouDoThisWeek"
              placeholder="Describe your main activities and accomplishments..."
              value={formData.whatDidYouDoThisWeek}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  whatDidYouDoThisWeek: e.target.value,
                }))
              }
              required
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatWereYourBlockers">
              What were your blockers?
            </Label>
            <Textarea
              id="whatWereYourBlockers"
              placeholder="Any challenges or obstacles you faced..."
              value={formData.whatWereYourBlockers}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  whatWereYourBlockers: e.target.value,
                }))
              }
              required
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatWasYourBiggestAchievement">
              What was your biggest achievement?
            </Label>
            <Textarea
              id="whatWasYourBiggestAchievement"
              placeholder="Your most significant accomplishment this week..."
              value={formData.whatWasYourBiggestAchievement}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  whatWasYourBiggestAchievement: e.target.value,
                }))
              }
              required
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
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
