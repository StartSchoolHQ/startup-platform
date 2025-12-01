import {
  getServerSideLeaderboardData,
  getServerSideAvailableWeeks,
} from "@/lib/leaderboard-server";
import LeaderboardPageClient from "./page-client";
import { createClient } from "@/lib/supabase/server";

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
