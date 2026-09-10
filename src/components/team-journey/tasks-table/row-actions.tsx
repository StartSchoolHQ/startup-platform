import { ArrowUpRight, CheckCircle2, Eye, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TaskTableItem } from "@/types/team-journey";

interface RowActionsProps {
  task: TaskTableItem;
  isTeamMember: boolean;
  currentUserId?: string;
  onStartTask?: (taskId: string) => void;
  onPreview: (task: TaskTableItem) => void;
  onOpen: (taskId: string) => void;
}

function PreviewButton({ onClick }: { onClick: () => void }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
            onClick={onClick}
            aria-label="Preview task"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Preview task</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function StartButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button size="sm" className="h-8" onClick={onClick}>
      <Play className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}

/** "Open" for a task with a progress row; a spinner while the row is pending. */
function OpenButton({
  task,
  onOpen,
}: {
  task: TaskTableItem;
  onOpen: (taskId: string) => void;
}) {
  if (task.id.toString().startsWith("temp-")) {
    return (
      <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      </Button>
    );
  }
  return (
    <Button
      variant="outline"
      size="sm"
      className="group h-8"
      onClick={() => onOpen(task.id)}
    >
      Open
      <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </Button>
  );
}

/**
 * Right-hand actions for one row. The branching mirrors the original table:
 * never-started recurring, recurring available again, finished / cooling
 * down, then the general case (start if free, open if it has an owner).
 */
export function TaskRowActions({
  task,
  isTeamMember,
  currentUserId,
  onStartTask,
  onPreview,
  onOpen,
}: RowActionsProps) {
  const isNeverStartedRecurring =
    task.isRecurring &&
    task.status === "Not Started" &&
    !task.responsible &&
    task.recurringStatus === "never_completed" &&
    !task.hasActiveInstance;

  const isRecurringAvailableAgain =
    task.isRecurring &&
    !!task.nextAvailableAt &&
    new Date(task.nextAvailableAt) <= new Date();

  if (isNeverStartedRecurring) {
    return (
      <>
        <PreviewButton onClick={() => onPreview(task)} />
        <StartButton label="Start" onClick={() => onStartTask?.(task.id)} />
      </>
    );
  }

  if (isRecurringAvailableAgain) {
    return (
      <>
        <PreviewButton onClick={() => onPreview(task)} />
        <StartButton
          label="Start again"
          onClick={() => onStartTask?.(task.id)}
        />
        <OpenButton task={task} onOpen={onOpen} />
      </>
    );
  }

  if (
    task.status === "Finished" ||
    (task.isRecurring && task.status === "Cooldown")
  ) {
    return (
      <>
        {task.status === "Finished" && (
          <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Done
          </span>
        )}
        <OpenButton task={task} onOpen={onOpen} />
      </>
    );
  }

  const canStart =
    isTeamMember &&
    task.isAvailable &&
    !task.responsible &&
    !!currentUserId &&
    !!onStartTask;

  if (canStart) {
    return (
      <>
        <PreviewButton onClick={() => onPreview(task)} />
        <StartButton label="Start" onClick={() => onStartTask!(task.id)} />
      </>
    );
  }

  if (task.responsible) {
    return <OpenButton task={task} onOpen={onOpen} />;
  }

  return null;
}
