"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TaskTableItem } from "@/types/team-journey";

const DEFAULT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

function remainingText(diffMs: number) {
  const minutes = Math.floor(diffMs / 60_000);
  const days = Math.floor(minutes / (24 * 60));
  const hours = Math.floor((minutes % (24 * 60)) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

/**
 * Status cell for a recurring task that is cooling down: time left plus a
 * thin progress line, or a prompt to refresh once the window has opened.
 */
export function TaskCooldownStatus({ task }: { task: TaskTableItem }) {
  // Read the clock once per mount; the row re-renders on data refresh anyway.
  const [now] = useState(() => Date.now());
  if (!task.nextAvailableAt) return null;

  const nextAvailable = new Date(task.nextAvailableAt);
  const diffMs = nextAvailable.getTime() - now;

  if (diffMs <= 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-green-600 dark:text-green-400">
          Available again
        </span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs"
          onClick={() => window.location.reload()}
        >
          Refresh
        </Button>
      </div>
    );
  }

  const totalMs = task.cooldownHours
    ? task.cooldownHours * 60 * 60 * 1000
    : DEFAULT_COOLDOWN_MS;
  const percent = Math.max(
    0,
    Math.min(100, ((totalMs - diffMs) / totalMs) * 100)
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-32 space-y-1.5">
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Clock className="h-3.5 w-3.5" />
              <span className="font-medium">{remainingText(diffMs)} left</span>
            </div>
            <div className="bg-muted h-1 w-full overflow-hidden rounded-full">
              <div
                className="bg-primary/60 h-full rounded-full transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">Available again</p>
          <p>{nextAvailable.toLocaleString()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
