"use client";

import { type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { LeaderboardSkeleton } from "@/components/leaderboard/leaderboard-skeleton";

interface LeaderboardBoardShellProps {
  /** CSS grid template shared by the header row and the desktop rows. */
  gridColumns: string;
  /** Header cells of the desktop table, in order. */
  headerCells: ReactNode;
  loading: boolean;
  isEmpty: boolean;
  desktopEmpty: ReactNode;
  mobileEmpty: ReactNode;
  desktopRows: ReactNode;
  mobileRows: ReactNode;
  /** Optional slot above the table (e.g. the streaks loading indicator). */
  topSlot?: ReactNode;
}

/**
 * Card + desktop table + mobile card list scaffolding shared by the teams and
 * members boards. Markup and motion props are identical to what each board
 * rendered inline before the extraction.
 */
export function LeaderboardBoardShell({
  gridColumns,
  headerCells,
  loading,
  isEmpty,
  desktopEmpty,
  mobileEmpty,
  desktopRows,
  mobileRows,
  topSlot,
}: LeaderboardBoardShellProps) {
  return (
    <Card className="border-none shadow-none">
      <CardContent className="p-0">
        {topSlot}

        {/* Desktop table (sm+) */}
        <div className="hidden overflow-x-auto sm:block">
          <div
            className="border-border text-muted-foreground grid min-w-[700px] gap-4 border-b p-4 text-sm font-medium"
            style={{ gridTemplateColumns: gridColumns }}
          >
            {headerCells}
          </div>

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="p-6"
              >
                <LeaderboardSkeleton />
              </motion.div>
            ) : !isEmpty ? (
              <motion.div
                key="data"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <AnimatePresence mode="popLayout">
                  {desktopRows}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="text-muted-foreground p-8 text-center"
              >
                {desktopEmpty}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile cards (<sm) */}
        <div className="block sm:hidden">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="skeleton-mobile"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-6"
              >
                <LeaderboardSkeleton />
              </motion.div>
            ) : !isEmpty ? (
              <motion.div
                key="data-mobile"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <AnimatePresence mode="popLayout">{mobileRows}</AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                key="empty-mobile"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-muted-foreground p-8 text-center"
              >
                {mobileEmpty}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
