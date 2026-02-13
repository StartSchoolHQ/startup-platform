import React from "react";
import { AchievementCard } from "./achievement-card";
import { Achievement } from "@/types/dashboard";

interface AchievementGridProps {
  achievements: Achievement[];
  selectedAchievementId: string | null;
  onAchievementClick: (achievementId: string | null) => void;
}

export function AchievementGrid({
  achievements,
  selectedAchievementId,
  onAchievementClick,
}: AchievementGridProps) {
  if (achievements.length === 0) {
    return (
      <div className="py-8 text-center">
        <div className="mb-2 text-lg text-gray-500">
          No achievements available
        </div>
        <div className="text-sm text-gray-400">
          Complete tasks to unlock achievements!
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Achievement Categories
        </h3>
        <div className="text-sm text-gray-500">
          Click an achievement to filter tasks
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {achievements.map((achievement) => (
          <AchievementCard
            key={achievement.achievement_id}
            achievement={achievement}
            isSelected={selectedAchievementId === achievement.achievement_id}
            onClick={onAchievementClick}
          />
        ))}
      </div>

      {selectedAchievementId && (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-blue-800">
              <span className="font-medium">Filtering tasks by:</span>{" "}
              {
                achievements.find(
                  (a) => a.achievement_id === selectedAchievementId
                )?.achievement_name
              }
            </div>
            <button
              onClick={() => onAchievementClick(null)}
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Show All Tasks
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
