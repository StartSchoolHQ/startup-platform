"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Eye,
  Flame,
  Gem,
  Handshake,
  ListChecks,
  Minus,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RankIcon } from "@/components/leaderboard/rank-icon";
import { ChangeIndicator } from "@/components/leaderboard/change-indicator";
import { StreakBadge } from "@/components/leaderboard/streak-badge";
import { LeaderboardSkeleton } from "@/components/leaderboard/leaderboard-skeleton";
import {
  LeaderboardMobileRow,
  TeamLeaderboardMobileRow,
} from "@/components/leaderboard/leaderboard-mobile-rows";
import { LeaderboardEntry, TeamLeaderboardEntry } from "@/types/leaderboard";
import { createClient } from "@/lib/supabase/client";
import {
  type LeaderboardEntry as DBLeaderboardEntry,
  type TeamLeaderboardEntry as DBTeamLeaderboardEntry,
} from "@/lib/leaderboard-server";
import { useCountUp } from "@/hooks/use-count-up";
import { getISOWeekBoundaries } from "@/lib/week-utils";

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

  const isNewEntry = !!(dbEntry as any).is_new_entry;

  let changeDirection: "up" | "down" | "none" = "none";
  if (isNewEntry) {
    changeDirection = "none";
  } else if (dbEntry.rank_change > 0) {
    changeDirection = "up";
  } else if (dbEntry.rank_change < 0) {
    changeDirection = "down";
  }

  const teamText = dbEntry.team_name || "No Team";

  const userStreak = userStreaks?.get(dbEntry.user_id) || {
    days: 0,
    type: "inactive" as const,
  };

  return {
    rank: dbEntry.rank_position,
    user: {
      userId: dbEntry.user_id,
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
    weeklyReports: (dbEntry as any).weekly_reports_count ?? 0,
    peerReviews: (dbEntry as any).peer_reviews_count ?? 0,
    streak: userStreak,
    change: {
      direction: changeDirection,
      amount: Math.abs(dbEntry.rank_change),
      isNew: isNewEntry,
    },
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

  const isNewEntry = !!(dbEntry as any).is_new_entry;

  let changeDirection: "up" | "down" | "none" = "none";
  if (isNewEntry) {
    changeDirection = "none";
  } else if (dbEntry.rank_change > 0) {
    changeDirection = "up";
  } else if (dbEntry.rank_change < 0) {
    changeDirection = "down";
  }

  return {
    rank: dbEntry.rank_position,
    team: {
      teamId: dbEntry.team_id,
      name: dbEntry.team_name || "Unknown Team",
      logoUrl: dbEntry.team_logo_url || undefined,
      memberCount: dbEntry.member_count,
      isCurrentUserTeam: userTeamIds?.includes(dbEntry.team_id),
      xpPerMember: (dbEntry as any).xp_per_member ?? undefined,
    },
    xp: { current: dbEntry.total_xp, change: dbEntry.xp_change },
    points: { current: dbEntry.total_points, change: dbEntry.points_change },
    tasks: { current: dbEntry.tasks_completed, change: dbEntry.tasks_change },
    meetings: {
      current: dbEntry.meetings_count,
      change: dbEntry.meetings_change,
    },
    change: {
      direction: changeDirection,
      amount: Math.abs(dbEntry.rank_change),
      isNew: isNewEntry,
    },
    rankIcon,
  };
}

const changeColorMap = {
  green: "text-green-500",
  blue: "text-blue-500",
  yellow: "text-yellow-500",
  purple: "text-purple-500",
} as const;

function ChangeValue({
  value,
  color,
}: {
  value: number;
  color: "green" | "blue" | "yellow" | "purple";
}) {
  if (value === 0) {
    return (
      <div className="text-muted-foreground flex items-center gap-1 text-xs">
        <Minus className="h-3 w-3" />
        <span>0</span>
      </div>
    );
  }
  if (value > 0) {
    return (
      <div
        className={`flex items-center gap-1 text-xs ${changeColorMap[color]}`}
      >
        <TrendingUp className="h-3 w-3" />
        <span>+{value}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-xs text-red-500">
      <TrendingDown className="h-3 w-3" />
      <span>{value}</span>
    </div>
  );
}

function LeaderboardRow({
  entry,
  index,
}: {
  entry: LeaderboardEntry;
  index: number;
}) {
  const animatedXP = useCountUp(entry.xp.current, 800);
  const animatedTasks = useCountUp(entry.tasks.current, 800);

  const isTop3 = entry.rank <= 3;
  const isFirst = entry.rank === 1;

  const getRowClassName = () => {
    let baseClass =
      "grid min-w-[700px] gap-4 p-4 border-b border-border items-center hover:bg-muted/30 hover:shadow-md transition-all duration-200";

    if (entry.user.isCurrentUser) {
      baseClass +=
        " bg-blue-50 dark:bg-blue-950/50 animate-[pulse-subtle_3s_ease-in-out_infinite]";
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
      layoutId={`leaderboard-entry-${entry.user.userId}`}
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
        <RankIcon type={entry.rankIcon || "none"} rank={entry.rank} />
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
            <span className="text-sm font-medium">{entry.user.name}</span>
            {entry.user.isCurrentUser && (
              <Badge
                variant="secondary"
                className="bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-300"
              >
                You
              </Badge>
            )}
          </div>
          <span className="text-muted-foreground text-xs">
            {entry.user.teams}
          </span>
        </div>
      </div>

      {/* XP */}
      <div>
        <div className="flex items-center gap-1">
          <Zap className="h-3.5 w-3.5 text-green-600" />
          <span className="text-sm font-semibold">
            {animatedXP.toLocaleString()}
          </span>
        </div>
        <ChangeValue value={entry.xp.change} color="green" />
      </div>

      {/* Tasks */}
      <div>
        <div className="flex items-center gap-1">
          <ListChecks className="h-3.5 w-3.5 text-emerald-600" />
          <span className="text-sm font-semibold">{animatedTasks}</span>
        </div>
      </div>

      {/* Peer Reviews */}
      <div>
        <div className="flex items-center gap-1">
          <Eye className="h-3.5 w-3.5 text-purple-600" />
          <span className="text-sm font-semibold">{entry.peerReviews}</span>
        </div>
      </div>

      {/* Streak */}
      <div>
        <StreakBadge days={entry.streak.days} type={entry.streak.type} />
      </div>

      {/* Change */}
      <div className="flex justify-center">
        {entry.change.isNew ? (
          <Badge
            variant="secondary"
            className="bg-green-100 text-xs text-green-700 dark:bg-green-900 dark:text-green-300"
          >
            NEW
          </Badge>
        ) : (
          <ChangeIndicator
            direction={entry.change.direction}
            amount={entry.change.amount}
          />
        )}
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
      "grid min-w-[700px] gap-4 p-4 border-b border-border items-center hover:bg-muted/30 hover:shadow-md transition-all duration-200";

    if (entry.team.isCurrentUserTeam) {
      baseClass +=
        " bg-blue-50 dark:bg-blue-950/50 animate-[pulse-subtle_3s_ease-in-out_infinite]";
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
      layoutId={`team-leaderboard-entry-${entry.team.teamId}`}
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
        <RankIcon type={entry.rankIcon || "none"} rank={entry.rank} />
      </div>

      {/* Team */}
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8 shrink-0">
          {entry.team.logoUrl ? (
            <AvatarImage
              src={entry.team.logoUrl}
              alt={entry.team.name}
              className="object-cover"
            />
          ) : null}
          <AvatarFallback className="bg-muted text-xs">
            {entry.team.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <span className="max-w-[140px] truncate text-sm font-medium">
              {entry.team.name}
            </span>
            {entry.team.isCurrentUserTeam && (
              <Badge
                variant="secondary"
                className="bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-300"
              >
                Your Team
              </Badge>
            )}
          </div>
          <span className="text-muted-foreground text-xs">
            {entry.team.memberCount}{" "}
            {entry.team.memberCount === 1 ? "member" : "members"}
            {entry.team.xpPerMember != null &&
              ` · ~${Math.round(entry.team.xpPerMember).toLocaleString()} XP/member`}
          </span>
        </div>
      </div>

      {/* XP */}
      <div>
        <div className="flex items-center gap-1">
          <Zap className="h-3.5 w-3.5 text-green-600" />
          <span className="text-sm font-semibold">
            {animatedXP.toLocaleString()}
          </span>
        </div>
        <ChangeValue value={entry.xp.change} color="green" />
      </div>

      {/* Points */}
      <div>
        <div className="flex items-center gap-1">
          <Gem className="h-3.5 w-3.5 text-blue-600" />
          <span className="text-sm font-semibold">
            {animatedPoints.toLocaleString()}
          </span>
        </div>
        <ChangeValue value={entry.points.change} color="blue" />
      </div>

      {/* Tasks */}
      <div>
        <div className="flex items-center gap-1">
          <ListChecks className="h-3.5 w-3.5 text-emerald-600" />
          <span className="text-sm font-semibold">{animatedTasks}</span>
        </div>
        <ChangeValue value={entry.tasks.change} color="green" />
      </div>

      {/* Meetings */}
      <div>
        <div className="flex items-center gap-1">
          <Handshake className="h-3.5 w-3.5 text-purple-600" />
          <span className="text-sm font-semibold">{animatedMeetings}</span>
        </div>
        <ChangeValue value={entry.meetings.change} color="purple" />
      </div>

      {/* Change */}
      <div className="flex justify-center">
        {entry.change.isNew ? (
          <Badge
            variant="secondary"
            className="bg-green-100 text-xs text-green-700 dark:bg-green-900 dark:text-green-300"
          >
            NEW
          </Badge>
        ) : (
          <ChangeIndicator
            direction={entry.change.direction}
            amount={entry.change.amount}
          />
        )}
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

  // Reset week selector when switching tabs to avoid mismatched weeks
  useEffect(() => {
    setSelectedWeek("current");
  }, [activeTab]);

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
        const { weekStart, weekEnd } = getISOWeekBoundaries(
          week.week_year,
          week.week_number
        );

        return {
          ...week,
          week_start: weekStart.toISOString().split("T")[0],
          week_end: weekEnd.toISOString().split("T")[0],
        };
      });
    },
    initialData: initialAvailableWeeks,
    staleTime: 60_000,
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
        const { weekStart, weekEnd } = getISOWeekBoundaries(
          week.week_year,
          week.week_number
        );

        return {
          ...week,
          week_start: weekStart.toISOString().split("T")[0],
          week_end: weekEnd.toISOString().split("T")[0],
        };
      });
    },
    initialData: initialTeamAvailableWeeks,
    staleTime: 60_000,
  });

  // React Query: Fetch individual leaderboard data
  const { data: rawDbData = initialData, isPending: loading } = useQuery({
    queryKey: ["leaderboard", "data", selectedWeek],
    queryFn: async () => {
      if (selectedWeek === "current") {
        // Use live RPC for current week (real-time, no snapshots)
        const { data, error } = await (supabase as any).rpc(
          "get_live_leaderboard_data",
          { p_limit: 50 }
        );
        if (error) throw error;
        return data || [];
      } else {
        // Use snapshot RPC for historical weeks (always alltime)
        const [year, week] = selectedWeek.split("-").map(Number);
        const { data, error } = await (supabase as any).rpc(
          "get_leaderboard_data",
          {
            p_limit: 50,
            p_week_number: week,
            p_week_year: year,
          }
        );
        if (error) throw error;
        return data || [];
      }
    },
    initialData: selectedWeek === "current" ? initialData : undefined,
    staleTime: 60_000,
  });

  // React Query: Fetch team leaderboard data
  const { data: rawTeamDbData = initialTeamData, isPending: teamLoading } =
    useQuery({
      queryKey: ["leaderboard", "teams", selectedWeek],
      queryFn: async () => {
        if (selectedWeek === "current") {
          // Use live RPC for current week (real-time, no snapshots)
          const { data, error } = await (supabase as any).rpc(
            "get_live_team_leaderboard_data",
            { p_limit: 50 }
          );
          if (error) throw error;
          return data || [];
        } else {
          // Use snapshot RPC for historical weeks
          const [year, week] = selectedWeek.split("-").map(Number);
          const { data, error } = await (supabase as any).rpc(
            "get_team_leaderboard_data",
            {
              p_limit: 50,
              p_week_number: week,
              p_week_year: year,
            }
          );
          if (error) throw error;
          return data || [];
        }
      },
      initialData: selectedWeek === "current" ? initialTeamData : undefined,
      staleTime: 60_000,
    });

  // Stable string key for streak user IDs (avoids new array reference every render)
  const streakUserIds = useMemo(
    () => rawDbData?.map((e: any) => e.user_id)?.join(",") ?? "",
    [rawDbData]
  );

  // React Query: Fetch streaks for current leaderboard data
  const { data: userStreaks = new Map(), isPending: streaksLoading } = useQuery(
    {
      queryKey: ["leaderboard", "streaks", streakUserIds],
      queryFn: async () => {
        const userIds = streakUserIds.split(",").filter(Boolean);
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
      staleTime: 60_000,
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

  // Most improved user this week (highest percentage XP gain)
  const mostImproved = useMemo(() => {
    if (!leaderboardData?.length) return null;
    return (
      leaderboardData
        .filter((e: LeaderboardEntry) => e.xp.change > 0)
        .sort((a: LeaderboardEntry, b: LeaderboardEntry) => {
          const prevA = a.xp.current - a.xp.change;
          const prevB = b.xp.current - b.xp.change;
          // If previous XP was 0 (brand new), cap percentage at the absolute change value
          const pctA = prevA > 0 ? (a.xp.change / prevA) * 100 : a.xp.change;
          const pctB = prevB > 0 ? (b.xp.change / prevB) * 100 : b.xp.change;
          // Tie-break by absolute change
          if (pctB !== pctA) return pctB - pctA;
          return b.xp.change - a.xp.change;
        })[0] ?? null
    );
  }, [leaderboardData]);

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
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            )}
            <Select value={selectedWeek} onValueChange={setSelectedWeek}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select week" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Current Week</SelectItem>
                {currentWeeks.map((week) => {
                  const start = new Date(week.week_start + "T00:00:00");
                  const end = new Date(week.week_end + "T00:00:00");
                  const fmt = (d: Date) =>
                    d.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                  const count = week.user_count ?? week.team_count;
                  const label = activeTab === "individual" ? "users" : "teams";
                  return (
                    <SelectItem
                      key={`${week.week_year}-${week.week_number}`}
                      value={`${week.week_year}-${week.week_number}`}
                    >
                      {fmt(start)}–{fmt(end)} ({count} {label})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Tabs>

      {/* Context label */}
      <p className="text-muted-foreground text-xs">
        {selectedWeek === "current"
          ? "Live rankings — changes since last Monday"
          : (() => {
              const week = currentWeeks.find(
                (w) => `${w.week_year}-${w.week_number}` === selectedWeek
              );
              if (!week) return "Historical snapshot";
              const start = new Date(week.week_start + "T00:00:00");
              const end = new Date(week.week_end + "T00:00:00");
              const fmt = (d: Date) =>
                d.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              return `Snapshot from ${fmt(start)}–${fmt(end)}`;
            })()}
      </p>

      {/* Most Improved — only show for current week */}
      {activeTab === "individual" &&
        selectedWeek === "current" &&
        mostImproved &&
        mostImproved.xp.change > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-200/50 bg-gradient-to-r from-amber-50 to-transparent p-3 dark:from-amber-950/20">
            <Flame className="h-5 w-5 text-amber-500" />
            <div>
              <span className="text-sm font-medium">
                {mostImproved.user.name}
              </span>
              <span className="text-muted-foreground ml-2 text-xs">
                Most improved this week — +
                {mostImproved.xp.change.toLocaleString()} XP
              </span>
            </div>
          </div>
        )}

      {/* Individual Leaderboard */}
      {activeTab === "individual" && (
        <Card className="border-none shadow-none">
          <CardContent className="p-0">
            {/* Desktop table (sm+) */}
            <div className="hidden overflow-x-auto sm:block">
              <div
                className="border-border text-muted-foreground grid min-w-[700px] gap-4 border-b p-4 text-sm font-medium"
                style={{
                  gridTemplateColumns: "80px 200px 1fr 1fr 1fr 1fr 100px",
                }}
              >
                <div>Rank</div>
                <div>User</div>
                <div>XP</div>
                <div>Tasks</div>
                <div>Reviews</div>
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
                    className="text-muted-foreground p-8 text-center"
                  >
                    {selectedWeek === "current" ? (
                      <p>No leaderboard data available yet.</p>
                    ) : (
                      <>
                        <p>No data available for this week.</p>
                        <p className="mt-1 text-sm">
                          Weekly snapshots will be generated automatically.
                        </p>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile cards (<sm) */}
            <div className="block sm:hidden">
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div
                    key="skeleton-mobile"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-6"
                  >
                    <LeaderboardSkeleton />
                  </motion.div>
                ) : leaderboardData.length > 0 ? (
                  <motion.div
                    key="data-mobile"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <AnimatePresence mode="popLayout">
                      {leaderboardData.map(
                        (item: LeaderboardEntry, index: number) => (
                          <LeaderboardMobileRow
                            key={`mobile-${item.user.name}-${item.rank}`}
                            entry={item}
                            index={index}
                          />
                        )
                      )}
                    </AnimatePresence>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty-mobile"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-muted-foreground p-8 text-center"
                  >
                    <p>No leaderboard data available yet.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Leaderboard */}
      {activeTab === "teams" && (
        <Card className="border-none shadow-none">
          <CardContent className="p-0">
            {/* Desktop table (sm+) */}
            <div className="hidden overflow-x-auto sm:block">
              <div
                className="border-border text-muted-foreground grid min-w-[700px] gap-4 border-b p-4 text-sm font-medium"
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
                    className="text-muted-foreground p-8 text-center"
                  >
                    {selectedWeek === "current" ? (
                      <p>No team leaderboard data available yet.</p>
                    ) : (
                      <>
                        <p>No team data available for this week.</p>
                        <p className="mt-1 text-sm">
                          Weekly snapshots will be generated automatically.
                        </p>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile cards (<sm) */}
            <div className="block sm:hidden">
              <AnimatePresence mode="wait">
                {teamLoading ? (
                  <motion.div
                    key="team-skeleton-mobile"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-6"
                  >
                    <LeaderboardSkeleton />
                  </motion.div>
                ) : teamLeaderboardData.length > 0 ? (
                  <motion.div
                    key="team-data-mobile"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <AnimatePresence mode="popLayout">
                      {teamLeaderboardData.map(
                        (item: TeamLeaderboardEntry, index: number) => (
                          <TeamLeaderboardMobileRow
                            key={`team-mobile-${item.team.name}-${item.rank}`}
                            entry={item}
                            index={index}
                          />
                        )
                      )}
                    </AnimatePresence>
                  </motion.div>
                ) : (
                  <motion.div
                    key="team-empty-mobile"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-muted-foreground p-8 text-center"
                  >
                    <p>No team leaderboard data available yet.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
