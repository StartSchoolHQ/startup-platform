"use client";

import { StatsCardComponent } from "@/components/dashboard/stats-card";
import { AchievementsGrid } from "@/components/journey/achievements-grid";
import { MyJourneyHeader } from "@/components/journey/my-journey-header";
import { MyJourneyProgressCards } from "@/components/journey/my-journey-progress-cards";
import { TasksTable } from "@/components/team-journey/tasks-table";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppContext } from "@/contexts/app-context";
import { usePlatformSettings } from "@/hooks/use-platform-settings";
import {
  getUserAchievementProgress,
  getUserIndividualTasks,
  getUserTaskCompletionStats,
  getUserTasksVisible,
} from "@/lib/database";
import { economyLabels } from "@/lib/economy-labels";
import { buildMyJourneyTasks } from "@/lib/my-journey-tasks";
import { startTaskLazy } from "@/lib/tasks";
import { StatsCard } from "@/types/dashboard";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, CreditCard, RotateCcw, Trophy, Zap } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
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

  const [selectedAchievementId, setSelectedAchievementId] = useState<
    string | null
  >(null);

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

  const { data: achievementProgress = [], isPending: achievementsPending } =
    useQuery({
      queryKey: ["myJourney", "achievements", user?.id],
      queryFn: () => getUserAchievementProgress(user!.id),
      enabled: !!user?.id,
    });

  const { data: taskStats = { total: 0, completed: 0, completionRate: 0 } } =
    useQuery({
      queryKey: ["myJourney", "taskStats", user?.id],
      queryFn: () => getUserTaskCompletionStats(user!.id),
      enabled: !!user?.id,
    });

  const userTasks = useMemo(
    () =>
      buildMyJourneyTasks(availableTasksData, individualTasksData, {
        name: user?.name ?? null,
        avatarUrl: user?.avatar_url ?? null,
      }),
    [availableTasksData, individualTasksData, user?.name, user?.avatar_url]
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
        })
      ),
    [achievementProgress]
  );

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
        iconColor: "text-amber-500",
      },
      {
        title: `My Journey ${labels.points}`,
        value: (user?.my_journey_credits ?? 0).toLocaleString(),
        subtitle: "Earned from solo activities",
        icon: CreditCard,
        iconColor: "text-emerald-500",
      },
      {
        title: "Tasks Completed",
        value: `${taskStats.completed}/${taskStats.total}`,
        subtitle: `${taskStats.completionRate}% completion rate`,
        icon: CheckCircle,
        iconColor: "text-blue-500",
      },
      {
        title: "Achievements",
        value: `${completedAchievements}/${achievements.length}`,
        subtitle: `${completedAchievements} completed`,
        icon: Trophy,
        iconColor: "text-purple-500",
      },
    ];
  }, [achievements, taskStats, user?.my_journey_xp, user?.my_journey_credits]);

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
    },
    onError: () => {
      toast.error("Could not start the task", {
        description:
          "The request did not reach the server. Try again, or contact support if it keeps failing.",
      });
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
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <span className="font-medium">My Journey</span>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <MyJourneyHeader
        name={user.name ?? "Student"}
        avatarUrl={user.avatar_url}
      />

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
      </div>

      <MyJourneyProgressCards
        completed={taskStats.completed}
        total={taskStats.total}
      />

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <Trophy className="h-4 w-4 shrink-0" />
            Tasks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Tasks</h2>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: ["myJourney"] })
              }
              disabled={tasksPending}
            >
              <RotateCcw
                className={`h-4 w-4 ${tasksPending ? "animate-spin" : ""}`}
              />
              {tasksPending ? "Refreshing..." : "Refresh"}
            </Button>
          </div>

          <AchievementsGrid
            economy="my_journey"
            achievements={achievements}
            loading={achievementsPending}
            selectedId={selectedAchievementId}
            onSelect={setSelectedAchievementId}
            emptyText="No achievements available yet"
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
