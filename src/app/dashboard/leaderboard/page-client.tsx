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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BookOpen, TrendingUp, Loader2, Users } from "lucide-react";
import { RankIcon } from "@/components/leaderboard/rank-icon";
import { ChangeIndicator } from "@/components/leaderboard/change-indicator";
import { StreakBadge } from "@/components/leaderboard/streak-badge";
import { LeaderboardSkeleton } from "@/components/leaderboard/leaderboard-skeleton";
import {
  LeaderboardEntry,
  TeamLeaderboardEntry,
} from "@/types/leaderboard";
import { createClient } from "@/lib/supabase/client";
import {
  type LeaderboardEntry as DBLeaderboardEntry,
  type TeamLeaderboardEntry as DBTeamLeaderboardEntry,
} from "@/lib/leaderboard-server";
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
  let rankIcon: "crown" | "trophy" | "medal" | "flame" | "none" = "none";
  if (dbEntry.rank_position === 1) rankIcon = "crown";
  else if (dbEntry.rank_position === 2) rankIcon = "trophy";
  else if (dbEntry.rank_position === 3) rankIcon = "medal";

  let changeDirection: "up" | "down" | "none" = "none";
  if (dbEntry.rank_change > 0) changeDirection = "up";
  else if (dbEntry.rank_change < 0) changeDirection = "down";

  const teamText = dbEntry.team_name || "No Team";

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
    xp: { current: dbEntry.total_xp, change: dbEntry.xp_change },
    points: { current: dbEntry.total_points, change: dbEntry.points_change },
    achievements: {
      current: dbEntry.achievements_count,
      change: dbEntry.achievements_change,
    },
    tasks: { current: dbEntry.tasks_completed, change: dbEntry.tasks_change },
    streak: userStreak,
    change: { direction: changeDirection, amount: Math.abs(dbEntry.rank_change) },
    rankIcon,
  };
}

