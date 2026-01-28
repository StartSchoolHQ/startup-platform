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
import { ScrollArea } from "@/components/ui/scroll-area";
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
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted shrink-0">
              <Medal className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl leading-tight pr-6">
                {task.title}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {task.isRecurring && (
                  <Badge
                    variant="secondary"
                    className="text-xs flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-800"
                  >
                    <RotateCcw className="h-2.5 w-2.5" />
                    Recurring
                  </Badge>
                )}
                {task.is_confidential && (
                  <Badge
                    variant="destructive"
                    className="text-xs flex items-center gap-1 px-1.5 py-0.5"
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

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-5 pb-4">
            {/* Reward Stats */}
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
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
                className="h-6 hidden sm:block"
              />
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-black dark:text-white" />
                <span className="text-sm font-medium">{task.xp} XP</span>
              </div>
              <Separator
                orientation="vertical"
                className="h-6 hidden sm:block"
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
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Task Instructions
                </h4>
                <div className="prose prose-sm max-w-none text-muted-foreground [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-4 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:ml-4 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:ml-4 [&_ol]:space-y-1 [&_li]:text-sm [&_p]:text-sm [&_p]:leading-relaxed [&_p]:mb-2 [&_strong]:font-semibold [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs">
                  <ReactMarkdown>{task.detailed_instructions}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  Description
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {task.description || "No description available."}
                </p>
              </div>
            )}

            {/* Learning Objectives */}
            {learningObjectives.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  Learning Objectives
                </h4>
                <ul className="space-y-2">
                  {learningObjectives.map(
                    (objective: string, index: number) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                        <span>{objective}</span>
                      </li>
                    ),
                  )}
                </ul>
              </div>
            )}

            {/* Expected Deliverables */}
            {deliverables.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  Expected Deliverables
                </h4>
                <ul className="space-y-2">
                  {deliverables.map((deliverable: string, index: number) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{deliverable}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Resources */}
            {resources.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  Helpful Resources
                </h4>
                <div className="space-y-2">
                  {resources.map((resource, index: number) => (
                    <a
                      key={index}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 hover:border-blue-300 transition-colors group"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 group-hover:bg-blue-200 shrink-0">
                        <FileText className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-blue-700 group-hover:text-blue-800">
                          {resource.title}
                        </div>
                        {resource.description && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {resource.description}
                          </div>
                        )}
                        <div className="text-xs text-blue-600 capitalize mt-1">
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
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
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
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  <span className="font-medium">Confidential Task:</span> This
                  task can only be reviewed by admin users due to sensitive
                  content.
                </p>
              </div>
            )}

            {/* No detailed content message */}
            {!hasDetailedContent && !task.description && (
              <div className="text-center py-6 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  No detailed information available for this task.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {canStart && onStartTask && (
            <Button
              onClick={handleStartTask}
              className="bg-[#ff78c8] text-white hover:bg-[#ff78c8]/90"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Task
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
