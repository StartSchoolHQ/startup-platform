"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
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
import { BookOpen, TrendingUp, Loader2 } from "lucide-react";
import { RankIcon } from "@/components/leaderboard/rank-icon";
import { ChangeIndicator } from "@/components/leaderboard/change-indicator";
import { StreakBadge } from "@/components/leaderboard/streak-badge";
import { LeaderboardSkeleton } from "@/components/leaderboard/leaderboard-skeleton";
import { LeaderboardEntry } from "@/types/leaderboard";
import { createClient } from "@/lib/supabase/client";
import { type LeaderboardEntry as DBLeaderboardEntry } from "@/lib/leaderboard-server";
import { useCountUp } from "@/hooks/use-count-up";

// Helper function to convert database entry to UI format
function convertToLeaderboardEntry(
  dbEntry: DBLeaderboardEntry,
  currentUserId?: string,
  userStreaks?: Map<
    string,
    { days: number; type: "active" | "warning" | "inactive" }
  >
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

  const teamText =
    dbEntry.team_count === 0
      ? "No Teams"
      : dbEntry.team_count === 1
      ? "1 Team"
      : `${dbEntry.team_count} Teams`;

  // Get real streak data from API
  const userStreak = userStreaks?.get(dbEntry.user_id) || {
    days: 0,
    type: "inactive" as const,
  };

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
    streak: userStreak,
    change: {
      direction: changeDirection,
      amount: Math.abs(dbEntry.rank_change),
    },
    rankIcon,
  };
}

