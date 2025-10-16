"use client";

import { Badge } from "@/components/ui/badge";

interface DifficultyBadgeProps {
  level: number | string;
}

const getDifficultyConfig = (difficulty: number | string) => {
  const level =
    typeof difficulty === "string" ? parseInt(difficulty) : difficulty;

  if (level <= 1) {
    return {
      text: "Easy",
      badgeVariant: "default" as const,
      className:
        "bg-green-500/10 text-green-700 border-green-500/20 dark:bg-green-500/20 dark:text-green-400",
    };
  } else if (level <= 3) {
    return {
      text: "Medium",
      badgeVariant: "outline" as const,
      className:
        "bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:bg-yellow-500/20 dark:text-yellow-400",
    };
  } else {
    return {
      text: "Hard",
      badgeVariant: "destructive" as const,
      className: "",
    };
  }
};

export function DifficultyBadge({ level }: DifficultyBadgeProps) {
  const config = getDifficultyConfig(level);

  return (
    <Badge variant={config.badgeVariant} className={config.className}>
      {config.text}
    </Badge>
  );
}
