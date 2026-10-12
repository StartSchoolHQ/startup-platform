"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Compass, Lock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AchievementsGrid } from "@/components/journey/achievements-grid";
import { TasksTable } from "@/components/team-journey/tasks-table";
import { TeamTaskFilters } from "@/components/team-journey/detail/team-task-filters";
import { MEETINGS_TO_UNLOCK } from "@/hooks/use-team-detail";
import type { TeamDetailMember } from "@/hooks/use-team-detail";
import {
  taskFilterCategory,
  toTaskTableItem,
  type TaskFilterStatus,
  type TeamDetailTask,
} from "@/lib/team-journey/detail-transforms";

function TableSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b px-4 py-4">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="ml-auto h-6 w-16 rounded-full" />
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      ))}
    </div>
  );
}

/**
 * The Tasks section of the team page in My Journey's shape: achievement
 * cards that filter the table and scroll it into view (Sasha SMP-21), a
 * small status/assignee toolbar, the shared TasksTable. One "How it works"
 * link replaces the four dead "Read About" buttons (SMP-12).
 */
export function TeamTasksSection({
  id,
  achievements,
  tasks,
  loading,
  unlocked,
  meetingsCount,
  isTeamMember,
  members,
  currentUserId,
  onAssign,
  onStart,
}: {
  id: string;
  achievements: any[];
  tasks: TeamDetailTask[];
  loading: boolean;
  unlocked: boolean;
  meetingsCount: number;
  isTeamMember: boolean;
  members: TeamDetailMember[];
  currentUserId: string | undefined;
  onAssign: (taskId: string, userId: string) => void;
  onStart: (taskId: string) => void;
}) {
  const [achievementId, setAchievementId] = useState<string | null>(null);
  const [status, setStatus] = useState<TaskFilterStatus>("all");
  const [assignee, setAssignee] = useState("all");
  const tableRef = useRef<HTMLDivElement>(null);
  const [scrollRequest, setScrollRequest] = useState(0);

  const selectAchievement = (next: string | null) => {
    if (!unlocked) return;
    setAchievementId(next);
    if (next) setScrollRequest((n) => n + 1);
  };
  useEffect(() => {
    if (scrollRequest === 0) return;
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [scrollRequest]);

  const filtered = useMemo(
    () =>
      tasks.filter(
        (t) =>
          (!achievementId || t.achievement_id === achievementId) &&
          (status === "all" || taskFilterCategory(t) === status) &&
          (assignee === "all" || t.assigned_to_user_id === assignee)
      ),
    [tasks, achievementId, status, assignee]
  );

  const completed = achievements.filter((a) => a.status === "completed").length;
  const missing = Math.max(MEETINGS_TO_UNLOCK - meetingsCount, 0);
  const lockedText = isTeamMember
    ? `Log ${missing} more client ${missing === 1 ? "meeting" : "meetings"} to unlock tasks (${meetingsCount} of ${MEETINGS_TO_UNLOCK} so far).`
    : "This team has not logged enough client meetings to unlock tasks yet.";

  return (
    <section id={id} className="scroll-mt-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Tasks</h2>
          <p className="text-muted-foreground text-sm">
            {achievements.length > 0
              ? `${completed} of ${achievements.length} achievements finished`
              : "Team tasks grouped by achievement"}
          </p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/how-it-works">
            <Compass className="h-4 w-4" />
            How it works
          </Link>
        </Button>
      </div>

      {!loading && !unlocked && (
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertTitle>Tasks are locked</AlertTitle>
          <AlertDescription>{lockedText}</AlertDescription>
        </Alert>
      )}

      <AchievementsGrid
        economy="team"
        achievements={achievements.map((a) => ({
          ...a,
          points_reward: a.credits_reward,
          icon: a.icon ?? a.achievement_icon ?? null,
        }))}
        loading={loading}
        selectedId={achievementId}
        onSelect={selectAchievement}
        emptyText="No achievements available for this team"
        locked={!unlocked}
        lockedDescription={
          isTeamMember
            ? `${missing} more client ${missing === 1 ? "meeting" : "meetings"} to go`
            : "Locked until more client meetings"
        }
        lockedTooltip={lockedText}
        cardOverride={(a) =>
          a.achievement_name === "Recurring Tasks"
            ? {
                description: "Weekly recurring team tasks",
                status: "in-progress",
              }
            : undefined
        }
        showFilterBanner={false}
      />

      <div ref={tableRef} className="scroll-mt-6 space-y-4">
        {unlocked && !loading && (
          <TeamTaskFilters
            status={status}
            onStatus={setStatus}
            assignee={assignee}
            onAssignee={setAssignee}
            members={members.map((m) => ({
              user_id: m.user_id,
              name: m.users?.name || "Unknown",
            }))}
            onClear={() => {
              setAchievementId(null);
              setStatus("all");
              setAssignee("all");
            }}
          />
        )}

        {loading ? (
          <TableSkeleton />
        ) : !unlocked ? null : filtered.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center">
            {achievementId || status !== "all" || assignee !== "all"
              ? "No tasks match these filters"
              : "No tasks available for this team yet."}
          </div>
        ) : (
          <TasksTable
            economy="team"
            isTeamMember={isTeamMember}
            currentUserId={currentUserId}
            tasks={filtered.map(toTaskTableItem)}
            teamMembers={members.map((m) => ({
              id: m.user_id,
              name: m.users?.name || "Unknown",
              avatar: m.users?.avatar_url || "/avatars/john-doe.jpg",
            }))}
            onAssignTask={onAssign}
            onStartTask={onStart}
          />
        )}
      </div>
    </section>
  );
}
