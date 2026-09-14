"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface NextWeekFieldProps {
  value: string[];
  onChange: (next: string[]) => void;
  idPrefix: string;
  disabled?: boolean;
}

/** Next week's commitments as a short numbered list. */
export function NextWeekField({
  value,
  onChange,
  idPrefix,
  disabled,
}: NextWeekFieldProps) {
  return (
    <div className="space-y-2">
      {value.map((commitment, index) => (
        <div key={index} className="flex items-center gap-2">
          <span
            aria-hidden
            className="bg-primary/10 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums"
          >
            {index + 1}
          </span>
          <Input
            id={`${idPrefix}-next-${index}`}
            aria-label={`Next week commitment ${index + 1}`}
            placeholder="One concrete thing you'll get done"
            value={commitment}
            disabled={disabled}
            onChange={(e) =>
              onChange(value.map((c, i) => (i === index ? e.target.value : c)))
            }
          />
          {value.length > 1 && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(value.filter((_, i) => i !== index))}
              aria-label={`Remove next week commitment ${index + 1}`}
              className="hover:bg-muted text-muted-foreground hover:text-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        className="border-border w-full border-dashed"
        onClick={() => onChange([...value, ""])}
      >
        <Plus className="h-4 w-4" />
        Add another
      </Button>
    </div>
  );
}
