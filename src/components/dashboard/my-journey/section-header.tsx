"use client";

import { ChevronDown } from "lucide-react";
import { CollapsibleTrigger } from "@/components/ui/collapsible";
import { economyLabels } from "@/lib/economy-labels";

const labels = economyLabels("my_journey");

/**
 * Slim trigger row shown when My Journey is collapsible (both journeys on
 * and the student also has an active team). Keeps the section glanceable
 * while collapsed: title, one-line summary, chevron that rotates on open.
 */
export function MyJourneySectionHeader({
  isOpen,
  xp,
  tasksCompleted,
  tasksTotal,
}: {
  isOpen: boolean;
  xp: number;
  tasksCompleted: number;
  tasksTotal: number;
}) {
  return (
    <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 py-1 text-left">
      <div className="flex items-baseline gap-3">
        <h2 className="text-lg font-semibold">My Journey</h2>
        <span className="text-muted-foreground text-sm">
          {xp.toLocaleString()} {labels.xp} · {tasksCompleted} of {tasksTotal}{" "}
          tasks
        </span>
      </div>
      <ChevronDown
        className={`text-muted-foreground h-5 w-5 shrink-0 transition-transform ${
          isOpen ? "rotate-180" : ""
        }`}
      />
    </CollapsibleTrigger>
  );
}
