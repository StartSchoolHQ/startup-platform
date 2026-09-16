"use client";

import { StatsCardComponent } from "@/components/dashboard/stats-card";
import { AchievementsGrid } from "@/components/journey/achievements-grid";
import { MyJourneyHeader } from "@/components/journey/my-journey-header";
import { MyJourneyOverviewCards } from "@/components/journey/my-journey-overview-cards";
import { HowMyJourneyWorksCard } from "@/components/journey/my-journey-progress-cards";
import { TasksTable } from "@/components/team-journey/tasks-table";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { useAppContext } from "@/contexts/app-context";
import { MY_JOURNEY_OVERVIEW_KEY } from "@/hooks/use-my-journey-overview";
import { usePlatformSettings } from "@/hooks/use-platform-settings";
import {
  getMyJourneyRecurringStatus,
  getUserAchievementProgress,
  getUserIndividualTasks,
  getUserTasksVisible,
} from "@/lib/database";
import { economyLabels } from "@/lib/economy-labels";
import { isPhaseLockedError, phaseLocks } from "@/lib/my-journey-phase-lock";
import { buildMyJourneyTasks } from "@/lib/my-journey-tasks";
import { startTaskLazy } from "@/lib/tasks";
import { StatsCard } from "@/types/dashboard";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trophy, Zap } from "lucide-react";
import { redirect, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const labels = economyLabels("my_journey");

export default function MyJourneyPage() {
  const { user, loading: userLoading } = useAppContext();
  const {
    data: journeys,
    isLoading: journeysLoading,
    isError: journeysError,
  } = usePlatformSettings();
  const queryClient = useQueryClient();

  const searchParams = useSearchParams();
  const achievementParam = searchParams.get("achievement");

  // The student's own pick, remembered together with the URL it was made
  // under: a fresh `?achievement=<id>` link (the rings on the phase track
  // below set one) decides again until the next click on a card.
  const [picked, setPicked] = useState<{
    param: string | null;
    id: string | null;
  } | null>(null);

  const { data: availableTasksData = [], isPending: tasksPending } = useQuery({
    queryKey: ["myJourney", "availableTasks", user?.id],
    queryFn: () => getUserTasksVisible(user!.id),
    enabled: !!user?.id,
  });

  const { data: individualTasksData = [] } = useQuery({
    queryKey: ["myJourney", "individualTasks", user?.id],
    queryFn: () => getUserIndividualTasks(user!.id),
    enabled: !!user?.id,
  });

  // Cooldown state of the recurring solo tasks (the RPC reads auth.uid()).
  const { data: recurringData = [] } = useQuery({
    queryKey: ["myJourney", "recurring", user?.id],
    queryFn: () => getMyJourneyRecurringStatus(),
    enabled: !!user?.id,
  });

  const { data: achievementProgress = [], isPending: achievementsPending } =
    useQuery({
      queryKey: ["myJourney", "achievements", user?.id],
      queryFn: () => getUserAchievementProgress(user!.id),
      enabled: !!user?.id,
    });

  const userTasks = useMemo(
    () =>
      buildMyJourneyTasks(
        availableTasksData,
        individualTasksData,
        {
          name: user?.name ?? null,
          avatarUrl: user?.avatar_url ?? null,
        },
        recurringData
      ),
    [
      availableTasksData,
      individualTasksData,
      recurringData,
      user?.name,
      user?.avatar_url,
    ]
  );

  const achievements = useMemo(
    () =>
      (Array.isArray(achievementProgress) ? achievementProgress : []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (ach: any) => ({
          achievement_id: ach.achievement_id,
          achievement_name: ach.achievement_name,
          status: ach.status as string,
          xp_reward: ach.xp_reward || 0,
          points_reward: ach.points_reward || 0,
          completed_tasks: ach.completed_tasks || 0,
          total_tasks: ach.total_tasks || 0,
          color_theme: ach.color_theme ?? null,
          icon: ach.achievement_icon ?? null,
          sort_order: ach.sort_order ?? null,
          is_unlocked: ach.is_unlocked ?? null,
          always_unlocked: ach.always_unlocked ?? null,
        })
      ),
    [achievementProgress]
  );

  // Phase gate: which cards are locked and why (rule enforced in the DB).
  const locks = useMemo(() => phaseLocks(achievements), [achievements]);

  // The URL only counts until the student picks something under it, and only
  // when it names an achievement that actually loaded — a stale link must not
  // filter the task list down to nothing.
  const selectedAchievementId = useMemo(() => {
    if (picked && picked.param === achievementParam) return picked.id;
    return achievementParam &&
      achievements.some((a) => a.achievement_id === achievementParam)
      ? achievementParam
      : null;
  }, [picked, achievementParam, achievements]);

  const filteredTasks = useMemo(
    () =>
      selectedAchievementId
        ? userTasks.filter(
            (task) => task.achievement_id === selectedAchievementId
          )
        : userTasks,
    [selectedAchievementId, userTasks]
  );

  const statsCards: StatsCard[] = useMemo(() => {
    const completedAchievements = achievements.filter(
      (a) => a.status === "completed"
    ).length;

    return [
      {
        title: labels.xp,
        value: (user?.my_journey_xp ?? 0).toLocaleString(),
        subtitle: "Earned from solo tasks and peer reviews",
        icon: Zap,
        iconColor: "text-primary",
      },
      {
        title: "Achievements",
        value: `${completedAchievements}/${achievements.length}`,
        subtitle: `${completedAchievements} completed`,
        icon: Trophy,
        iconColor: "text-primary",
      },
    ];
  }, [achievements, user?.my_journey_xp]);

  const startTaskMutation = useMutation({
    mutationFn: async (rowId: string) => {
      const taskId = userTasks.find((t) => t.id === rowId)?.task_id;
      if (!taskId) {
        throw new Error(`No task row matches id ${rowId}`);
      }
      await startTaskLazy(taskId, undefined, user!.id, "individual");
    },
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myJourney"] });
      queryClient.invalidateQueries({ queryKey: MY_JOURNEY_OVERVIEW_KEY });
    },
    onError: (error) => {
      if (isPhaseLockedError(error)) {
        toast.error("This phase is still locked", {
          description:
            "Finish half of the previous phase first. The cards above show how many tasks are left.",
        });
      } else {
        toast.error("Could not start the task", {
          description:
            "The request did not reach the server. Try again, or contact support if it keeps failing.",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["myJourney"] });
    },
  });

  // Runs after every hook so hook order stays stable. Students lose this page
  // while the My Journey phase is off; admins always keep access. Only a
  // successful settings read may redirect — a failed fetch falls back to
  // JOURNEY_DEFAULTS, which would otherwise bounce students off the page.
  const settingsSettled = !journeysLoading && !userLoading;
  const guardReady = settingsSettled && !journeysError;
  if (guardReady && !journeys.myJourney && user?.primary_role !== "admin") {
    redirect("/dashboard");
  }

  if (!settingsSettled || !user?.id) {
    return <PageSkeleton showBreadcrumb showStats showTabs />;
  }

  return (
    <div className="space-y-6">
      <MyJourneyHeader
        name={user.name ?? "Student"}
        avatarUrl={user.avatar_url}
      />

      {/* Top row: XP, Achievements, then the explainer taking two columns. */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((card) => (
          <StatsCardComponent
            key={card.title}
            title={card.title}
            value={card.value}
            subtitle={card.subtitle}
            icon={card.icon}
            iconColor={card.iconColor}
          />
        ))}
        <div className="md:col-span-2">
          <HowMyJourneyWorksCard />
        </div>
      </div>

      {/* Next up + Continue, then the phase track — moved here from the
          retired Overview page. */}
      <MyJourneyOverviewCards userId={user.id} />

      <section className="space-y-6">
        {/* Data refetches on focus, reconnect and after every start/submit,
            so there is no manual refresh control here. */}
        <h2 className="text-xl font-semibold">Tasks</h2>

        <AchievementsGrid
          economy="my_journey"
          achievements={achievements}
          loading={achievementsPending}
          selectedId={selectedAchievementId}
          onSelect={(id) => setPicked({ param: achievementParam, id })}
          emptyText="No achievements available yet"
          cardOverride={(a) => {
            const lock = locks.get(a.achievement_id);
            return lock?.locked
              ? { locked: true, description: lock.description }
              : undefined;
          }}
        />

        {tasksPending ? (
          <PageSkeleton />
        ) : filteredTasks.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center">
            {selectedAchievementId
              ? "No tasks found for this achievement"
              : "No solo tasks assigned yet. Check back later for new challenges!"}
          </div>
        ) : (
          <TasksTable
            economy="my_journey"
            tasks={filteredTasks}
            // Solo tasks are always the student's own to start.
            isTeamMember
            currentUserId={user.id}
            onStartTask={(rowId) => startTaskMutation.mutate(rowId)}
          />
        )}
      </section>
    </div>
  );
}
