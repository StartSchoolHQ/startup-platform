"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MembersBoard } from "@/components/leaderboard/members-board";
import { TeamsBoard } from "@/components/leaderboard/teams-board";
import {
  useMemberAvailableWeeks,
  useTeamAvailableWeeks,
  type AvailableWeek,
} from "@/hooks/use-leaderboard-weeks";
import {
  type LeaderboardEntry as DBLeaderboardEntry,
  type TeamLeaderboardEntry as DBTeamLeaderboardEntry,
} from "@/lib/leaderboard-server";

type SubTab = "teams" | "members";

const formatDay = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

interface TeamJourneyBoardProps {
  initialTeamData: DBTeamLeaderboardEntry[];
  initialMembersData: DBLeaderboardEntry[];
  availableWeeks: AvailableWeek[];
  teamAvailableWeeks: AvailableWeek[];
  currentUserId?: string;
  userTeamIds?: string[];
}

/** Team Journey economy: Teams | Members sub-boards sharing a week selector. */
export function TeamJourneyBoard({
  initialTeamData,
  initialMembersData,
  availableWeeks: initialAvailableWeeks,
  teamAvailableWeeks: initialTeamAvailableWeeks,
  currentUserId,
  userTeamIds,
}: TeamJourneyBoardProps) {
  const [subTab, setSubTab] = useState<SubTab>("teams");
  const [selectedWeek, setSelectedWeek] = useState<string>("current");

  // Reset week selector when switching boards to avoid mismatched weeks
  const handleSubTabChange = (value: string) => {
    setSubTab(value as SubTab);
    setSelectedWeek("current");
  };

  const { data: memberWeeks = initialAvailableWeeks } = useMemberAvailableWeeks(
    initialAvailableWeeks
  );
  const { data: teamWeeks = initialTeamAvailableWeeks } = useTeamAvailableWeeks(
    initialTeamAvailableWeeks
  );

  const currentWeeks = subTab === "teams" ? teamWeeks : memberWeeks;
  const selected = currentWeeks.find(
    (w) => `${w.week_year}-${w.week_number}` === selectedWeek
  );

  return (
    <div className="space-y-6">
      <Tabs value={subTab} onValueChange={handleSubTabChange}>
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
          </TabsList>

          <Select value={selectedWeek} onValueChange={setSelectedWeek}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select week" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current Week</SelectItem>
              {currentWeeks.map((week) => {
                const start = new Date(week.week_start + "T00:00:00");
                const end = new Date(week.week_end + "T00:00:00");
                const count = week.user_count ?? week.team_count;
                const label = subTab === "teams" ? "teams" : "users";
                return (
                  <SelectItem
                    key={`${week.week_year}-${week.week_number}`}
                    value={`${week.week_year}-${week.week_number}`}
                  >
                    {formatDay(start)}–{formatDay(end)} ({count} {label})
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </Tabs>

      {/* Context label */}
      <p className="text-muted-foreground text-xs">
        {selectedWeek === "current"
          ? "Live rankings — changes since last Monday"
          : selected
            ? `Snapshot from ${formatDay(
                new Date(selected.week_start + "T00:00:00")
              )}–${formatDay(new Date(selected.week_end + "T00:00:00"))}`
            : "Historical snapshot"}
      </p>

      {subTab === "teams" ? (
        <TeamsBoard
          initialData={initialTeamData}
          selectedWeek={selectedWeek}
          userTeamIds={userTeamIds}
        />
      ) : (
        <MembersBoard
          initialData={initialMembersData}
          selectedWeek={selectedWeek}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
}
