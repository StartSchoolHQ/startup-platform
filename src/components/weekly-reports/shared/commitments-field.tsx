"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusPicker } from "@/components/weekly-reports/shared/pickers";
import type { ReportCommitment } from "@/types/weekly-report";

interface CommitmentsFieldProps {
  value: ReportCommitment[];
  onChange: (next: ReportCommitment[]) => void;
  idPrefix: string;
  disabled?: boolean;
}

/**
 * This week's commitments, one quiet row each: what it was, how it went,
 * and (only when it didn't fully land) a line on why. Shared by the solo
 * and team forms so the admin viewer renders both the same way.
 */
export function CommitmentsField({
  value,
  onChange,
  idPrefix,
  disabled,
}: CommitmentsFieldProps) {
  const update = (index: number, patch: Partial<ReportCommitment>) =>
    onChange(value.map((c, i) => (i === index ? { ...c, ...patch } : c)));

  return (
    <div className="space-y-3">
      {value.map((commitment, index) => (
        <div key={index} className="bg-muted/40 space-y-3 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium">
              Commitment {index + 1}
            </span>
            {value.length > 1 && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(value.filter((_, i) => i !== index))}
                aria-label={`Remove commitment ${index + 1}`}
                className="hover:bg-background text-muted-foreground hover:text-foreground flex h-6 w-6 items-center justify-center rounded-md transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Textarea
            id={`${idPrefix}-commitment-${index}`}
            placeholder="What did you set out to do?"
            value={commitment.text}
            disabled={disabled}
            onChange={(e) => update(index, { text: e.target.value })}
            rows={2}
            className="bg-background resize-y"
          />
          <StatusPicker
            value={commitment.status}
            disabled={disabled}
            ariaLabel={`Status of commitment ${index + 1}`}
            onChange={(status) =>
              update(index, {
                status,
                explanation:
                  status === "completed" ? "" : commitment.explanation,
              })
            }
          />
          {commitment.status !== "completed" && (
            <Input
              placeholder="What got in the way? (optional)"
              value={commitment.explanation}
              disabled={disabled}
              onChange={(e) => update(index, { explanation: e.target.value })}
              className="bg-background"
            />
          )}
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        className="border-border w-full border-dashed"
        onClick={() =>
          onChange([
            ...value,
            { text: "", status: "completed", explanation: "" },
          ])
        }
      >
        <Plus className="h-4 w-4" />
        Add another commitment
      </Button>
    </div>
  );
}
