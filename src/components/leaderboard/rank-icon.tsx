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
          <span className="text-sm font-medium text-foreground">#{rank}</span>
        );
      default:
        return (
          <span className="text-sm font-medium text-muted-foreground">
            #{rank}
          </span>
        );
    }
  };

  const getTrendIcon = () => {
    if (changeDirection === "up") {
      return <TrendingUp className="h-3 w-3 text-primary" />;
    } else if (changeDirection === "down") {
      return <TrendingDown className="h-3 w-3 text-destructive" />;
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
