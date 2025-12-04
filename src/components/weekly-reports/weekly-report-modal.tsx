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
    clientsContacted: 0,
    meetingsHeld: 0,
  });

  // Validation constant
  const MIN_TEXT_LENGTH = 20;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate minimum text length for required fields
    if (formData.whatDidYouDoThisWeek.trim().length < MIN_TEXT_LENGTH) {
      toast.error(
        `"What did you do this week?" must be at least ${MIN_TEXT_LENGTH} characters long.`
      );
      return;
    }

    if (formData.whatWereYourBlockers.trim().length < MIN_TEXT_LENGTH) {
      toast.error(
        `"What were your blockers?" must be at least ${MIN_TEXT_LENGTH} characters long.`
      );
      return;
    }

    if (
      formData.whatWasYourBiggestAchievement.trim().length < MIN_TEXT_LENGTH
    ) {
      toast.error(
        `"What was your biggest achievement?" must be at least ${MIN_TEXT_LENGTH} characters long.`
      );
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

      // Prepare submission data
      const submissionData = {
        whatDidYouDoThisWeek: formData.whatDidYouDoThisWeek,
        whatWereYourBlockers: formData.whatWereYourBlockers,
        whatWasYourBiggestAchievement: formData.whatWasYourBiggestAchievement,
        clientsContacted: formData.clientsContacted,
        meetingsHeld: formData.meetingsHeld,
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
        whatDidYouDoThisWeek: "",
        whatWereYourBlockers: "",
        whatWasYourBiggestAchievement: "",
        clientsContacted: 0,
        meetingsHeld: 0,
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
              What did you do this week? (min {MIN_TEXT_LENGTH} chars)
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
              className={
                formData.whatDidYouDoThisWeek.trim().length > 0 &&
                formData.whatDidYouDoThisWeek.trim().length < MIN_TEXT_LENGTH
                  ? "border-red-500"
                  : ""
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatWereYourBlockers">
              What were your blockers? (min {MIN_TEXT_LENGTH} chars)
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
              className={
                formData.whatWereYourBlockers.trim().length > 0 &&
                formData.whatWereYourBlockers.trim().length < MIN_TEXT_LENGTH
                  ? "border-red-500"
                  : ""
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatWasYourBiggestAchievement">
              What was your biggest achievement? (min {MIN_TEXT_LENGTH} chars)
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
              className={
                formData.whatWasYourBiggestAchievement.trim().length > 0 &&
                formData.whatWasYourBiggestAchievement.trim().length <
                  MIN_TEXT_LENGTH
                  ? "border-red-500"
                  : ""
              }
            />
          </div>

          {/* Metrics Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientsContacted">Clients Contacted</Label>
              <Input
                id="clientsContacted"
                type="number"
                min="0"
                placeholder="0"
                value={formData.clientsContacted}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    clientsContacted: parseInt(e.target.value) || 0,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meetingsHeld">Meetings Held</Label>
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
              disabled={
                isSubmitting ||
                formData.whatDidYouDoThisWeek.trim().length < MIN_TEXT_LENGTH ||
                formData.whatWereYourBlockers.trim().length < MIN_TEXT_LENGTH ||
                formData.whatWasYourBiggestAchievement.trim().length <
                  MIN_TEXT_LENGTH
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
