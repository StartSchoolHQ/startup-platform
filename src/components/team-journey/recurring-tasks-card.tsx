import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  RefreshCw,
  Clock,
  CheckCircle2,
  Play,
  Calendar,
  Timer,
  RotateCcw,
  AlertCircle,
} from "lucide-react";
import {
  useRecurringTasks,
  RecurringTaskStatus,
} from "@/hooks/use-recurring-tasks";
import { formatDistanceToNow, parseISO } from "date-fns";

interface RecurringTasksCardProps {
  teamId: string;
  currentUserId?: string;
  onTaskStarted?: () => void;
}

function RecurringTaskItem({
  task,
  onStart,
  currentUserId,
  isStarting = false,
}: {
  task: RecurringTaskStatus;
  onStart?: (taskId: string) => void;
  currentUserId?: string;
  isStarting?: boolean;
}) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "available":
        return {
          icon: Play,
          color: "text-green-600",
          bgColor: "bg-green-100",
          label: "Ready to Start",
          variant: "default" as const,
        };
      case "cooldown":
        return {
          icon: Timer,
          color: "text-orange-600",
          bgColor: "bg-orange-100",
          label: "Cooldown Period",
          variant: "secondary" as const,
        };
      case "never_completed":
        return {
          icon: Calendar,
          color: "text-blue-600",
          bgColor: "bg-blue-100",
          label: "Never Completed",
          variant: "outline" as const,
        };
      default:
        return {
          icon: Clock,
          color: "text-gray-600",
          bgColor: "bg-gray-100",
          label: "Unknown",
          variant: "outline" as const,
        };
    }
  };

  const statusConfig = getStatusConfig(task.recurring_status);
  const StatusIcon = statusConfig.icon;

  const formatNextAvailable = () => {
    if (!task.next_available) return null;

    try {
      const nextDate = parseISO(task.next_available);
      const isAvailable = nextDate <= new Date();

      if (isAvailable) {
        return "Available now";
      }

      return `Available ${formatDistanceToNow(nextDate, { addSuffix: true })}`;
    } catch (error) {
      return "Invalid date";
    }
  };

  const formatLastCompletion = () => {
    if (!task.last_completion) return "Never completed";

    try {
      const lastDate = parseISO(task.last_completion);
      return `Last completed ${formatDistanceToNow(lastDate, {
        addSuffix: true,
      })}`;
    } catch (error) {
      return "Invalid date";
    }
  };

  const handleStart = () => {
    if (onStart && currentUserId) {
      onStart(task.task_id);
    }
  };

  const canStart =
    task.recurring_status === "available" && !task.has_active_instance;

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-center space-x-4 flex-1">
        {/* Task Icon */}
        <div className={`p-2 rounded-lg ${statusConfig.bgColor}`}>
          <RotateCcw className={`h-5 w-5 ${statusConfig.color}`} />
        </div>

        {/* Task Details */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">{task.title}</h4>
          <p className="text-sm text-gray-500 truncate">
            {task.template_code} • Repeats every {task.cooldown_days} days
          </p>

          <div className="flex items-center space-x-2 mt-2">
            <Badge
              variant={statusConfig.variant}
              className="text-xs flex items-center gap-1"
            >
              <StatusIcon className="h-3 w-3" />
              {statusConfig.label}
            </Badge>

            <div className="text-xs text-gray-500">
              {formatLastCompletion()}
            </div>
          </div>

          {task.next_available && (
            <div className="text-xs text-gray-500 mt-1">
              {formatNextAvailable()}
            </div>
          )}
        </div>
      </div>

      {/* Action Button */}
      <div className="ml-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={canStart ? "default" : "secondary"}
                size="sm"
                disabled={!canStart || isStarting}
                onClick={handleStart}
                className="flex items-center gap-2"
              >
                {isStarting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : canStart ? (
                  <>
                    <Play className="h-4 w-4" />
                    Start Again
                  </>
                ) : task.has_active_instance ? (
                  <>
                    <Clock className="h-4 w-4" />
                    In Progress
                  </>
                ) : (
                  <>
                    <Timer className="h-4 w-4" />
                    Cooldown
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {canStart
                  ? `Start a new instance of ${task.title}`
                  : task.has_active_instance
                  ? "Task is already in progress"
                  : `Available ${formatNextAvailable()}`}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

export function RecurringTasksCard({
  teamId,
  currentUserId,
  onTaskStarted,
}: RecurringTasksCardProps) {
  const [startingTaskId, setStartingTaskId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { recurringTasks, loading, error, refetch, startRecurringTask } =
    useRecurringTasks({
      teamId,
      enabled: !!teamId,
    });

  const handleStartTask = async (taskId: string) => {
    if (!currentUserId) return;

    setStartingTaskId(taskId);
    setActionError(null);

    try {
      const result = await startRecurringTask(taskId, currentUserId);
      onTaskStarted?.();
    } catch (error) {
      console.error("Failed to start recurring task:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to start task. Please try again.";
      setActionError(errorMessage);
    } finally {
      setStartingTaskId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Recurring Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Recurring Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-sm text-red-600 mb-2">
              Failed to load recurring tasks
            </p>
            <Button variant="outline" size="sm" onClick={refetch}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recurringTasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Recurring Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">
              No recurring tasks available
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Recurring Tasks
          </div>
          <Button variant="ghost" size="sm" onClick={refetch}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {actionError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{actionError}</p>
            </div>
          )}
          {recurringTasks.map((task) => (
            <RecurringTaskItem
              key={task.task_id}
              task={task}
              onStart={handleStartTask}
              currentUserId={currentUserId}
              isStarting={startingTaskId === task.task_id}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
