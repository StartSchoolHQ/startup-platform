"use client";

import posthog from "posthog-js";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DifficultyBadge } from "@/components/ui/difficulty-badge";
import { invalidateNotifications } from "@/hooks/use-task-notifications";
import { toast } from "sonner";

import {
  Trophy,
  CheckCircle2,
  Users,
  ExternalLink,
  Clock,
  History,
  Medal,
  Zap,
  FileText,
  User,
  CreditCard,
} from "lucide-react";
import { StatsCardComponent } from "@/components/dashboard/stats-card";
import {
  getAvailableTasksForReview,
  getMySubmittedTasksForReview,
  getPeerReviewStatsFromTransactions,
  getCompletedPeerReviews,
} from "@/lib/database";
import { useApp } from "@/contexts/app-context";
import { createClient } from "@/lib/supabase/client";
import { TaskRow } from "@/components/tasks/task-row";

import { TaskDetailsModal } from "@/components/ui/task-details-modal";

interface PeerReviewStats {
  availableTasksCount: number;
  tasksReviewedByUser: number;
  totalPointsEarned: number;
  totalXpEarned: number;
}

interface AvailableTask {
  id: string;
  task_id: string;
  team_id: string;
  assigned_to_user_id: string | null;
  completed_at: string;
  submission_data: Record<string, unknown>;
  submission_notes?: string;
  status: "pending_review" | "approved" | "rejected" | "revision_required";
  reviewer?: {
    id: string;
    name: string;
    avatar_url?: string;
  } | null;
  tasks: {
    id: string;
    title: string;
    description: string;
    difficulty_level: number;
    base_xp_reward: number;
    base_points_reward: number;
    category: string;
    peer_review_criteria?: Array<{
      category: string;
      points: string[];
    }>;
  } | null;
  teams: {
    id: string;
    name: string;
  } | null;
}

interface CompletedReview {
  id: string;
  task_id: string;
  team_id: string | null;
  assigned_to_user_id: string | null;
  completed_at: string | null;
  updated_at: string;
  submission_data: unknown;
  submission_notes: string | null;
  status: "approved" | "rejected"; // Now only approved/rejected since these are completed reviews
  review_feedback: string | null;
  // Additional metadata for individual reviews
  review_index?: number;
  total_reviews?: number;
  reviewer_name?: string;
  reviewer_avatar_url?: string;
  tasks:
    | {
        id: string;
        title: string;
        description: string;
        difficulty_level: number;
        base_xp_reward: number;
        base_points_reward: number;
        category: string;
      }
    | null
    | unknown;
  teams:
    | {
        id: string;
        name: string;
      }
    | null
    | unknown;
  assigned_user: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  } | null;
}

