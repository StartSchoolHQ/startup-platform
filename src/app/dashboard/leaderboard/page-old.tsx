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
import { RankIcon } from "@/components/leaderboard/rank-icon";
import { ChangeIndicator } from "@/components/leaderboard/change-indicator";
import { StreakBadge } from "@/components/leaderboard/streak-badge";
import { LeaderboardEntry } from "@/types/leaderboard";
import { createClient } from "@/lib/supabase/server";
import { getServerSideLeaderboardData, getServerSideCurrentWeekInfo, type LeaderboardEntry as DBLeaderboardEntry } from "@/lib/leaderboard-server";
import { redirect } from "next/navigation";

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
          <AvatarImage src={entry.user.avatar} alt={entry.user.name} />
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

// Helper function to convert database entry to UI format
function convertToLeaderboardEntry(
  dbEntry: DBLeaderboardEntry,
  currentUserId?: string
): LeaderboardEntry {
  // Determine rank icon based on position
  let rankIcon: "crown" | "trophy" | "medal" | "flame" | "none" = "none";
  if (dbEntry.rank_position === 1) rankIcon = "crown";
  else if (dbEntry.rank_position === 2) rankIcon = "trophy";
  else if (dbEntry.rank_position === 3) rankIcon = "medal";
  else rankIcon = "none"; // All other ranks show the number

  // Determine change direction
  let changeDirection: "up" | "down" | "none" = "none";
  if (dbEntry.rank_change > 0) changeDirection = "up";
  else if (dbEntry.rank_change < 0) changeDirection = "down";

  // Determine streak (placeholder logic - we'll implement this properly later)
  const streakType: "active" | "warning" | "inactive" = 
    dbEntry.total_xp > 100 ? "active" : 
    dbEntry.total_xp > 50 ? "warning" : "inactive";

  const teamText = dbEntry.team_count === 0 ? "No Teams" : 
                  dbEntry.team_count === 1 ? "1 Team" : 
                  `${dbEntry.team_count} Teams`;

  return {
    rank: dbEntry.rank_position,
    user: {
      name: dbEntry.user_name || "Unknown User",
      avatar: dbEntry.user_avatar_url || "/avatars/john-doe.jpg",
      teams: teamText,
      isCurrentUser: dbEntry.user_id === currentUserId,
    },
    xp: {
      current: dbEntry.total_xp,
      change: dbEntry.xp_change,
    },
    points: {
      current: dbEntry.total_points,
      change: dbEntry.points_change,
    },
    achievements: {
      current: dbEntry.achievements_count,
      change: dbEntry.achievements_change,
    },
    tasks: {
      current: dbEntry.tasks_completed,
      change: dbEntry.tasks_change,
    },
    streak: {
      days: Math.floor(Math.random() * 30) + 1, // Placeholder - implement proper streak logic later
      type: streakType,
    },
    change: {
      direction: changeDirection,
      amount: Math.abs(dbEntry.rank_change),
    },
    rankIcon,
  };
}

export default async function LeaderboardPage() {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect('/login');
  }

  try {
    // Get current week info and leaderboard data
    const [, dbLeaderboardData] = await Promise.all([
      getServerSideCurrentWeekInfo(), // For future use with week selection
      getServerSideLeaderboardData(50) // Get top 50 users
    ]);

    // Convert database entries to UI format
    const leaderboardData = dbLeaderboardData.map(entry => 
      convertToLeaderboardEntry(entry, user.id)
    );

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
            {leaderboardData.length > 0 ? (
              leaderboardData.map((item) => (
                <LeaderboardRow key={item.rank} entry={item} />
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <p>No leaderboard data available yet.</p>
                <p className="text-sm mt-1">Weekly snapshots will be generated automatically.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
    );
  } catch (error) {
    console.error('Error loading leaderboard:', error);
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Leaderboard</h1>
          <p className="text-muted-foreground">
            Compete with others and track your progress
          </p>
        </div>
        <Card className="border-none shadow-none">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Unable to load leaderboard data.</p>
            <p className="text-sm mt-1">Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
}
