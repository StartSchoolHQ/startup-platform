"use client";

import { cn } from "@/lib/utils";
import type { CommitmentStatus } from "@/types/weekly-report";

const STATUS_OPTIONS: {
  value: CommitmentStatus;
  label: string;
  dot: string;
}[] = [
  { value: "completed", label: "Done", dot: "bg-green-500" },
  { value: "in_progress", label: "In progress", dot: "bg-amber-500" },
  { value: "not_done", label: "Not done", dot: "bg-red-500" },
];

const SEGMENT_BASE =
  "focus-visible:ring-primary rounded-md text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50";

/** Three-way status for one commitment. One glance, no dropdown. */
export function StatusPicker({
  value,
  onChange,
  disabled,
  ariaLabel,
}: {
  value: CommitmentStatus;
  onChange: (value: CommitmentStatus) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="bg-muted/60 grid grid-cols-3 gap-1 rounded-lg p-1"
    >
      {STATUS_OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              SEGMENT_BASE,
              "flex items-center justify-center gap-1.5 px-2 py-1.5",
              selected
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", option.dot)} />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Same thresholds as the admin viewer's alignment bar. */
export function scoreTone(score: number): "low" | "mid" | "high" {
  if (score >= 8) return "high";
  if (score >= 5) return "mid";
  return "low";
}

const TONE_SELECTED = {
  low: "bg-red-500/15 text-red-700 ring-1 ring-red-500/40 dark:text-red-300",
  mid: "bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/40 dark:text-amber-300",
  high: "bg-green-500/15 text-green-700 ring-1 ring-green-500/40 dark:text-green-300",
};

/** 1–10 as ten segments; the chosen one takes the mood colour. */
export function ScorePicker({
  value,
  onChange,
  disabled,
  ariaLabel,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <div className="space-y-1.5">
      <div
        role="radiogroup"
        aria-label={ariaLabel}
        className="bg-muted/60 grid grid-cols-10 gap-1 rounded-lg p-1"
      >
        {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => {
          const selected = score === value;
          return (
            <button
              key={score}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${score} out of 10`}
              disabled={disabled}
              onClick={() => onChange(score)}
              className={cn(
                SEGMENT_BASE,
                "py-1.5 tabular-nums",
                selected
                  ? TONE_SELECTED[scoreTone(score)]
                  : "text-muted-foreground hover:bg-background hover:text-foreground"
              )}
            >
              {score}
            </button>
          );
        })}
      </div>
      <div className="text-muted-foreground flex justify-between px-1 text-[11px]">
        <span>Running on empty</span>
        <span>Fully aligned</span>
      </div>
    </div>
  );
}
