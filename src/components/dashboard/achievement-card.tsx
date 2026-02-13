import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Star,
  Target,
  CheckCircle2,
  Clock,
  Circle,
  ChevronRight,
} from "lucide-react";
import { AchievementCardProps } from "@/types/dashboard";

const iconMap = {
  trophy: Trophy,
  star: Star,
  target: Target,
  check: CheckCircle2,
  clock: Clock,
  circle: Circle,
};

const statusColorMap = {
  completed: {
    cardBg: "bg-purple-50 border-purple-200 hover:bg-purple-100",
    iconColor: "text-purple-600",
    badgeVariant: "default" as const,
    badgeColor: "bg-purple-600 text-white",
  },
  "in-progress": {
    cardBg: "bg-orange-50 border-orange-200 hover:bg-orange-100",
    iconColor: "text-orange-600",
    badgeVariant: "secondary" as const,
    badgeColor: "bg-orange-500 text-white",
  },
  "not-started": {
    cardBg: "bg-gray-50 border-gray-200 hover:bg-gray-100",
    iconColor: "text-gray-500",
    badgeVariant: "outline" as const,
    badgeColor: "bg-gray-100 text-gray-600",
  },
};

export function AchievementCard({
  achievement,
  isSelected,
  onClick,
}: AchievementCardProps) {
  const IconComponent =
    iconMap[achievement.achievement_icon as keyof typeof iconMap] || Trophy;
  const statusColors = statusColorMap[achievement.status];

  const progressPercentage =
    achievement.total_tasks > 0
      ? Math.round(
          (achievement.completed_tasks / achievement.total_tasks) * 100
        )
      : 0;

  return (
    <Card
      className={`cursor-pointer transition-all duration-200 ${statusColors.cardBg} ${isSelected ? "ring-2 ring-blue-500 ring-offset-2" : ""} hover:shadow-md`}
      onClick={() => onClick(isSelected ? null : achievement.achievement_id)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`rounded-lg bg-white p-2 shadow-sm`}>
              <IconComponent className={`h-6 w-6 ${statusColors.iconColor}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-semibold">
                  {achievement.achievement_name}
                </CardTitle>
                <ChevronRight className="text-muted-foreground h-4 w-4 opacity-60" />
              </div>
              <CardDescription className="mt-1 text-sm text-gray-600">
                {achievement.achievement_description}
              </CardDescription>
            </div>
          </div>
          <Badge
            variant={statusColors.badgeVariant}
            className={`${statusColors.badgeColor} px-2 py-1 text-xs font-medium`}
          >
            {achievement.status === "completed" && "Completed"}
            {achievement.status === "in-progress" && "In Progress"}
            {achievement.status === "not-started" && "Not Started"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="w-full">
            <div className="mb-2 flex justify-between text-sm text-gray-600">
              <span>Progress</span>
              <span>
                {achievement.completed_tasks}/{achievement.total_tasks} tasks
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  achievement.status === "completed"
                    ? "bg-purple-600"
                    : achievement.status === "in-progress"
                      ? "bg-orange-500"
                      : "bg-gray-400"
                } `}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {progressPercentage}% Complete
            </div>
          </div>

          {/* Rewards */}
          <div className="flex items-center justify-between border-t border-gray-200 pt-2">
            <div className="flex space-x-4">
              <div className="text-center">
                <div className="text-sm font-semibold text-purple-600">
                  {achievement.xp_reward} XP
                </div>
                <div className="text-xs text-gray-500">Experience</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-orange-600">
                  {achievement.credits_reward} Credits
                </div>
                <div className="text-xs text-gray-500">Capital</div>
              </div>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center space-x-1">
              {achievement.status === "completed" && (
                <div className="flex items-center text-purple-600">
                  <CheckCircle2 className="mr-1 h-4 w-4" />
                  <span className="text-xs font-medium">Done</span>
                </div>
              )}
              {achievement.status === "in-progress" && (
                <div className="flex items-center text-orange-600">
                  <Clock className="mr-1 h-4 w-4" />
                  <span className="text-xs font-medium">Active</span>
                </div>
              )}
              {achievement.status === "not-started" && (
                <div className="flex items-center text-gray-500">
                  <Circle className="mr-1 h-4 w-4" />
                  <span className="text-xs font-medium">Locked</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
