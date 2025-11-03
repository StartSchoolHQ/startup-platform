import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Trophy,
  Star,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Circle,
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
          <Trophy className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {emptyStateTitle}
          </h3>
          <p className="text-gray-500 text-center max-w-md">
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
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4 flex-1">
                  {/* Task Icon */}
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Trophy className="h-5 w-5 text-blue-600" />
                  </div>

                  {/* Task Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">
                      {task.title}
                    </h4>
                    <p className="text-sm text-gray-500 truncate">
                      {task.description}
                    </p>
                    <div className="flex items-center space-x-2 mt-2">
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
                    </div>
                  </div>

                  {/* Assignee */}
                  <div className="flex items-center space-x-2 min-w-0">
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
                        <User className="h-8 w-8 p-2 bg-gray-100 rounded-full" />
                        <div className="hidden sm:block">
                          <div className="text-sm">Unassigned</div>
                          <div className="text-xs">Available</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rewards & Status */}
                <div className="flex items-center space-x-4 ml-4">
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
                    <div className={`p-1 rounded-full ${statusInfo.bgColor}`}>
                      <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
                    </div>
                    <span className="text-sm font-medium text-gray-700 hidden lg:block">
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
