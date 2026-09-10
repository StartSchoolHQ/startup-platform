import {
  getServerSideAvailableWeeks,
  getServerSideLiveTeamLeaderboardData,
  getServerSideMyJourneyLeaderboard,
  getServerSideTeamAvailableWeeks,
  getServerSideTeamMembersLeaderboard,
  getServerSideUserTeamIds,
} from "@/lib/leaderboard-server";
import LeaderboardPageClient from "./page-client";
import { createClient } from "@/lib/supabase/server";
import { getJourneySettings } from "@/lib/platform-settings";

// Cache leaderboard for 60 seconds (reduces DB load by ~96%)
export const revalidate = 60;

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const journeys = await getJourneySettings();

  // Boards follow the programme phase for everyone, admins included.
  const prefetchMyJourney = journeys.myJourney;
  const prefetchTeamJourney = journeys.teamJourney;

  const [
    initialMyJourneyData,
    initialMembersData,
    availableWeeks,
    initialTeamData,
    teamAvailableWeeks,
    userTeamIds,
  ] = await Promise.all([
    prefetchMyJourney ? getServerSideMyJourneyLeaderboard() : [],
    prefetchTeamJourney ? getServerSideTeamMembersLeaderboard() : [],
    prefetchTeamJourney ? getServerSideAvailableWeeks() : [],
    prefetchTeamJourney ? getServerSideLiveTeamLeaderboardData() : [],
    prefetchTeamJourney ? getServerSideTeamAvailableWeeks() : [],
    user?.id && prefetchTeamJourney
      ? getServerSideUserTeamIds(user.id)
      : Promise.resolve([]),
  ]);

  return (
    <LeaderboardPageClient
      initialMyJourneyData={initialMyJourneyData}
      initialMembersData={initialMembersData}
      availableWeeks={availableWeeks}
      initialTeamData={initialTeamData}
      teamAvailableWeeks={teamAvailableWeeks}
      currentUserId={user?.id}
      userTeamIds={userTeamIds}
      initialJourneys={journeys}
    />
  );
}
