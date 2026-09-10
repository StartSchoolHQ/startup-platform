import { Lock, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TaskTableItem } from "@/types/team-journey";

/** Title, one-line description and the recurring / confidential markers. */
export function TaskTitleCell({ task }: { task: TaskTableItem }) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{task.title}</span>
        {task.isRecurring && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="text-muted-foreground gap-1 px-1.5 py-0 text-[11px] font-medium"
                >
                  <RotateCcw className="h-2.5 w-2.5" />
                  Recurring
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  This task can be completed again after a cooldown
                  {task.cooldownHours && ` (${task.cooldownHours}h)`}.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {task.is_confidential && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="gap-1 border-red-500/30 px-1.5 py-0 text-[11px] font-medium text-red-600 dark:text-red-400"
                >
                  <Lock className="h-2.5 w-2.5" />
                  Confidential
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>This task can only be reviewed by admin users.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {task.description && (
        <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
          {task.description}
        </p>
      )}
    </div>
  );
}
