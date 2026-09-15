"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { LeaderboardSkeleton } from "@/components/leaderboard/leaderboard-skeleton";
import { LEADERBOARD_HEADER_CLASS } from "@/components/leaderboard/leaderboard-board-shell";
import { convertToMyJourneyEntry } from "@/components/leaderboard/mappers";
import { type MyJourneyLeaderboardRow as DBMyJourneyEntry } from "@/lib/leaderboard-server";
import { createClient } from "@/lib/supabase/client";
import { economyLabels } from "@/lib/economy-labels";
import {
  MyJourneyRow,
  MY_JOURNEY_GRID_COLUMNS,
} from "@/components/leaderboard/my-journey-row";
import { ProfileCardDialog } from "@/components/profile/profile-card-dialog";

/** My Journey (solo economy) board — live only, no weekly snapshots. */
export function MyJourneyBoard({
  initialData,
  currentUserId,
}: {
  initialData: DBMyJourneyEntry[];
  currentUserId?: string;
}) {
  const supabase = createClient();
  const labels = economyLabels("my_journey");
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  const { data: rawData = initialData, isPending: loading } = useQuery({
    queryKey: ["leaderboard", "myJourney"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc(
        "get_live_my_journey_leaderboard_v1",
        { p_limit: null } // null = show all students (admins excluded in RPC)
      );
      if (error) throw error;
      return data || [];
    },
    initialData,
    staleTime: 60_000,
  });

  const entries = useMemo(
    () =>
      (rawData as DBMyJourneyEntry[]).map((entry) =>
        convertToMyJourneyEntry(entry, currentUserId)
      ),
    [rawData, currentUserId]
  );

  return (
    <div className="bg-card overflow-hidden rounded-xl border">
      <div className="overflow-x-auto">
        <div
          className={`${LEADERBOARD_HEADER_CLASS} hidden min-w-[640px] sm:grid`}
          style={{ gridTemplateColumns: MY_JOURNEY_GRID_COLUMNS }}
        >
          <div>Rank</div>
          <div>Student</div>
          <div>{labels.xp}</div>
          <div>{labels.points}</div>
          <div>Tasks done</div>
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="my-journey-skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="p-6"
            >
              <LeaderboardSkeleton />
            </motion.div>
          ) : entries.length > 0 ? (
            <motion.div
              key="my-journey-data"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {entries.map((item) => (
                <MyJourneyRow
                  key={item.user.userId}
                  entry={item}
                  onOpenProfile={setProfileUserId}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="my-journey-empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-muted-foreground p-8 text-center"
            >
              <p>No {labels.xp} earned yet.</p>
              <p className="mt-1 text-sm">
                The board fills up as students complete their solo tasks.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <ProfileCardDialog
        userId={profileUserId}
        onClose={() => setProfileUserId(null)}
      />
    </div>
  );
}
