import { TrendingUp, TrendingDown } from "lucide-react";

interface RankIconProps {
  type: "crown" | "trophy" | "medal" | "flame" | "none";
  rank: number;
  changeDirection: "up" | "down" | "none";
}

export function RankIcon({ type, rank, changeDirection }: RankIconProps) {
  const getIcon = () => {
    switch (type) {
      case "crown":
        return <span className="text-primary text-sm">👑</span>;
      case "trophy":
        return <span className="text-muted-foreground text-sm">🏆</span>;
      case "medal":
        return <span className="text-accent-foreground text-sm">🥉</span>;
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
