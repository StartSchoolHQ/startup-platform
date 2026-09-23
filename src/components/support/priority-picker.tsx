"use client";

import { cn } from "@/lib/utils";

export type TicketPriority = "low" | "medium" | "high" | "critical";

const OPTIONS: {
  value: TicketPriority;
  label: string;
  dot: string;
  selected: string;
}[] = [
  {
    value: "low",
    label: "Low",
    dot: "bg-slate-400",
    selected:
      "bg-slate-500/15 text-slate-800 ring-1 ring-slate-500/50 dark:text-slate-200",
  },
  {
    value: "medium",
    label: "Medium",
    dot: "bg-amber-500",
    selected:
      "bg-amber-500/15 text-amber-800 ring-1 ring-amber-500/50 dark:text-amber-300",
  },
  {
    value: "high",
    label: "High",
    dot: "bg-orange-500",
    selected:
      "bg-orange-500/15 text-orange-800 ring-1 ring-orange-500/50 dark:text-orange-300",
  },
  {
    value: "critical",
    label: "Critical",
    dot: "bg-red-500",
    selected:
      "bg-red-500/15 text-red-800 ring-1 ring-red-500/50 dark:text-red-300",
  },
];

/** Segmented control for ticket priority — one glance, no dropdown. */
export function PriorityPicker({
  value,
  onChange,
  disabled,
}: {
  value: TicketPriority;
  onChange: (value: TicketPriority) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Priority"
      className="bg-muted/60 grid grid-cols-4 gap-1 rounded-lg p-1"
    >
      {OPTIONS.map((option) => {
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
              "focus-visible:ring-primary flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50",
              selected
                ? cn("font-semibold shadow-xs", option.selected)
                : "text-muted-foreground hover:bg-background hover:text-foreground"
            )}
          >
            <span
              className={cn(
                "rounded-full",
                selected ? "h-2 w-2" : "h-1.5 w-1.5",
                option.dot
              )}
            />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