export default function PeerReviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useApp();
  const queryClient = useQueryClient();

  // UI state only
  const [modalState, setModalState] = useState({
    isOpen: false,
    selectedTask: null as AvailableTask | null,
    isSubmitting: false,
  });
  const [activeTab, setActiveTab] = useState<string>("available-tests");
  const [acceptingTaskId, setAcceptingTaskId] = useState<string | null>(null);

  // React Query: Available tasks for review
  const { data: availableTasks = [], isPending: loadingAvailable } = useQuery({
    queryKey: ["peerReview", "available", user?.id],
    queryFn: () => getAvailableTasksForReview(user!.id),
    enabled: !!user?.id,
  });

  // React Query: My submitted tasks
  const { data: myTasks = [], isPending: loadingMyTasks } = useQuery({
    queryKey: ["peerReview", "myTasks", user?.id],
    queryFn: () => getMySubmittedTasksForReview(user!.id),
    enabled: !!user?.id,
  });

  // React Query: Tasks I accepted for review
  const { data: myAcceptedTasks = [], isPending: loadingAccepted } = useQuery({
    queryKey: ["peerReview", "accepted", user?.id],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await (supabase as any)
        .from("task_progress")
        .select(
          `
          id,
          task_id,
          team_id,
          assigned_to_user_id,
          reviewer_user_id,
          completed_at,
          submission_data,
          peer_review_history,
          tasks(
            id,
            title,
            description,
            difficulty_level,
            base_xp_reward,
            base_points_reward,
            category,
            peer_review_criteria
          ),
          teams(
            id,
            name
          ),
          reviewer:users!reviewer_user_id(
            id,
            name,
            avatar_url
          )
        `
        )
        .eq("reviewer_user_id", user!.id)
        .eq("status", "pending_review");
      return data || [];
    },
    enabled: !!user?.id,
  });

  // React Query: Completed peer reviews
  const { data: completedReviews = [] } = useQuery({
    queryKey: ["peerReview", "completed", user?.id],
    queryFn: () => getCompletedPeerReviews(user!.id),
    enabled: !!user?.id,
  });

  // React Query: Peer review stats
  const { data: statsData } = useQuery({
    queryKey: ["peerReview", "stats", user?.id],
    queryFn: () => getPeerReviewStatsFromTransactions(user!.id),
    enabled: !!user?.id,
  });

  const loading = loadingAvailable || loadingMyTasks || loadingAccepted;

  const peerReviewStats: PeerReviewStats = {
    availableTasksCount: availableTasks.length,
    tasksReviewedByUser: statsData?.tasksReviewedByUser || 0,
    totalPointsEarned: statsData?.totalPointsEarned || 0,
    totalXpEarned: statsData?.totalXpEarned || 0,
  };

  // Handle URL query parameters for tab and task navigation
  useEffect(() => {
    const tab = searchParams.get("tab");
    const taskId = searchParams.get("task");

    // Switch to specified tab if provided
    if (
      tab &&
      ["available-tests", "my-tests", "my-tasks", "completed"].includes(tab)
    ) {
      setActiveTab(tab);
    }

    // TODO: If taskId is provided, we could auto-open the task modal
    // For now, just switching to correct tab is sufficient
    if (taskId) {
      console.log("Task ID from notification:", taskId);
    }
  }, [searchParams]);

  // Alert state for inline feedback
  const [alertState, setAlertState] = useState<{
    variant: "success" | "error" | "info";
    message: string;
    description?: string;
  } | null>(null);

  // Auto-dismiss alert after 4 seconds
  useEffect(() => {
    if (alertState) {
      const timer = setTimeout(() => setAlertState(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [alertState]);

  // Mutation: Accept task for review with optimistic update
  const acceptTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const supabase = createClient();
      const { data, error } = await (supabase as any).rpc(
        "accept_external_task_for_review",
        { p_progress_id: taskId }
      );
      if (error) throw error;
      if (!data?.success)
        throw new Error(data?.error || "Failed to accept task");
      return { taskId };
    },
    onMutate: async (taskId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["peerReview"] });

      // Get current available tasks from cache
      const currentAvailableTasks =
        queryClient.getQueryData<AvailableTask[]>([
          "peerReview",
          "available",
          user?.id,
        ]) || [];

      // Find the task being accepted
      const acceptedTask = currentAvailableTasks.find(
        (task) => task.id === taskId
      );
      if (!acceptedTask) return;

      // Optimistically update cache
      queryClient.setQueryData(
        ["peerReview", "accepted", user?.id],
        (old: AvailableTask[] = []) => [...old, acceptedTask]
      );
      queryClient.setQueryData(
        ["peerReview", "available", user?.id],
        (old: AvailableTask[] = []) => old.filter((task) => task.id !== taskId)
      );

      // Switch tab and open modal
      setActiveTab("my-tests");
      setModalState({
        isOpen: true,
        selectedTask: acceptedTask,
        isSubmitting: false,
      });
      setAcceptingTaskId(taskId);

      return { acceptedTask };
    },
    onSuccess: () => {
      setAlertState({
        variant: "success",
        message: "Task accepted for review",
        description: 'Check the "My Tests" tab to begin testing.',
      });
    },
    onError: (error, taskId, context) => {
      // Revert optimistic update
      queryClient.invalidateQueries({ queryKey: ["peerReview"] });
      setAlertState({
        variant: "error",
        message: "Failed to accept task for review",
        description:
          "Please try again or contact support if the issue persists.",
      });
    },
    onSettled: () => {
      setAcceptingTaskId(null);
    },
  });

  const acceptTaskForReview = (taskId: string) => {
    if (!user?.id) return;
    if (myAcceptedTasks.length > 0) {
      setAlertState({
        variant: "info",
        message: "Review limit reached",
        description:
          "You can only review one task at a time. Please complete your current review first.",
      });
      return;
    }
    acceptTaskMutation.mutate(taskId);
  };

  const openReviewModal = (task: AvailableTask) => {
    setModalState({ isOpen: true, selectedTask: task, isSubmitting: false });
  };

  // Mutation: Submit review with optimistic update
  const submitReviewMutation = useMutation({
    mutationFn: async ({
      taskId,
      progressId,
      feedback,
      decision,
      isContinuation,
    }: {
      taskId: string;
      progressId: string;
      feedback: string;
      decision: "accepted" | "rejected";
      isContinuation: boolean;
    }) => {
      const supabase = createClient();
      const { data, error } = await (supabase as any).rpc(
        "submit_external_peer_review",
        {
          p_progress_id: progressId,
          p_decision: decision,
          p_feedback: feedback || null,
          p_is_continuation: isContinuation,
        }
      );
      if (error) throw error;
      if (!data?.success)
        throw new Error(data?.error || "Failed to submit review");
      return { taskId, decision, feedback };
    },
    onMutate: async ({ progressId }) => {
      await queryClient.cancelQueries({ queryKey: ["peerReview"] });

      // Remove from accepted tasks
      queryClient.setQueryData(
        ["peerReview", "accepted", user?.id],
        (old: AvailableTask[] = []) =>
          old.filter((task) => task.id !== progressId)
      );

      // Close modal immediately
      setModalState({ isOpen: false, selectedTask: null, isSubmitting: false });
    },
    onSuccess: (_, variables) => {
      const task = modalState.selectedTask;
      const taskXP =
        task?.tasks &&
        typeof task.tasks === "object" &&
        "base_xp_reward" in task.tasks
          ? Number(task.tasks.base_xp_reward) || 20
          : 20;
      const taskPoints =
        task?.tasks &&
        typeof task.tasks === "object" &&
        "base_points_reward" in task.tasks
          ? Number(task.tasks.base_points_reward) || 20
          : 20;
      const estimatedXP = Math.max(1, Math.round(taskXP * 0.1));
      const estimatedPoints = Math.max(1, Math.round(taskPoints * 0.1));

      posthog.capture("peer_review_submitted", {
        task_id: variables.taskId,
        progress_id: variables.progressId,
        decision: variables.decision,
        is_continuation: variables.isContinuation,
        has_feedback: Boolean(variables.feedback),
        estimated_xp: estimatedXP,
        estimated_points: estimatedPoints,
      });

      const reviewType = variables.isContinuation
        ? "Follow-up review"
        : "Review";
      toast.success(`${reviewType} submitted successfully! \u2705`, {
        description: `Task ${
          variables.decision
        }. You earned ${estimatedXP} XP and ${estimatedPoints} points.${
          variables.isContinuation ? " (Continuation review)" : ""
        }`,
        duration: 5000,
      });

      invalidateNotifications(queryClient, user?.id);
      queryClient.invalidateQueries({ queryKey: ["peerReview"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "stats"] });
    },
    onError: (error: any) => {
      queryClient.invalidateQueries({ queryKey: ["peerReview"] });

      if (error.message?.includes("DUPLICATE PREVENTION")) {
        toast.error("Review Submission Error", {
          description:
            "You have already reviewed this task. Refreshing the page to update your view.",
          duration: 6000,
        });
        setTimeout(() => window.location.reload(), 2000);
      } else {
        toast.error("Failed to submit review", {
          description:
            error.message ||
            "Please try again or contact support if the issue persists.",
        });
      }
    },
  });

  const submitReview = (
    feedback: string,
    decision: "accepted" | "rejected"
  ) => {
    if (!modalState.selectedTask || !decision || !user?.id) return;
    if (modalState.isSubmitting) return;

    const hasPreviouslyReviewedTask = completedReviews.some(
      (review) => review.task_id === modalState.selectedTask!.task_id
    );
    const isAssignedReviewer = modalState.selectedTask.reviewer?.id === user.id;
    const isValidContinuation = isAssignedReviewer || hasPreviouslyReviewedTask;

    if (hasPreviouslyReviewedTask && !isValidContinuation) {
      toast.error("Already Reviewed", {
        description:
          "You have already reviewed this task. Refreshing to sync your view.",
        duration: 4000,
      });
      setTimeout(() => window.location.reload(), 1500);
      return;
    }

    setModalState((prev) => ({ ...prev, isSubmitting: true }));

    submitReviewMutation.mutate({
      taskId: modalState.selectedTask.task_id,
      progressId: modalState.selectedTask.id,
      feedback,
      decision,
      isContinuation: isValidContinuation,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Peer Review & Acceptance</h1>
          <p className="text-muted-foreground">
            Review other teams' work and track your progress
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          disabled
          title="Coming soon"
        >
          <ExternalLink className="h-4 w-4" />
          Read About Reviews
        </Button>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCardComponent
          title="Reviews Available"
          value={
            loading ? "..." : peerReviewStats.availableTasksCount.toString()
          }
          subtitle="Available for review"
          icon={FileText}
          iconColor="text-black dark:text-white"
        />
        <StatsCardComponent
          title="Tasks Reviewed By You"
          value={
            loading ? "..." : peerReviewStats.tasksReviewedByUser.toString()
          }
          subtitle="Reviews completed"
          icon={User}
          iconColor="text-black dark:text-white"
        />
        <StatsCardComponent
          title="Points Earned"
          value={loading ? "..." : peerReviewStats.totalPointsEarned.toString()}
          subtitle="From peer reviews"
          icon={CreditCard}
          iconColor="text-black dark:text-white"
        />
        <StatsCardComponent
          title="XP Earned"
          value={loading ? "..." : peerReviewStats.totalXpEarned.toString()}
          subtitle="From peer reviews"
          icon={Zap}
          iconColor="text-black dark:text-white"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger
            value="available-tests"
            className="flex items-center gap-2"
          >
            <Trophy className="h-4 w-4 text-black dark:text-white" />
            Available Reviews
          </TabsTrigger>
          <TabsTrigger value="my-tests" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-black dark:text-white" />
            My Reviews
          </TabsTrigger>
          <TabsTrigger value="my-tasks" className="flex items-center gap-2">
            <Users className="h-4 w-4 text-black dark:text-white" />
            My Tasks
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4 text-black dark:text-white" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available-tests" className="mt-6 space-y-6">
          {alertState && (
            <InlineAlert
              variant={alertState.variant}
              message={alertState.message}
              description={alertState.description}
              onDismiss={() => setAlertState(null)}
            />
          )}

          {myAcceptedTasks.length > 0 && (
            <div className="bg-primary/5 border-primary/20 rounded-lg border p-4">
              <p className="text-primary text-sm">
                <strong>Note:</strong> You currently have{" "}
                {myAcceptedTasks.length} task(s) for review. Complete your
                current review before accepting new tasks.
              </p>
            </div>
          )}

          {loading ? (
            <div className="py-8 text-center">
              <Clock className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
              <p className="text-muted-foreground">
                Loading available tasks...
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-border border-b">
                    <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                      Task to Test
                    </th>
                    <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                      Team
                    </th>
                    <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                      Difficulty
                    </th>
                    <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                      Reviewer XP (10%)
                    </th>
                    <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                      Reviewer Points (10%)
                    </th>
                    <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                      Submitted
                    </th>
                    <th className="text-muted-foreground px-4 py-4 text-right font-medium">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {availableTasks.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-muted-foreground py-8 text-center"
                      >
                        No submitted tasks for review
                      </td>
                    </tr>
                  ) : (
                    (availableTasks as AvailableTask[])
                      .filter((task) => task.tasks && task.teams) // Filter out tasks with null relations
                      .map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          variant="available"
                          onAction={() => acceptTaskForReview(task.id)}
                          actionLoading={acceptingTaskId === task.id}
                          reviewerReward={true}
                          actionButtonText={
                            acceptingTaskId === task.id
                              ? "Accepting..."
                              : myAcceptedTasks.length > 0
                                ? "Max 1 Task"
                                : "Accept Review"
                          }
                          actionButtonDisabled={
                            acceptingTaskId === task.id ||
                            myAcceptedTasks.length > 0
                          }
                          actionButtonVariant="default"
                        />
                      ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-tests" className="mt-6 space-y-6">
          {alertState && (
            <InlineAlert
              variant={alertState.variant}
              message={alertState.message}
              description={alertState.description}
              onDismiss={() => setAlertState(null)}
            />
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-border border-b">
                  <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                    Task to Review
                  </th>
                  <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                    Team
                  </th>
                  <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                    Difficulty
                  </th>
                  <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                    Reviewer XP (10%)
                  </th>
                  <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                    Reviewer Points (10%)
                  </th>
                  <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                    Submitted
                  </th>
                  <th className="text-muted-foreground px-4 py-4 text-right font-medium">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {myAcceptedTasks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-muted-foreground py-8 text-center"
                    >
                      No tasks accepted for review yet
                    </td>
                  </tr>
                ) : (
                  (myAcceptedTasks as AvailableTask[]).map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      variant="review"
                      reviewerReward={true}
                      onAction={() => openReviewModal(task)}
                      actionButtonText="Review Submission"
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="my-tasks" className="mt-6 space-y-6">
          {alertState && (
            <InlineAlert
              variant={alertState.variant}
              message={alertState.message}
              description={alertState.description}
              onDismiss={() => setAlertState(null)}
            />
          )}

          {loading ? (
            <div className="py-8 text-center">
              <Clock className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
              <p className="text-muted-foreground">Loading my tasks...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-border border-b">
                    <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                      Task
                    </th>
                    <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                      Team
                    </th>
                    <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                      Difficulty
                    </th>
                    <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                      Status
                    </th>
                    <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                      Submitted
                    </th>
                    <th className="text-muted-foreground px-4 py-4 text-right font-medium">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {myTasks.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-muted-foreground py-8 text-center"
                      >
                        You haven&apos;t submitted any tasks for review
                      </td>
                    </tr>
                  ) : (
                    (myTasks as AvailableTask[])
                      .filter((task) => task.tasks && task.teams) // Filter out tasks with null relations
                      .map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          variant="submitted"
                          onAction={() => {
                            router.push(
                              `/dashboard/team-journey/task/${task.id}`
                            );
                          }}
                          actionLoading={false}
                          actionButtonText="View Feedback"
                          actionButtonDisabled={
                            !(
                              task.status === "approved" ||
                              task.status === "rejected" ||
                              task.status === "revision_required"
                            )
                          }
                          actionButtonVariant="outline"
                          showStatus={true}
                        />
                      ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6 space-y-6">
          {loading ? (
            <div className="py-8 text-center">
              <Clock className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
              <p className="text-muted-foreground">Loading review history...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-border border-b">
                    <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                      Task Reviewed
                    </th>
                    <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                      Team
                    </th>
                    <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                      Assignee
                    </th>
                    <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                      Difficulty
                    </th>
                    <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                      XP Earned
                    </th>
                    <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                      Points Earned
                    </th>
                    <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                      Status
                    </th>
                    <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                      Reviewed
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {completedReviews.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="text-muted-foreground py-8 text-center"
                      >
                        You haven&apos;t completed any peer reviews yet
                      </td>
                    </tr>
                  ) : (
                    completedReviews
                      .filter((review) => review.tasks && review.teams) // Filter out reviews with null relations
                      .map((review) => (
                        <tr
                          key={review.id}
                          className="border-border/50 border-b"
                        >
                          {/* Task Name */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-md">
                                <Medal className="h-4 w-4 text-black dark:text-white" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <div className="text-sm font-medium">
                                    {review.tasks &&
                                    typeof review.tasks === "object" &&
                                    "title" in review.tasks
                                      ? String(review.tasks.title)
                                      : "Unknown Task"}
                                  </div>
                                  {review.total_reviews &&
                                    review.total_reviews > 1 && (
                                      <Badge
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        Review {(review.review_index || 0) + 1}/
                                        {review.total_reviews}
                                      </Badge>
                                    )}
                                </div>
                                <div className="text-muted-foreground max-w-xs truncate text-xs">
                                  {review.tasks &&
                                  typeof review.tasks === "object" &&
                                  "description" in review.tasks
                                    ? String(review.tasks.description)
                                    : ""}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Team */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-black dark:bg-white"></div>
                              <span className="text-sm font-medium">
                                {review.teams &&
                                typeof review.teams === "object" &&
                                "name" in review.teams
                                  ? String(review.teams.name)
                                  : "Unknown Team"}
                              </span>
                            </div>
                          </td>

                          {/* Assignee */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage
                                  src={
                                    review.assigned_user?.avatar_url ||
                                    "/avatars/default.jpg"
                                  }
                                  alt={review.assigned_user?.name || "User"}
                                />
                                <AvatarFallback className="text-primary-foreground bg-gradient-to-r from-purple-400 to-pink-400 text-xs font-bold">
                                  {review.assigned_user?.name
                                    ?.charAt(0)
                                    .toUpperCase() || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium">
                                {review.assigned_user?.name || "Unknown User"}
                              </span>
                            </div>
                          </td>

                          {/* Difficulty */}
                          <td className="px-4 py-4">
                            <DifficultyBadge
                              level={
                                review.tasks &&
                                typeof review.tasks === "object" &&
                                "difficulty_level" in review.tasks
                                  ? Number(review.tasks.difficulty_level) || 1
                                  : 1
                              }
                            />
                          </td>

                          {/* XP Earned */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-1">
                              <Zap className="h-4 w-4 text-black dark:text-white" />
                              <span className="text-sm font-medium">
                                {Math.max(
                                  1,
                                  Math.round(
                                    (review.tasks &&
                                    typeof review.tasks === "object" &&
                                    "base_xp_reward" in review.tasks
                                      ? Number(review.tasks.base_xp_reward) || 0
                                      : 0) * 0.1
                                  )
                                )}
                              </span>
                            </div>
                          </td>

                          {/* Points Earned */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-1">
                              <Medal className="h-4 w-4 text-black dark:text-white" />
                              <span className="text-sm font-medium">
                                {Math.max(
                                  1,
                                  Math.round(
                                    (review.tasks &&
                                    typeof review.tasks === "object" &&
                                    "base_points_reward" in review.tasks
                                      ? Number(
                                          review.tasks.base_points_reward
                                        ) || 0
                                      : 0) * 0.1
                                  )
                                )}
                              </span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-4">
                            <Badge
                              variant={
                                review.status === "approved"
                                  ? "default"
                                  : "destructive"
                              }
                              className={
                                review.status === "approved"
                                  ? "bg-green-100 text-green-800"
                                  : ""
                              }
                            >
                              {review.status === "approved"
                                ? "Approved"
                                : "Rejected"}
                            </Badge>
                          </td>

                          {/* Reviewed Date */}
                          <td className="px-4 py-4">
                            <div className="text-muted-foreground text-sm">
                              {new Date(review.updated_at).toLocaleDateString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                }
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Review Modal */}
      <TaskDetailsModal
        mode="review"
        isOpen={modalState.isOpen}
        onClose={() =>
          setModalState({
            isOpen: false,
            selectedTask: null,
            isSubmitting: false,
          })
        }
        taskData={modalState.selectedTask || undefined}
        onReviewSubmit={async (
          feedback: string,
          decision: "accepted" | "rejected"
        ) => {
          await submitReview(feedback, decision);
        }}
        submittingReview={modalState.isSubmitting}
      />

      {/* Feedback Modal */}
      {/* Feedback modal removed: selectedFeedbackTask was unused and removed */}
    </div>
  );
}
