"use client";

import { useState, useEffect } from "react";
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

// Helper function to convert database entry to UI format
function convertToLeaderboardEntry(
  dbEntry: DBLeaderboardEntry,
  currentUserId?: string,
  userStreaks?: Map<string, { days: number; type: "active" | "warning" | "inactive" }>
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

  const teamText = dbEntry.team_count === 0 ? "No Teams" : 
                  dbEntry.team_count === 1 ? "1 Team" : 
                  `${dbEntry.team_count} Teams`;

  // Get real streak data from API
  const userStreak = userStreaks?.get(dbEntry.user_id) || { days: 0, type: "inactive" as const };

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
  currentUserId 
}: LeaderboardPageClientProps) {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [availableWeeks, setAvailableWeeks] = useState<AvailableWeek[]>(initialAvailableWeeks);
  const [selectedWeek, setSelectedWeek] = useState<string>("current");
  const [loading, setLoading] = useState(false);
  const [streaksLoading, setStreaksLoading] = useState(false);
  const [userStreaks, setUserStreaks] = useState<Map<string, { days: number; type: "active" | "warning" | "inactive" }>>(new Map());
  const [rawDbData, setRawDbData] = useState<DBLeaderboardEntry[]>(initialData);
  
  const supabase = createClient();

  // Function to fetch streaks from API
  const fetchStreaks = async (userIds: string[]) => {
    if (userIds.length === 0) return new Map();
    
    setStreaksLoading(true);
    try {
      const response = await fetch('/api/leaderboard/streaks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userIds }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch streaks');
      }
      
      const { streaks } = await response.json();
      return new Map(Object.entries(streaks));
    } catch (error) {
      console.error('Error fetching streaks:', error);
      return new Map();
    } finally {
      setStreaksLoading(false);
    }
  };

  // Initialize with server-side data and load streaks
  useEffect(() => {
    const initializeData = async () => {
      setRawDbData(initialData);
      
      // Fetch streaks for initial data first
      const userIds = initialData.map(entry => entry.user_id);
      const streaksData = await fetchStreaks(userIds);
      setUserStreaks(streaksData);
      
      // Transform data with the fetched streaks
      const transformedData = initialData.map((entry) =>
        convertToLeaderboardEntry(entry, currentUserId, streaksData)
      );
      setLeaderboardData(transformedData);
    };
    
    initializeData();
  }, [initialData, currentUserId]);

  // Re-transform data when streaks update
  useEffect(() => {
    if (rawDbData.length > 0) {
      const transformedData = rawDbData.map((entry) =>
        convertToLeaderboardEntry(entry, currentUserId, userStreaks)
      );
      setLeaderboardData(transformedData);
    }
  }, [userStreaks, rawDbData, currentUserId]);

  // Fetch available weeks
  useEffect(() => {
    async function fetchAvailableWeeks() {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from("leaderboard_snapshots")
          .select("week_number, week_year")
          .order("week_year", { ascending: false })
          .order("week_number", { ascending: false });

        if (error) throw error;

        if (data) {
          // Group by week and create available weeks list
          const weekMap = new Map<string, { week_number: number; week_year: number; user_count: number }>();
          data.forEach((snapshot: { week_year: number; week_number: number }) => {
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
          });

          const weeks = Array.from(weekMap.values()).map((week) => {
            // Simple week boundary calculation
            const startOfYear = new Date(week.week_year, 0, 1);
            const daysOffset = (week.week_number - 1) * 7;
            const weekStart = new Date(startOfYear.getTime() + daysOffset * 24 * 60 * 60 * 1000);
            const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);

            return {
              ...week,
              week_start: weekStart.toISOString().split('T')[0],
              week_end: weekEnd.toISOString().split('T')[0],
            };
          });

          setAvailableWeeks(weeks);
        }
      } catch (error) {
        console.error("Error fetching available weeks:", error);
      }
    }

    fetchAvailableWeeks();
  }, [supabase]);

  // Fetch leaderboard data
  useEffect(() => {
    async function fetchLeaderboardData() {
      setLoading(true);
      try {
        let weekNumber: number | undefined;
        let weekYear: number | undefined;

        if (selectedWeek !== "current") {
          const [year, week] = selectedWeek.split("-").map(Number);
          weekYear = year;
          weekNumber = week;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any).rpc("get_leaderboard_data", {
          p_limit: 50,
          p_week_number: weekNumber || null,
          p_week_year: weekYear || null,
        });

        if (error) throw error;

        // Store raw data first
        setRawDbData(data || []);
        
        // Fetch streaks for new data
        const userIds = (data || []).map((entry: DBLeaderboardEntry) => entry.user_id);
        const streaks = await fetchStreaks(userIds);
        setUserStreaks(streaks);
        
        // Transform data with streaks (this will be handled by useEffect)
      } catch (error) {
        console.error("Error fetching leaderboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboardData();
  }, [selectedWeek, currentUserId, supabase]);



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
                Week {week.week_number}, {week.week_year} ({week.user_count} users)
              </SelectItem>
            ))}
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
            {loading ? (
              <div className="p-6">
                <LeaderboardSkeleton />
              </div>
            ) : leaderboardData.length > 0 ? (
              leaderboardData.map((item) => (
                <LeaderboardRow key={item.rank} entry={item} />
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <p>No leaderboard data available for this week.</p>
                <p className="text-sm mt-1">Weekly snapshots will be generated automatically.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}