function LeaderboardRow({
  entry,
  index,
}: {
  entry: LeaderboardEntry;
  index: number;
}) {
  // Count-up animations for stats
  const animatedXP = useCountUp(entry.xp.current, 800);
  const animatedPoints = useCountUp(entry.points.current, 800);
  const animatedAchievements = useCountUp(entry.achievements.current, 800);
  const animatedTasks = useCountUp(entry.tasks.current, 800);

  // Top 3 styling
  const isTop3 = entry.rank <= 3;
  const isFirst = entry.rank === 1;

  const getRowClassName = () => {
    let baseClass =
      "grid gap-4 p-4 border-b border-border items-center hover:bg-muted/30 hover:shadow-md transition-all duration-200";

    if (entry.user.isCurrentUser) {
      baseClass += " bg-blue-50 animate-[pulse-subtle_3s_ease-in-out_infinite]";
    } else if (isFirst) {
      baseClass +=
        " bg-gradient-to-r from-yellow-50/50 to-transparent dark:from-yellow-950/20";
    } else if (isTop3) {
      baseClass +=
        " bg-gradient-to-r from-slate-50/50 to-transparent dark:from-slate-900/20";
    }

    return baseClass;
  };

  return (
    <motion.div
      layout
      layoutId={`leaderboard-entry-${entry.user.name}-${entry.rank}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        layout: { type: "spring", stiffness: 350, damping: 30 },
        opacity: { duration: 0.3, delay: index * 0.05 },
        y: { duration: 0.3, delay: index * 0.05 },
      }}
      className={getRowClassName()}
      style={{
        gridTemplateColumns: "80px 200px 1fr 1fr 1fr 1fr 1fr 100px",
        boxShadow: isTop3 ? "0 0 20px -10px rgba(0,0,0,0.1)" : "none",
      }}
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
            {animatedXP.toLocaleString()}
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
            {animatedPoints.toLocaleString()}
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
          <span className="font-semibold text-sm">{animatedAchievements}</span>
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
          <span className="font-semibold text-sm">{animatedTasks}</span>
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
    </motion.div>
  );
}

interface AvailableWeek {
  week_number: number;
  week_year: number;
  week_start: string;
  week_end: string;
  user_count: number;
}

interface LeaderboardPageClientProps {
  initialData: DBLeaderboardEntry[];
  availableWeeks: AvailableWeek[];
  currentUserId?: string;
}

export default function LeaderboardPageClient({
  initialData,
  availableWeeks: initialAvailableWeeks,
  currentUserId,
}: LeaderboardPageClientProps) {
  const [selectedWeek, setSelectedWeek] = useState<string>("current");
  const supabase = createClient();

  // React Query: Fetch available weeks
  const { data: availableWeeks = initialAvailableWeeks } = useQuery({
    queryKey: ["leaderboard", "availableWeeks"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("leaderboard_snapshots")
        .select("week_number, week_year")
        .order("week_year", { ascending: false })
        .order("week_number", { ascending: false });

      if (error) throw error;

      const weekMap = new Map<
        string,
        { week_number: number; week_year: number; user_count: number }
      >();
      (data || []).forEach(
        (snapshot: { week_year: number; week_number: number }) => {
          const key = `${snapshot.week_year}-${snapshot.week_number}`;
          if (!weekMap.has(key)) {
            weekMap.set(key, {
              week_number: snapshot.week_number,
              week_year: snapshot.week_year,
              user_count: 1,
            });
          } else {
            const existingWeek = weekMap.get(key)!;
            existingWeek.user_count++;
          }
        }
      );

      return Array.from(weekMap.values()).map((week) => {
        const startOfYear = new Date(week.week_year, 0, 1);
        const daysOffset = (week.week_number - 1) * 7;
        const weekStart = new Date(
          startOfYear.getTime() + daysOffset * 24 * 60 * 60 * 1000
        );
        const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);

        return {
          ...week,
          week_start: weekStart.toISOString().split("T")[0],
          week_end: weekEnd.toISOString().split("T")[0],
        };
      });
    },
    initialData: initialAvailableWeeks,
  });

  // React Query: Fetch leaderboard data based on selected week
  const { data: rawDbData = initialData, isPending: loading } = useQuery({
    queryKey: ["leaderboard", "data", selectedWeek],
    queryFn: async () => {
      let weekNumber: number | undefined;
      let weekYear: number | undefined;

      if (selectedWeek !== "current") {
        const [year, week] = selectedWeek.split("-").map(Number);
        weekYear = year;
        weekNumber = week;
      }

      const { data, error } = await (supabase as any).rpc(
        "get_leaderboard_data",
        {
          p_limit: 50,
          p_week_number: weekNumber || null,
          p_week_year: weekYear || null,
        }
      );

      if (error) throw error;
      return data || [];
    },
    initialData: selectedWeek === "current" ? initialData : undefined,
  });

  // React Query: Fetch streaks for current leaderboard data
  const { data: userStreaks = new Map(), isPending: streaksLoading } = useQuery(
    {
      queryKey: [
        "leaderboard",
        "streaks",
        rawDbData?.map((e: DBLeaderboardEntry) => e.user_id),
      ],
      queryFn: async () => {
        const userIds = rawDbData.map(
          (entry: DBLeaderboardEntry) => entry.user_id
        );
        if (userIds.length === 0) return new Map();

        const response = await fetch("/api/leaderboard/streaks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIds }),
        });

        if (!response.ok) throw new Error("Failed to fetch streaks");

        const { streaks } = await response.json();
        return new Map(Object.entries(streaks));
      },
      enabled: rawDbData.length > 0,
    }
  );

  // Derived data: Transform raw DB data to leaderboard entries (memoized)
  const leaderboardData = useMemo(() => {
    return rawDbData.map((entry: DBLeaderboardEntry) =>
      convertToLeaderboardEntry(entry, currentUserId, userStreaks)
    );
  }, [rawDbData, currentUserId, userStreaks]);

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
        {streaksLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading streaks...
          </div>
        )}
        <Select value={selectedWeek} onValueChange={setSelectedWeek}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select week" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current">Current Week</SelectItem>
            {availableWeeks.map((week) => (
              <SelectItem
                key={`${week.week_year}-${week.week_number}`}
                value={`${week.week_year}-${week.week_number}`}
              >
                Week {week.week_number}, {week.week_year} ({week.user_count}{" "}
                users)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          className="flex items-center gap-2"
          disabled
          title="Coming soon"
        >
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
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="p-6"
              >
                <LeaderboardSkeleton />
              </motion.div>
            ) : leaderboardData.length > 0 ? (
              <motion.div
                key="data"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <AnimatePresence mode="popLayout">
                  {leaderboardData.map(
                    (item: LeaderboardEntry, index: number) => (
                      <LeaderboardRow
                        key={`${item.user.name}-${item.rank}`}
                        entry={item}
                        index={index}
                      />
                    )
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="p-8 text-center text-muted-foreground"
              >
                <p>No leaderboard data available for this week.</p>
                <p className="text-sm mt-1">
                  Weekly snapshots will be generated automatically.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}
