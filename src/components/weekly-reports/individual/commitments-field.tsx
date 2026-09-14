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
import type { CommitmentStatus, ReportCommitment } from "@/types/weekly-report";

interface CommitmentsFieldProps {
  value: ReportCommitment[];
  onChange: (next: ReportCommitment[]) => void;
}

/**
 * Q1 of the solo report — same rows, statuses and conditional explanation
 * as the team form, so the admin viewer renders both identically.
 */
export function CommitmentsField({ value, onChange }: CommitmentsFieldProps) {
  const update = (index: number, patch: Partial<ReportCommitment>) =>
    onChange(value.map((c, i) => (i === index ? { ...c, ...patch } : c)));

  return (
    <div className="space-y-3">
      <Label className="text-base font-semibold">
        1. What were your top commitments this week?{" "}
        <span className="text-red-500">*</span>
      </Label>
      <p className="text-muted-foreground text-sm">
        Provide status. Explanation is optional (shown only for incomplete
        items).
      </p>

      {value.map((commitment, index) => (
        <div key={index} className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <Label htmlFor={`solo-commitment-${index}`}>
              Commitment #{index + 1}
            </Label>
            {value.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                onClick={() => onChange(value.filter((_, i) => i !== index))}
                aria-label={`Remove commitment ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Textarea
            id={`solo-commitment-${index}`}
            placeholder={`Describe commitment #${index + 1}...`}
            value={commitment.text}
            onChange={(e) => update(index, { text: e.target.value })}
            rows={2}
          />
          <div className="flex items-center gap-2">
            <Label className="text-sm">Status:</Label>
            <Select
              value={commitment.status}
              onValueChange={(v) =>
                update(index, {
                  status: v as CommitmentStatus,
                  explanation: v === "completed" ? "" : commitment.explanation,
                })
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="completed">✅ Completed</SelectItem>
                <SelectItem value="in_progress">🔄 In Progress</SelectItem>
                <SelectItem value="not_done">❌ Not Done</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {commitment.status !== "completed" && (
            <Input
              placeholder="Brief explanation (optional)..."
              value={commitment.explanation}
              onChange={(e) => update(index, { explanation: e.target.value })}
            />
          )}
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          onChange([
            ...value,
            { text: "", status: "completed", explanation: "" },
          ])
        }
      >
        <Plus className="mr-1 h-4 w-4" />
        Add commitment
      </Button>
    </div>
  );
}