// Helper function to convert team database entry to UI format
function convertToTeamLeaderboardEntry(
  dbEntry: DBTeamLeaderboardEntry,
  userTeamIds?: string[]
): TeamLeaderboardEntry {
  let rankIcon: "crown" | "trophy" | "medal" | "none" = "none";
  if (dbEntry.rank_position === 1) rankIcon = "crown";
  else if (dbEntry.rank_position === 2) rankIcon = "trophy";
  else if (dbEntry.rank_position === 3) rankIcon = "medal";

  let changeDirection: "up" | "down" | "none" = "none";
  if (dbEntry.rank_change > 0) changeDirection = "up";
  else if (dbEntry.rank_change < 0) changeDirection = "down";

  return {
    rank: dbEntry.rank_position,
    team: {
      name: dbEntry.team_name || "Unknown Team",
      memberCount: dbEntry.member_count,
      isCurrentUserTeam: userTeamIds?.includes(dbEntry.team_id),
    },
    xp: { current: dbEntry.total_xp, change: dbEntry.xp_change },
    points: { current: dbEntry.total_points, change: dbEntry.points_change },
    tasks: { current: dbEntry.tasks_completed, change: dbEntry.tasks_change },
    meetings: {
      current: dbEntry.meetings_count,
      change: dbEntry.meetings_change,
    },
    change: { direction: changeDirection, amount: Math.abs(dbEntry.rank_change) },
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
  const animatedXP = useCountUp(entry.xp.current, 800);
  const animatedPoints = useCountUp(entry.points.current, 800);
  const animatedAchievements = useCountUp(entry.achievements.current, 800);
  const animatedTasks = useCountUp(entry.tasks.current, 800);

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

function TeamLeaderboardRow({
  entry,
  index,
}: {
  entry: TeamLeaderboardEntry;
  index: number;
}) {
  const animatedXP = useCountUp(entry.xp.current, 800);
  const animatedPoints = useCountUp(entry.points.current, 800);
  const animatedTasks = useCountUp(entry.tasks.current, 800);
  const animatedMeetings = useCountUp(entry.meetings.current, 800);

  const isTop3 = entry.rank <= 3;
  const isFirst = entry.rank === 1;

  const getRowClassName = () => {
    let baseClass =
      "grid gap-4 p-4 border-b border-border items-center hover:bg-muted/30 hover:shadow-md transition-all duration-200";

    if (entry.team.isCurrentUserTeam) {
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
      layoutId={`team-leaderboard-entry-${entry.team.name}-${entry.rank}`}
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
        gridTemplateColumns: "80px 200px 1fr 1fr 1fr 1fr 100px",
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

      {/* Team */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted shrink-0">
          <Users className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate max-w-[140px]">
              {entry.team.name}
            </span>
            {entry.team.isCurrentUserTeam && (
              <Badge
                variant="secondary"
                className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700"
              >
                Your Team
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {entry.team.memberCount}{" "}
            {entry.team.memberCount === 1 ? "member" : "members"}
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

      {/* Meetings */}
      <div>
        <div className="flex items-center gap-1">
          <span className="text-purple-600 text-xs">🤝</span>
          <span className="font-semibold text-sm">{animatedMeetings}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-purple-500">
          <TrendingUp className="h-3 w-3" />
          <span>+{entry.meetings.change}</span>
        </div>
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
  user_count?: number;
  team_count?: number;
}

interface LeaderboardPageClientProps {
  initialData: DBLeaderboardEntry[];
  availableWeeks: AvailableWeek[];
  initialTeamData: DBTeamLeaderboardEntry[];
  teamAvailableWeeks: AvailableWeek[];
  currentUserId?: string;
  userTeamIds?: string[];
}

export default function LeaderboardPageClient({
  initialData,
  availableWeeks: initialAvailableWeeks,
  initialTeamData,
  teamAvailableWeeks: initialTeamAvailableWeeks,
  currentUserId,
  userTeamIds,
}: LeaderboardPageClientProps) {
  const [activeTab, setActiveTab] = useState<"individual" | "teams">(
    "individual"
  );
  const [selectedWeek, setSelectedWeek] = useState<string>("current");
  const supabase = createClient();

  // React Query: Fetch available weeks (individual)
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
            weekMap.get(key)!.user_count++;
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

  // React Query: Fetch available weeks (teams)
  const { data: teamAvailableWeeks = initialTeamAvailableWeeks } = useQuery({
    queryKey: ["leaderboard", "teamAvailableWeeks"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("team_leaderboard_snapshots")
        .select("week_number, week_year")
        .order("week_year", { ascending: false })
        .order("week_number", { ascending: false });

      if (error) throw error;

      const weekMap = new Map<
        string,
        { week_number: number; week_year: number; team_count: number }
      >();
      (data || []).forEach(
        (snapshot: { week_year: number; week_number: number }) => {
          const key = `${snapshot.week_year}-${snapshot.week_number}`;
          if (!weekMap.has(key)) {
            weekMap.set(key, {
              week_number: snapshot.week_number,
              week_year: snapshot.week_year,
              team_count: 1,
            });
          } else {
            weekMap.get(key)!.team_count++;
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
    initialData: initialTeamAvailableWeeks,
  });

  // React Query: Fetch individual leaderboard data
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

  // React Query: Fetch team leaderboard data
  const { data: rawTeamDbData = initialTeamData, isPending: teamLoading } =
    useQuery({
      queryKey: ["leaderboard", "teams", selectedWeek],
      queryFn: async () => {
        let weekNumber: number | undefined;
        let weekYear: number | undefined;

        if (selectedWeek !== "current") {
          const [year, week] = selectedWeek.split("-").map(Number);
          weekYear = year;
          weekNumber = week;
        }

        const { data, error } = await (supabase as any).rpc(
          "get_team_leaderboard_data",
          {
            p_limit: 50,
            p_week_number: weekNumber || null,
            p_week_year: weekYear || null,
          }
        );

        if (error) throw error;
        return data || [];
      },
      initialData: selectedWeek === "current" ? initialTeamData : undefined,
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

  // Derived data: individual leaderboard entries
  const leaderboardData = useMemo(() => {
    return rawDbData.map((entry: DBLeaderboardEntry) =>
      convertToLeaderboardEntry(entry, currentUserId, userStreaks)
    );
  }, [rawDbData, currentUserId, userStreaks]);

  // Derived data: team leaderboard entries
  const teamLeaderboardData = useMemo(() => {
    return rawTeamDbData.map((entry: DBTeamLeaderboardEntry) =>
      convertToTeamLeaderboardEntry(entry, userTeamIds)
    );
  }, [rawTeamDbData, userTeamIds]);

  // Current weeks list depends on active tab
  const currentWeeks =
    activeTab === "individual" ? availableWeeks : teamAvailableWeeks;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <p className="text-muted-foreground">
          Compete with others and track your progress
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "individual" | "teams")}
      >
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="individual">Individual</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
          </TabsList>

          {/* Filters */}
          <div className="flex items-center gap-4">
            {streaksLoading && activeTab === "individual" && (
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
                {currentWeeks.map((week) => (
                  <SelectItem
                    key={`${week.week_year}-${week.week_number}`}
                    value={`${week.week_year}-${week.week_number}`}
                  >
                    Week {week.week_number}, {week.week_year} (
                    {week.user_count ?? week.team_count}{" "}
                    {activeTab === "individual" ? "users" : "teams"})
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
        </div>
      </Tabs>

      {/* Individual Leaderboard Table */}
      {activeTab === "individual" && (
        <Card className="border-none shadow-none">
          <CardContent className="p-0">
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
      )}

      {/* Team Leaderboard Table */}
      {activeTab === "teams" && (
        <Card className="border-none shadow-none">
          <CardContent className="p-0">
            <div
              className="grid gap-4 p-3 border-b border-border text-sm font-medium text-muted-foreground"
              style={{
                gridTemplateColumns: "80px 200px 1fr 1fr 1fr 1fr 100px",
              }}
            >
              <div>Rank</div>
              <div>Team</div>
              <div>XP</div>
              <div>Points</div>
              <div>Tasks</div>
              <div>Meetings</div>
              <div className="text-center">Change</div>
            </div>

            <AnimatePresence mode="wait">
              {teamLoading ? (
                <motion.div
                  key="team-skeleton"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="p-6"
                >
                  <LeaderboardSkeleton />
                </motion.div>
              ) : teamLeaderboardData.length > 0 ? (
                <motion.div
                  key="team-data"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <AnimatePresence mode="popLayout">
                    {teamLeaderboardData.map(
                      (item: TeamLeaderboardEntry, index: number) => (
                        <TeamLeaderboardRow
                          key={`${item.team.name}-${item.rank}`}
                          entry={item}
                          index={index}
                        />
                      )
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <motion.div
                  key="team-empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="p-8 text-center text-muted-foreground"
                >
                  <p>No team leaderboard data available for this week.</p>
                  <p className="text-sm mt-1">
                    Weekly snapshots will be generated automatically.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
