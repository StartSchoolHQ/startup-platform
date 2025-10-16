import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BookOpen, TrendingUp } from "lucide-react";
import { leaderboardData } from "@/data/leaderboard-data";
import { RankIcon } from "@/components/leaderboard/rank-icon";
import { ChangeIndicator } from "@/components/leaderboard/change-indicator";
import { StreakBadge } from "@/components/leaderboard/streak-badge";
import { LeaderboardEntry } from "@/types/leaderboard";

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <div
      className={`grid gap-4 p-4 border-b border-border items-center ${
        entry.user.isCurrentUser ? "bg-blue-50" : ""
      }`}
      style={{ gridTemplateColumns: "80px 200px 1fr 1fr 1fr 1fr 1fr 100px" }}
    >
      {/* Rank */}
      <div className="flex items-center gap-2">
        <RankIcon
          type={entry.rankIcon || "none"}
          rank={entry.rank}
          changeDirection={entry.change.direction}
        />
      </div>

      {/* User */}
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src="/avatars/john-doe.jpg" alt={entry.user.name} />
          <AvatarFallback>
            {entry.user.name
              .split(" ")
              .map((n: string) => n[0])
              .join("")}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{entry.user.name}</span>
            {entry.user.isCurrentUser && (
              <Badge
                variant="secondary"
                className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700"
              >
                You
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {entry.user.teams}
          </span>
        </div>
      </div>

      {/* XP */}
      <div>
        <div className="flex items-center gap-1">
          <span className="text-green-600 text-xs">⚡</span>
          <span className="font-semibold text-sm">
            {entry.xp.current.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-green-500">
          <TrendingUp className="h-3 w-3" />
          <span>+{entry.xp.change}</span>
        </div>
      </div>

      {/* Points */}
      <div>
        <div className="flex items-center gap-1">
          <span className="text-blue-600 text-xs">💎</span>
          <span className="font-semibold text-sm">
            {entry.points.current.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-blue-500">
          <TrendingUp className="h-3 w-3" />
          <span>+{entry.points.change}</span>
        </div>
      </div>

      {/* Achievements */}
      <div>
        <div className="flex items-center gap-1">
          <span className="text-yellow-600 text-xs">🏆</span>
          <span className="font-semibold text-sm">
            {entry.achievements.current}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-yellow-500">
          <TrendingUp className="h-3 w-3" />
          <span>+{entry.achievements.change}</span>
        </div>
      </div>

      {/* Tasks */}
      <div>
        <div className="flex items-center gap-1">
          <span className="text-green-600 text-xs">📋</span>
          <span className="font-semibold text-sm">{entry.tasks.current}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-green-500">
          <TrendingUp className="h-3 w-3" />
          <span>+{entry.tasks.change}</span>
        </div>
      </div>

      {/* Streak */}
      <div>
        <StreakBadge days={entry.streak.days} type={entry.streak.type} />
      </div>

      {/* Change */}
      <div className="flex justify-center">
        <ChangeIndicator
          direction={entry.change.direction}
          amount={entry.change.amount}
        />
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <p className="text-muted-foreground">
          Compete with others and track your progress
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-end gap-4">
        <Select defaultValue="all-time">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-time">All Time</SelectItem>
            <SelectItem value="this-month">This Month</SelectItem>
            <SelectItem value="this-week">This Week</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Read About Rankings
        </Button>
      </div>

      {/* Leaderboard Table */}
      <Card className="border-none shadow-none">
        <CardContent className="p-0">
          {/* Table Header */}
          <div
            className="grid gap-4 p-3 border-b border-border text-sm font-medium text-muted-foreground"
            style={{
              gridTemplateColumns: "80px 200px 1fr 1fr 1fr 1fr 1fr 100px",
            }}
          >
            <div>Rank</div>
            <div>User</div>
            <div>XP</div>
            <div>Points</div>
            <div>Achievements</div>
            <div>Tasks</div>
            <div>Streak</div>
            <div className="text-center">Change</div>
          </div>

          {/* Table Rows */}
          <div>
            {leaderboardData.map((item) => (
              <LeaderboardRow key={item.rank} entry={item} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
