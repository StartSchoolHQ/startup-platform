import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Trophy,
  Star,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Circle,
  Lock,
} from "lucide-react";
import { TaskWithAchievement } from "@/types/dashboard";

interface TasksTableProps {
  tasks: TaskWithAchievement[];
  selectedAchievementId?: string | null;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
}

const statusConfig = {
  approved: {
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-100",
    label: "Approved",
  },
  rejected: {
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-100",
    label: "Rejected",
  },
  pending_review: {
    icon: AlertCircle,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
    label: "Pending Review",
  },
  in_progress: {
    icon: Clock,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    label: "In Progress",
  },
  not_started: {
    icon: Circle,
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    label: "Not Started",
  },
  cooldown: {
    icon: Clock,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    label: "Cooldown",
  },
};

const difficultyColors = {
  1: "bg-green-100 text-green-800",
  2: "bg-yellow-100 text-yellow-800",
  3: "bg-orange-100 text-orange-800",
  4: "bg-red-100 text-red-800",
  5: "bg-purple-100 text-purple-800",
};

export function TasksTable({
  tasks,
  selectedAchievementId,
  emptyStateTitle = "No tasks available",
  emptyStateDescription = "Tasks will appear here once available",
}: TasksTableProps) {
  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Trophy className="mb-4 h-12 w-12 text-gray-400" />
          <h3 className="mb-2 text-lg font-semibold text-gray-900">
            {emptyStateTitle}
          </h3>
          <p className="max-w-md text-center text-gray-500">
            {emptyStateDescription}
          </p>
        </CardContent>
      </Card>
    );
  }

  const filteredAchievementName = selectedAchievementId
    ? tasks.find((t) => t.achievement_id === selectedAchievementId)
        ?.achievement_name
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>
            {selectedAchievementId
              ? `Tasks: ${filteredAchievementName}`
              : "All Tasks"}
          </span>
          <span className="text-sm font-normal text-gray-500">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {tasks.map((task) => {
            const statusInfo =
              statusConfig[task.status as keyof typeof statusConfig] ||
              statusConfig["not_started"];
            const StatusIcon = statusInfo.icon;
            const difficultyColor =
              difficultyColors[
                task.difficulty_level as keyof typeof difficultyColors
              ] || "bg-gray-100 text-gray-800";

            return (
              <div
                key={task.progress_id || task.task_id}
                className={`flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-gray-50 ${
                  task.is_confidential
                    ? "border-red-200 bg-red-50/30"
                    : "border-gray-200"
                }`}
              >
                <div className="flex flex-1 items-center space-x-4">
                  {/* Task Icon */}
                  <div className="rounded-lg bg-blue-100 p-2">
                    <Trophy className="h-5 w-5 text-blue-600" />
                  </div>

                  {/* Task Details */}
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate font-medium text-gray-900">
                      {task.title}
                    </h4>
                    <p className="truncate text-sm text-gray-500">
                      {task.description}
                    </p>
                    <div className="mt-2 flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {task.category}
                      </Badge>
                      <Badge className={`text-xs ${difficultyColor}`}>
                        Level {task.difficulty_level}
                      </Badge>
                      {task.achievement_name && (
                        <Badge variant="secondary" className="text-xs">
                          {task.achievement_name}
                        </Badge>
                      )}
                      {task.is_confidential && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="destructive"
                                className="flex items-center gap-1 text-xs"
                              >
                                <Lock className="h-3 w-3" />
                                Confidential
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                This task can only be reviewed by admin users
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>

                  {/* Assignee */}
                  <div className="flex min-w-0 items-center space-x-2">
                    {task.assignee_name ? (
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={task.assignee_avatar_url || undefined}
                            alt={task.assignee_name}
                          />
                          <AvatarFallback className="text-xs">
                            {task.assignee_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="hidden sm:block">
                          <div className="text-sm font-medium text-gray-900">
                            {task.assignee_name}
                          </div>
                          <div className="text-xs text-gray-500">Assigned</div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 text-gray-500">
                        <User className="h-8 w-8 rounded-full bg-gray-100 p-2" />
                        <div className="hidden sm:block">
                          <div className="text-sm">Unassigned</div>
                          <div className="text-xs">Available</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rewards & Status */}
                <div className="ml-4 flex items-center space-x-4">
                  <div className="text-center">
                    <div className="flex items-center space-x-1 text-purple-600">
                      <Trophy className="h-4 w-4" />
                      <span className="text-sm font-semibold">
                        {task.base_xp_reward}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">XP</div>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center space-x-1 text-orange-600">
                      <Star className="h-4 w-4" />
                      <span className="text-sm font-semibold">
                        {task.base_credits_reward}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">Credits</div>
                  </div>

                  <div className="flex items-center space-x-1">
                    <div className={`rounded-full p-1 ${statusInfo.bgColor}`}>
                      <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
                    </div>
                    <span className="hidden text-sm font-medium text-gray-700 lg:block">
                      {statusInfo.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
