"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DifficultyBadge } from "@/components/ui/difficulty-badge";
import {
  CreditCard,
  FileText,
  Link2,
  Lock,
  Play,
  RotateCcw,
  Target,
  Zap,
} from "lucide-react";
import { TaskTableItem } from "@/types/team-journey";
import { economyLabels, type Economy } from "@/lib/economy-labels";
import { parseResources, parseStringList } from "@/lib/task-content";
import { TaskMarkdown } from "@/components/tasks/task-markdown";
import {
  TaskObjectivesList,
  TaskResourceList,
  TaskSectionTitle,
} from "@/components/tasks/task-content-lists";

interface TaskPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskTableItem | null;
  /** Which economy the rewards belong to — drives the reward chip labels. */
  economy: Economy;
  onStartTask?: (taskId: string) => void;
  canStart?: boolean;
}

const DIFFICULTY_LEVEL = { Easy: 1, Medium: 2, Hard: 3 } as const;

function RewardChip({
  icon: Icon,
  value,
  unit,
}: {
  icon: typeof Zap;
  value: number | null;
  unit: string;
}) {
  return (
    <span className="bg-muted/60 text-muted-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs">
      <Icon className="text-primary h-3.5 w-3.5" />
      <span className="text-foreground font-semibold tabular-nums">
        {value ?? 0}
      </span>
      {unit}
    </span>
  );
}

export function TaskPreviewModal({
  isOpen,
  onClose,
  task,
  economy,
  onStartTask,
  canStart = true,
}: TaskPreviewModalProps) {
  if (!task) return null;

  const labels = economyLabels(economy);
  const objectives = parseStringList(task.learning_objectives);
  const resources = parseResources(task.resources);
  const hasContent =
    !!task.detailed_instructions ||
    !!task.description ||
    objectives.length > 0 ||
    resources.length > 0;

  const handleStartTask = () => {
    if (onStartTask && task.id) {
      onStartTask(task.id);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[680px]">
        <DialogHeader className="relative space-y-3 overflow-hidden px-6 pt-6 pb-5 text-left">
          <div
            aria-hidden
            className="bg-primary/15 pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full blur-3xl"
          />
          <div className="relative flex flex-wrap items-center gap-2">
            <DifficultyBadge level={DIFFICULTY_LEVEL[task.difficulty] ?? 1} />
            {task.isRecurring && (
              <Badge
                variant="outline"
                className="text-muted-foreground gap-1 px-1.5 py-0 text-[11px]"
              >
                <RotateCcw className="h-2.5 w-2.5" />
                Recurring
              </Badge>
            )}
            {task.is_confidential && (
              <Badge
                variant="outline"
                className="gap-1 border-red-500/30 px-1.5 py-0 text-[11px] text-red-600 dark:text-red-400"
              >
                <Lock className="h-2.5 w-2.5" />
                Confidential
              </Badge>
            )}
          </div>
          <DialogTitle className="relative pr-6 text-xl leading-snug font-semibold tracking-tight">
            {task.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Preview details for task: {task.title}
          </DialogDescription>
          <div className="relative flex items-center gap-2">
            <RewardChip icon={Zap} value={task.xp} unit={labels.xp} />
            <RewardChip
              icon={CreditCard}
              value={task.points}
              unit={labels.points}
            />
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto border-t px-6 py-5">
          <div className="space-y-6">
            {task.detailed_instructions ? (
              <section>
                <TaskSectionTitle icon={FileText}>
                  Instructions
                </TaskSectionTitle>
                <TaskMarkdown>{task.detailed_instructions}</TaskMarkdown>
              </section>
            ) : task.description ? (
              <section>
                <TaskSectionTitle icon={FileText}>Description</TaskSectionTitle>
                <p className="text-sm leading-relaxed">{task.description}</p>
              </section>
            ) : null}

            {objectives.length > 0 && (
              <section>
                <TaskSectionTitle icon={Target}>
                  What you will learn
                </TaskSectionTitle>
                <TaskObjectivesList items={objectives} />
              </section>
            )}

            {resources.length > 0 && (
              <section>
                <TaskSectionTitle icon={Link2}>Resources</TaskSectionTitle>
                <TaskResourceList items={resources} />
              </section>
            )}

            {task.isRecurring && task.cooldownHours && (
              <p className="text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 text-xs">
                Recurring task. After you finish it there is a{" "}
                {task.cooldownHours}-hour cooldown before you can do it again.
              </p>
            )}

            {task.is_confidential && (
              <p className="rounded-lg bg-red-500/5 px-3 py-2 text-xs text-red-700 dark:text-red-400">
                Confidential task. Only admins can review what you submit.
              </p>
            )}

            {!hasContent && (
              <div className="text-muted-foreground py-8 text-center text-sm">
                No details have been added for this task yet.
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 border-t px-6 py-4 sm:gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {canStart && onStartTask && (
            <Button onClick={handleStartTask}>
              <Play className="h-4 w-4" />
              Start task
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
