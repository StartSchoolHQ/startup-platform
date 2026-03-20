import { Crown, Medal, Trophy, TrendingUp, TrendingDown } from "lucide-react";

interface RankIconProps {
  type: "crown" | "trophy" | "medal" | "flame" | "none";
  rank: number;
  changeDirection?: "up" | "down" | "none";
}

export function RankIcon({
  type,
  rank,
  changeDirection = "none",
}: RankIconProps) {
  const getIcon = () => {
    switch (type) {
      case "crown":
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case "trophy":
        return <Trophy className="h-4 w-4 text-slate-400" />;
      case "medal":
        return <Medal className="h-4 w-4 text-amber-700" />;
      case "flame":
        return (
          <span className="text-foreground text-sm font-medium">#{rank}</span>
        );
      default:
        return (
          <span className="text-muted-foreground text-sm font-medium">
            #{rank}
          </span>
        );
    }
  };

  const getTrendIcon = () => {
    if (changeDirection === "up") {
      return <TrendingUp className="text-primary h-3 w-3" />;
    } else if (changeDirection === "down") {
      return <TrendingDown className="text-destructive h-3 w-3" />;
    }
    return null;
  };

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center justify-center">{getIcon()}</div>
      {getTrendIcon()}
    </div>
  );
}
