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

  const [journeys, profile] = await Promise.all([
    getJourneySettings(),
    user?.id
      ? supabase
          .from("users")
          .select("primary_role")
          .eq("id", user.id)
          .single()
          .then(({ data }) => data)
      : Promise.resolve(null),
  ]);

  // Admins get both economies prefetched regardless of the current phase.
  const isAdmin = profile?.primary_role === "admin";
  const prefetchMyJourney = isAdmin || journeys.myJourney;
  const prefetchTeamJourney = isAdmin || journeys.teamJourney;

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
      isAdmin={isAdmin}
    />
  );
}
