import {
  getServerSideLeaderboardData,
  getServerSideAvailableWeeks,
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

  // Fetch initial data server-side
  const initialLeaderboardData = await getServerSideLeaderboardData();
  const availableWeeks = await getServerSideAvailableWeeks();

  return (
    <LeaderboardPageClient
      initialData={initialLeaderboardData}
      availableWeeks={availableWeeks}
      currentUserId={user?.id}
    />
  );
}
