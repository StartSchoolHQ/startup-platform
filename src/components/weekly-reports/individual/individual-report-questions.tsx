"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CommitmentsField } from "@/components/weekly-reports/individual/commitments-field";
import type { IndividualWeeklyReportForm } from "@/types/weekly-report";

const MIN_TEXT_LENGTH = 5;

interface Props {
  value: IndividualWeeklyReportForm;
  onChange: (next: IndividualWeeklyReportForm) => void;
}

/**
 * The four solo questions: team questions #1, #2, #6 and #8, renumbered.
 * Controlled — the modal owns the state and the submit.
 */
export function IndividualReportQuestions({ value, onChange }: Props) {
  const set = <K extends keyof IndividualWeeklyReportForm>(
    key: K,
    next: IndividualWeeklyReportForm[K]
  ) => onChange({ ...value, [key]: next });

  const shortReason =
    value.alignmentReason.trim().length > 0 &&
    value.alignmentReason.trim().length < MIN_TEXT_LENGTH;

  return (
    <div className="space-y-6">
      <CommitmentsField
        value={value.commitments}
        onChange={(next) => set("commitments", next)}
      />

      {/* Q2: Blockers (optional) */}
      <div className="space-y-3">
        <Label htmlFor="solo-blockers" className="text-base font-semibold">
          2. What blockers or challenges did you face? (optional)
        </Label>
        <Textarea
          id="solo-blockers"
          placeholder="What happened and why it happened..."
          value={value.blockers}
          onChange={(e) => set("blockers", e.target.value)}
          rows={3}
        />
      </div>

      {/* Q3: Next week */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">
          3. Commitments for next week <span className="text-red-500">*</span>
        </Label>
        <p className="text-muted-foreground text-sm">
          What are you committing to accomplish next week?
        </p>
        {value.nextWeekCommitments.map((commitment, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor={`solo-next-${index}`} className="text-sm">
                Commitment #{index + 1}
              </Label>
              <Input
                id={`solo-next-${index}`}
                placeholder={`Next week commitment #${index + 1}...`}
                value={commitment}
                onChange={(e) =>
                  set(
                    "nextWeekCommitments",
                    value.nextWeekCommitments.map((c, i) =>
                      i === index ? e.target.value : c
                    )
                  )
                }
                className={
                  commitment.trim().length > 0 &&
                  commitment.trim().length < MIN_TEXT_LENGTH
                    ? "border-red-500"
                    : ""
                }
              />
            </div>
            {value.nextWeekCommitments.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-5 h-7 w-7 p-0 text-red-500 hover:text-red-700"
                onClick={() =>
                  set(
                    "nextWeekCommitments",
                    value.nextWeekCommitments.filter((_, i) => i !== index)
                  )
                }
                aria-label={`Remove next week commitment ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            set("nextWeekCommitments", [...value.nextWeekCommitments, ""])
          }
        >
          <Plus className="mr-1 h-4 w-4" />
          Add commitment
        </Button>
      </div>

      {/* Q4: Alignment / motivation */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">
          4. On a scale of 1–10, how aligned and motivated do you feel?{" "}
          <span className="text-red-500">*</span>
        </Label>
        <div className="flex items-center gap-4">
          <Label className="text-sm">Score:</Label>
          <Select
            value={value.alignmentScore.toString()}
            onValueChange={(v) => set("alignmentScore", parseInt(v, 10))}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => (
                <SelectItem key={score} value={score.toString()}>
                  {score}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Textarea
          placeholder="Why do you feel this way?"
          value={value.alignmentReason}
          onChange={(e) => set("alignmentReason", e.target.value)}
          rows={2}
          className={shortReason ? "border-red-500" : ""}
        />
      </div>
    </div>
  );
}
