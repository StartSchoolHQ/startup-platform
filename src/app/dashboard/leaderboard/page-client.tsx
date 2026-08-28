"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeaderboardSkeleton } from "@/components/leaderboard/leaderboard-skeleton";
import { MyJourneyBoard } from "@/components/leaderboard/my-journey-board";
import { TeamJourneyBoard } from "@/components/leaderboard/team-journey-board";
import { type AvailableWeek } from "@/hooks/use-leaderboard-weeks";
import { usePlatformSettings } from "@/hooks/use-platform-settings";
import { useApp } from "@/contexts/app-context";
import {
  type LeaderboardEntry as DBLeaderboardEntry,
  type MyJourneyLeaderboardRow as DBMyJourneyEntry,
  type TeamLeaderboardEntry as DBTeamLeaderboardEntry,
} from "@/lib/leaderboard-server";

type TopTab = "my_journey" | "team_journey";

interface LeaderboardPageClientProps {
  initialMyJourneyData: DBMyJourneyEntry[];
  initialMembersData: DBLeaderboardEntry[];
  availableWeeks: AvailableWeek[];
  initialTeamData: DBTeamLeaderboardEntry[];
  teamAvailableWeeks: AvailableWeek[];
  currentUserId?: string;
  userTeamIds?: string[];
}

export default function LeaderboardPageClient({
  initialMyJourneyData,
  initialMembersData,
  availableWeeks,
  initialTeamData,
  teamAvailableWeeks,
  currentUserId,
  userTeamIds,
}: LeaderboardPageClientProps) {
  const { user, loading: userLoading } = useApp();
  const { data: journeys, isLoading: journeysLoading } = usePlatformSettings();

  const isAdmin = user?.primary_role === "admin";
  // Admins always see both boards, whatever phase the platform is in.
  const showMyJourney = isAdmin || journeys.myJourney;
  const showTeamJourney = isAdmin || journeys.teamJourney;
  const showTabs = showMyJourney && showTeamJourney;

  const defaultTab: TopTab = showTeamJourney ? "team_journey" : "my_journey";
  const [tab, setTab] = useState<TopTab | null>(null);
  const activeTab = tab ?? defaultTab;

  // Never flash the wrong board while settings/profile are still loading.
  const settingsPending = journeysLoading || userLoading;

  const title =
    settingsPending || showTabs
      ? "Leaderboard"
      : showMyJourney
        ? "My Journey Leaderboard"
        : "Team Journey Leaderboard";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-muted-foreground">
          Compete with others and track your progress
        </p>
      </div>

      {settingsPending ? (
        <LeaderboardSkeleton />
      ) : (
        <>
          {showTabs && (
            <Tabs value={activeTab} onValueChange={(v) => setTab(v as TopTab)}>
              <TabsList>
                <TabsTrigger value="my_journey">My Journey</TabsTrigger>
                <TabsTrigger value="team_journey">Team Journey</TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {activeTab === "my_journey" && showMyJourney ? (
            <MyJourneyBoard
              initialData={initialMyJourneyData}
              currentUserId={currentUserId}
            />
          ) : (
            <TeamJourneyBoard
              initialTeamData={initialTeamData}
              initialMembersData={initialMembersData}
              availableWeeks={availableWeeks}
              teamAvailableWeeks={teamAvailableWeeks}
              currentUserId={currentUserId}
              userTeamIds={userTeamIds}
            />
          )}
        </>
      )}
    </div>
  );
}
