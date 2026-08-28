"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeaderboardSkeleton } from "@/components/leaderboard/leaderboard-skeleton";
import { MyJourneyBoard } from "@/components/leaderboard/my-journey-board";
import { TeamJourneyBoard } from "@/components/leaderboard/team-journey-board";
import { type AvailableWeek } from "@/hooks/use-leaderboard-weeks";
import {
  usePlatformSettings,
  type JourneySettings,
} from "@/hooks/use-platform-settings";
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
  /** Journey flags read on the server — drive the first (SSR) render. */
  initialJourneys?: JourneySettings;
  /** Caller's admin flag read on the server — drive the first (SSR) render. */
  isAdmin?: boolean;
}

export default function LeaderboardPageClient({
  initialMyJourneyData,
  initialMembersData,
  availableWeeks,
  initialTeamData,
  teamAvailableWeeks,
  currentUserId,
  userTeamIds,
  initialJourneys,
  isAdmin: initialIsAdmin = false,
}: LeaderboardPageClientProps) {
  const { user } = useApp();
  const {
    data: journeys,
    isLoading: journeysLoading,
    isError: journeysError,
  } = usePlatformSettings();

  // Server settings drive SSR and the first client render (so the HTML is a
  // real board, not a skeleton); the live query refines once it has settled.
  const journeysSettled = !journeysLoading && !journeysError;
  const effectiveJourneys = journeysSettled ? journeys : initialJourneys;

  const isAdmin = initialIsAdmin || user?.primary_role === "admin";
  // Admins always see both boards, whatever phase the platform is in.
  const showMyJourney =
    !!effectiveJourneys && (isAdmin || effectiveJourneys.myJourney);
  const showTeamJourney =
    !!effectiveJourneys && (isAdmin || effectiveJourneys.teamJourney);
  const showTabs = showMyJourney && showTeamJourney;

  const defaultTab: TopTab = showTeamJourney ? "team_journey" : "my_journey";
  const [tab, setTab] = useState<TopTab | null>(null);
  const requestedTab = tab ?? defaultTab;

  // Never land on a board the viewer may not see (phase flipped mid-session,
  // or neither journey is enabled — then there is no board at all).
  const activeTab: TopTab | null =
    requestedTab === "my_journey" && showMyJourney
      ? "my_journey"
      : showTeamJourney
        ? "team_journey"
        : showMyJourney
          ? "my_journey"
          : null;

  // Only defensive: the server always supplies `initialJourneys`.
  const settingsPending = !effectiveJourneys;

  const title =
    settingsPending || showTabs || (!showMyJourney && !showTeamJourney)
      ? "Leaderboard"
      : showMyJourney
        ? "My Journey Leaderboard"
        : "Team Journey Leaderboard";

  const renderBoard = () => {
    if (activeTab === "my_journey") {
      return (
        <MyJourneyBoard
          initialData={initialMyJourneyData}
          currentUserId={currentUserId}
        />
      );
    }

    if (activeTab === "team_journey") {
      return (
        <TeamJourneyBoard
          initialTeamData={initialTeamData}
          initialMembersData={initialMembersData}
          availableWeeks={availableWeeks}
          teamAvailableWeeks={teamAvailableWeeks}
          currentUserId={currentUserId}
          userTeamIds={userTeamIds}
        />
      );
    }

    return (
      <Card className="border-none shadow-none">
        <CardContent className="text-muted-foreground p-8 text-center">
          <p>No leaderboard is available right now.</p>
          <p className="mt-1 text-sm">
            Boards appear once a programme phase is active.
          </p>
        </CardContent>
      </Card>
    );
  };

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
            <Tabs
              value={activeTab ?? undefined}
              onValueChange={(v) => setTab(v as TopTab)}
            >
              <TabsList>
                <TabsTrigger value="my_journey">My Journey</TabsTrigger>
                <TabsTrigger value="team_journey">Team Journey</TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {renderBoard()}
        </>
      )}
    </div>
  );
}
