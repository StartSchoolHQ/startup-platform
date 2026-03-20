import {
  getServerSideLiveLeaderboardData,
  getServerSideAvailableWeeks,
  getServerSideLiveTeamLeaderboardData,
  getServerSideTeamAvailableWeeks,
  getServerSideUserTeamIds,
} from "@/lib/leaderboard-server";
import LeaderboardPageClient from "./page-client";
import { createClient } from "@/lib/supabase/server";

// Cache leaderboard for 60 seconds (reduces DB load by ~96%)
export const revalidate = 60;

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch initial data server-side (individual + team in parallel)
  const [
    initialLeaderboardData,
    availableWeeks,
    initialTeamData,
    teamAvailableWeeks,
    userTeamIds,
  ] = await Promise.all([
    getServerSideLiveLeaderboardData(),
    getServerSideAvailableWeeks(),
    getServerSideLiveTeamLeaderboardData(),
    getServerSideTeamAvailableWeeks(),
    user?.id ? getServerSideUserTeamIds(user.id) : Promise.resolve([]),
  ]);

  return (
    <LeaderboardPageClient
      initialData={initialLeaderboardData}
      availableWeeks={availableWeeks}
      initialTeamData={initialTeamData}
      teamAvailableWeeks={teamAvailableWeeks}
      currentUserId={user?.id}
      userTeamIds={userTeamIds}
    />
  );
}
