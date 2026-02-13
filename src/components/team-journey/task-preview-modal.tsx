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
import { Separator } from "@/components/ui/separator";

import ReactMarkdown from "react-markdown";
import {
  Medal,
  Zap,
  CreditCard,
  Play,
  BookOpen,
  Lock,
  RotateCcw,
  CheckCircle,
  Target,
  FileText,
  ExternalLink,
} from "lucide-react";
import { TaskTableItem } from "@/types/team-journey";

interface TaskPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskTableItem | null;
  onStartTask?: (taskId: string) => void;
  canStart?: boolean;
}

export function TaskPreviewModal({
  isOpen,
  onClose,
  task,
  onStartTask,
  canStart = true,
}: TaskPreviewModalProps) {
  if (!task) return null;

  const handleStartTask = () => {
    if (onStartTask && task.id) {
      onStartTask(task.id);
      onClose();
    }
  };

  // Parse learning_objectives - could be array or comma-separated string from RPC
  const learningObjectives: string[] = (() => {
    const val = task.learning_objectives as
      | string[]
      | string
      | null
      | undefined;
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === "string") {
      return val.split(", ").filter((s: string) => s.trim());
    }
    return [];
  })();

  // Parse deliverables - could be array or comma-separated string from RPC
  const deliverables: string[] = (() => {
    const val = task.deliverables as string[] | string | null | undefined;
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === "string") {
      return val.split(", ").filter((s: string) => s.trim());
    }
    return [];
  })();

  // Parse resources - could be array or JSON string from RPC
  const resources: Array<{
    title: string;
    type: string;
    url: string;
    description?: string;
  }> = (() => {
    const val = task.resources as
      | Array<{
          title: string;
          type: string;
          url: string;
          description?: string;
        }>
      | string
      | null
      | undefined;
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === "string") {
      try {
        return JSON.parse(val);
      } catch {
        return [];
      }
    }
    return [];
  })();

  const hasDetailedContent =
    task.detailed_instructions ||
    learningObjectives.length > 0 ||
    deliverables.length > 0 ||
    resources.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden p-0 sm:max-w-[700px]">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-3">
            <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
              <Medal className="text-primary h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="pr-6 text-xl leading-tight">
                {task.title}
              </DialogTitle>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {task.isRecurring && (
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1 bg-blue-100 px-1.5 py-0.5 text-xs text-blue-800"
                  >
                    <RotateCcw className="h-2.5 w-2.5" />
                    Recurring
                  </Badge>
                )}
                {task.is_confidential && (
                  <Badge
                    variant="destructive"
                    className="flex items-center gap-1 px-1.5 py-0.5 text-xs"
                  >
                    <Lock className="h-2.5 w-2.5" />
                    Confidential
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <DialogDescription className="sr-only">
            Preview details for task: {task.title}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6">
          <div className="space-y-5 pb-4">
            {/* Reward Stats */}
            <div className="bg-muted/50 flex flex-wrap items-center gap-4 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">
                  Difficulty:
                </span>
                <DifficultyBadge
                  level={
                    task.difficulty === "Easy"
                      ? 1
                      : task.difficulty === "Medium"
                        ? 2
                        : 3
                  }
                />
              </div>
              <Separator
                orientation="vertical"
                className="hidden h-6 sm:block"
              />
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-black dark:text-white" />
                <span className="text-sm font-medium">{task.xp} XP</span>
              </div>
              <Separator
                orientation="vertical"
                className="hidden h-6 sm:block"
              />
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-black dark:text-white" />
                <span className="text-sm font-medium">
                  {task.points} Points
                </span>
              </div>
            </div>

            {/* Detailed Instructions (with Markdown support) */}
            {task.detailed_instructions ? (
              <div>
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <FileText className="text-muted-foreground h-4 w-4" />
                  Task Instructions
                </h4>
                <div className="prose prose-sm text-muted-foreground [&_code]:bg-muted max-w-none [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_h1]:mb-2 [&_h1]:text-lg [&_h1]:font-bold [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_li]:text-sm [&_ol]:ml-4 [&_ol]:list-decimal [&_ol]:space-y-1 [&_p]:mb-2 [&_p]:text-sm [&_p]:leading-relaxed [&_strong]:font-semibold [&_ul]:ml-4 [&_ul]:list-disc [&_ul]:space-y-1">
                  <ReactMarkdown>{task.detailed_instructions}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <div>
                <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <BookOpen className="text-muted-foreground h-4 w-4" />
                  Description
                </h4>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {task.description || "No description available."}
                </p>
              </div>
            )}

            {/* Learning Objectives */}
            {learningObjectives.length > 0 && (
              <div>
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Target className="text-muted-foreground h-4 w-4" />
                  Learning Objectives
                </h4>
                <ul className="space-y-2">
                  {learningObjectives.map(
                    (objective: string, index: number) => (
                      <li
                        key={index}
                        className="text-muted-foreground flex items-start gap-2 text-sm"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                        <span>{objective}</span>
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}

            {/* Expected Deliverables */}
            {deliverables.length > 0 && (
              <div>
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle className="text-muted-foreground h-4 w-4" />
                  Expected Deliverables
                </h4>
                <ul className="space-y-2">
                  {deliverables.map((deliverable: string, index: number) => (
                    <li
                      key={index}
                      className="text-muted-foreground flex items-start gap-2 text-sm"
                    >
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                      <span>{deliverable}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Resources */}
            {resources.length > 0 && (
              <div>
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <ExternalLink className="text-muted-foreground h-4 w-4" />
                  Helpful Resources
                </h4>
                <div className="space-y-2">
                  {resources.map((resource, index: number) => (
                    <a
                      key={index}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:bg-muted/50 group flex items-start gap-3 rounded-lg border p-3 transition-colors hover:border-blue-300"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 group-hover:bg-blue-200">
                        <FileText className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-blue-700 group-hover:text-blue-800">
                          {resource.title}
                        </div>
                        {resource.description && (
                          <div className="text-muted-foreground mt-0.5 text-xs">
                            {resource.description}
                          </div>
                        )}
                        <div className="mt-1 text-xs text-blue-600 capitalize">
                          {resource.type} • Click to open
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Recurring Task Info */}
            {task.isRecurring && task.cooldownHours && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Recurring Task:</span> This task
                  can be completed multiple times. After completing,
                  there&apos;s a {task.cooldownHours}-hour cooldown before it
                  becomes available again.
                </p>
              </div>
            )}

            {/* Confidential Task Warning */}
            {task.is_confidential && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-800">
                  <span className="font-medium">Confidential Task:</span> This
                  task can only be reviewed by admin users due to sensitive
                  content.
                </p>
              </div>
            )}

            {/* No detailed content message */}
            {!hasDetailedContent && !task.description && (
              <div className="text-muted-foreground py-6 text-center">
                <FileText className="mx-auto mb-2 h-10 w-10 opacity-50" />
                <p className="text-sm">
                  No detailed information available for this task.
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 border-t px-6 py-4 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {canStart && onStartTask && (
            <Button
              onClick={handleStartTask}
              className="bg-[#ff78c8] text-white hover:bg-[#ff78c8]/90"
            >
              <Play className="mr-2 h-4 w-4" />
              Start Task
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
