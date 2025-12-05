"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DifficultyBadge } from "@/components/ui/difficulty-badge";
import { taskNotificationManager } from "@/lib/notification-manager";
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
  const [availableTasks, setAvailableTasks] = useState<AvailableTask[]>([]);
  const [myTasks, setMyTasks] = useState<AvailableTask[]>([]);
  const [myAcceptedTasks, setMyAcceptedTasks] = useState<AvailableTask[]>([]);
  const [completedReviews, setCompletedReviews] = useState<CompletedReview[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [peerReviewStats, setPeerReviewStats] = useState<PeerReviewStats>({
    availableTasksCount: 0,
    tasksReviewedByUser: 0,
    totalPointsEarned: 0,
    totalXpEarned: 0,
  });
  const [acceptingTaskId, setAcceptingTaskId] = useState<string | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedTaskForReview, setSelectedTaskForReview] =
    useState<AvailableTask | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  // Removed unused feedbackModalOpen and setFeedbackModalOpen
  // Removed unused setSelectedFeedbackTask
  const [activeTab, setActiveTab] = useState<string>("available-tests");

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

  useEffect(() => {
    const loadTasks = async () => {
      if (!user?.id) return;

      try {
        const [available, mySubmitted, stats] = await Promise.all([
          getAvailableTasksForReview(user.id),
          getMySubmittedTasksForReview(user.id),
          getPeerReviewStatsFromTransactions(user.id),
        ]);

        // Try to load completed peer reviews separately
        let completedPeerReviews: CompletedReview[] = [];
        try {
          completedPeerReviews = await getCompletedPeerReviews(user.id);
        } catch (reviewError) {
          console.error("Error loading completed peer reviews:", reviewError);
          // Continue without reviews - don't break the whole page
        }

        // Load tasks that current user has accepted for review
        const supabase = createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: acceptedTasksData } = await (supabase as any)
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
          .eq("reviewer_user_id", user.id)
          .eq("status", "pending_review");

        // Type guard to check if data is valid
        const isValidTaskArray = (data: unknown): data is AvailableTask[] => {
          return (
            Array.isArray(data) &&
            (data.length === 0 ||
              (data[0] && typeof data[0] === "object" && "id" in data[0]))
          );
        };

        if (isValidTaskArray(available)) {
          setAvailableTasks(available);
        } else {
          console.error("Invalid available tasks data:", available);
          setAvailableTasks([]);
        }

        if (isValidTaskArray(mySubmitted)) {
          setMyTasks(mySubmitted);
        } else {
          console.error("Invalid my tasks data:", mySubmitted);
          setMyTasks([]);
        }

        // Set accepted tasks for review
        if (isValidTaskArray(acceptedTasksData)) {
          setMyAcceptedTasks(acceptedTasksData);
        } else {
          console.error("Invalid accepted tasks data:", acceptedTasksData);
          setMyAcceptedTasks([]);
        }

        // Set completed reviews (already typed correctly)
        setCompletedReviews(completedPeerReviews);

        // Update peer review stats
        setPeerReviewStats({
          availableTasksCount: available?.length || 0,
          tasksReviewedByUser: stats.tasksReviewedByUser,
          totalPointsEarned: stats.totalPointsEarned,
          totalXpEarned: stats.totalXpEarned,
        });
      } catch (error) {
        console.error("Error loading tasks:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, [user?.id]);

  const acceptTaskForReview = async (taskId: string) => {
    if (!user?.id) return;

    // Check if user already has a task assigned for review
    if (myAcceptedTasks.length > 0) {
      setAlertState({
        variant: "info",
        message: "Review limit reached",
        description:
          "You can only review one task at a time. Please complete your current review first.",
      });
      return;
    }

    setAcceptingTaskId(taskId);

    // Find the task being accepted
    const acceptedTask = availableTasks.find((task) => task.id === taskId);
    if (!acceptedTask) {
      setAcceptingTaskId(null);
      return;
    }

    // Optimistic update: Move task from available to accepted immediately
    setMyAcceptedTasks((prev) => [...prev, acceptedTask]);
    setAvailableTasks((prev) => prev.filter((task) => task.id !== taskId));
    setPeerReviewStats((prev) => ({
      ...prev,
      availableTasksCount: prev.availableTasksCount - 1,
    }));
    // Instantly switch to My Tests tab and open modal for this task
    setActiveTab("my-tests");
    setSelectedTaskForReview(acceptedTask);
    setReviewModalOpen(true);

    try {
      const supabase = createClient();

      // Call the database function to accept task for review
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc(
        "accept_external_task_for_review",
        {
          p_progress_id: taskId,
        }
      );

      if (error) {
        console.error("Error accepting task for review:", error);

        // Revert optimistic update on error
        setMyAcceptedTasks((prev) => prev.filter((task) => task.id !== taskId));
        setAvailableTasks((prev) => [...prev, acceptedTask]);
        setPeerReviewStats((prev) => ({
          ...prev,
          availableTasksCount: prev.availableTasksCount + 1,
        }));

        setAlertState({
          variant: "error",
          message: "Failed to accept task for review",
          description:
            "Please try again or contact support if the issue persists.",
        });
        return;
      }

      if (data?.success) {
        setAlertState({
          variant: "success",
          message: "Task accepted for review",
          description: 'Check the "My Tests" tab to begin testing.',
        });
        // Already switched tab and opened modal above
      } else {
        // Revert optimistic update on failure
        setMyAcceptedTasks((prev) => prev.filter((task) => task.id !== taskId));
        setAvailableTasks((prev) => [...prev, acceptedTask]);
        setPeerReviewStats((prev) => ({
          ...prev,
          availableTasksCount: prev.availableTasksCount + 1,
        }));

        setAlertState({
          variant: "error",
          message: "Failed to accept task for review",
          description: data?.error || "Please try again.",
        });
      }
    } catch (error) {
      console.error("Error:", error);

      // Revert optimistic update on exception
      setMyAcceptedTasks((prev) => prev.filter((task) => task.id !== taskId));
      setAvailableTasks((prev) => [...prev, acceptedTask]);
      setPeerReviewStats((prev) => ({
        ...prev,
        availableTasksCount: prev.availableTasksCount + 1,
      }));

      setAlertState({
        variant: "error",
        message: "An error occurred",
        description: "Please try again.",
      });
    } finally {
      setAcceptingTaskId(null);
    }
  };

  const openReviewModal = (task: AvailableTask) => {
    setSelectedTaskForReview(task);
    setReviewModalOpen(true);
  };

  const submitReview = async (
    feedback: string,
    decision: "accepted" | "rejected"
  ) => {
    if (!selectedTaskForReview || !decision || !user?.id) return;

    // Prevent double submission
    if (submittingReview) {
      console.log("Already submitting review, ignoring duplicate request");
      return;
    }

    // EARLY CONTINUATION CHECK: Determine if this is a valid continuation before blocking
    const hasPreviouslyReviewedTask = completedReviews.some(
      (review) => review.task_id === selectedTaskForReview.task_id
    );

    const isAssignedReviewer = selectedTaskForReview.reviewer?.id === user.id;

    // Allow continuation if user is assigned reviewer OR they have previously reviewed this task
    const isValidContinuation = isAssignedReviewer || hasPreviouslyReviewedTask;

    // Add debug logging to see what's happening
    console.log("🚨 EARLY CONTINUATION CHECK:", {
      task_id: selectedTaskForReview.task_id,
      user_id: user.id,
      hasPreviouslyReviewedTask,
      isAssignedReviewer,
      isValidContinuation,
      reviewer_info: selectedTaskForReview.reviewer,
    });

    // Only block if user has reviewed AND this is NOT a valid continuation scenario
    if (hasPreviouslyReviewedTask && !isValidContinuation) {
      toast.error("Already Reviewed", {
        description:
          "You have already reviewed this task. Refreshing to sync your view.",
        duration: 4000,
      });
      setTimeout(() => window.location.reload(), 1500);
      return;
    }

    setSubmittingReview(true);

    // Calculate rewards (10% of task rewards, actual values come from backend)
    const taskXP =
      selectedTaskForReview.tasks &&
      typeof selectedTaskForReview.tasks === "object" &&
      "base_xp_reward" in selectedTaskForReview.tasks
        ? Number(selectedTaskForReview.tasks.base_xp_reward) || 20
        : 20;
    const taskPoints =
      selectedTaskForReview.tasks &&
      typeof selectedTaskForReview.tasks === "object" &&
      "base_points_reward" in selectedTaskForReview.tasks
        ? Number(selectedTaskForReview.tasks.base_points_reward) || 20
        : 20;
    const estimatedXP = Math.max(1, Math.round(taskXP * 0.1));
    const estimatedPoints = Math.max(1, Math.round(taskPoints * 0.1));

    // Store original state for potential revert
    const originalAcceptedTasks = [...myAcceptedTasks];
    const originalStats = { ...peerReviewStats };

    // Optimistic update: Remove task from accepted and update stats immediately
    setMyAcceptedTasks((prev) =>
      prev.filter((task) => task.id !== selectedTaskForReview.id)
    );
    setPeerReviewStats((prev) => ({
      ...prev,
      tasksReviewedByUser: prev.tasksReviewedByUser + 1,
      totalPointsEarned: prev.totalPointsEarned + estimatedPoints,
      totalXpEarned: prev.totalXpEarned + estimatedXP,
    }));

    // Close modal immediately for smooth UX
    setReviewModalOpen(false);

    try {
      const supabase = createClient();

      // Use the continuation variables already defined at the beginning of the function
      const isResubmissionReview = isValidContinuation;

      // Enhanced logging for debugging continuation logic
      console.log("🔍 CONTINUATION DETECTION DEBUG:", {
        task_id: selectedTaskForReview.task_id,
        current_user_id: user.id,
        assigned_reviewer_id: selectedTaskForReview.reviewer?.id,
        is_assigned_reviewer: isAssignedReviewer,
        has_previously_reviewed: hasPreviouslyReviewedTask,
        previous_reviews_for_task: completedReviews.filter(
          (r) => r.task_id === selectedTaskForReview.task_id
        ),
        is_continuation: isResubmissionReview,
        is_valid_continuation: isValidContinuation,
        continuation_reason: hasPreviouslyReviewedTask
          ? "Previously reviewed"
          : isAssignedReviewer
          ? "Assigned reviewer"
          : "New review",
        selectedTask: {
          id: selectedTaskForReview.id,
          status: selectedTaskForReview.status,
          reviewer: selectedTaskForReview.reviewer,
        },
      });

      // Log the submission attempt for debugging
      console.log("Submitting peer review:", {
        progress_id: selectedTaskForReview.id,
        task_id: selectedTaskForReview.task_id,
        user_id: user.id,
        decision,
        feedback: feedback || null,
        is_continuation: isResubmissionReview,
        previous_reviews: completedReviews.filter(
          (r) => r.task_id === selectedTaskForReview.task_id
        ).length,
      });

      if (isResubmissionReview) {
        console.log(
          "🔄 Continuation Review: Same reviewer handling resubmission - bypassing duplicate prevention"
        );
        console.log(
          "✅ Continuation Flag = TRUE - Backend will bypass duplicate check"
        );
      } else {
        console.log(
          "🆕 New Review: First time reviewing this task - normal duplicate prevention applies"
        );
        console.log(
          "⚠️ Continuation Flag = FALSE - Backend will enforce duplicate prevention"
        );
      }

      // Call database function to submit peer review
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc(
        "submit_external_peer_review",
        {
          p_progress_id: selectedTaskForReview.id,
          p_decision: decision,
          p_feedback: feedback || null,
          p_is_continuation: isResubmissionReview, // NEW: Pass continuation flag
        }
      );

      if (error) {
        console.error("Error submitting review:", error);

        // Revert optimistic updates
        setMyAcceptedTasks(originalAcceptedTasks);
        setPeerReviewStats(originalStats);

        // Show specific error message for duplicate prevention
        if (error.message?.includes("DUPLICATE PREVENTION")) {
          const errorContext = isResubmissionReview
            ? "There was an issue with the continuation review system"
            : "You have already reviewed this task";

          toast.error("Review Submission Error", {
            description: `${errorContext}. Refreshing the page to update your view.`,
            duration: 6000,
          });

          // Refresh the page after a short delay to sync the UI with database state
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          toast.error("Failed to submit review", {
            description:
              error.message ||
              "Please try again or contact support if the issue persists.",
          });
        }
        return;
      }

      if (data?.success) {
        // Show toast notification with context about continuation reviews
        const reviewType = isResubmissionReview ? "Follow-up review" : "Review";
        toast.success(`${reviewType} submitted successfully! \u2705`, {
          description: `Task ${decision}. You earned ${estimatedXP} XP and ${estimatedPoints} points.${
            isResubmissionReview ? " (Continuation review)" : ""
          }`,
          duration: 5000,
        });

        // Refresh notifications for all users (reviewer and submitter)
        taskNotificationManager.refresh();

        // Refresh actual stats from database
        try {
          const updatedStats = await getPeerReviewStatsFromTransactions(
            user.id
          );
          setPeerReviewStats((prev) => ({
            ...prev,
            tasksReviewedByUser: updatedStats.tasksReviewedByUser,
            totalPointsEarned: updatedStats.totalPointsEarned,
            totalXpEarned: updatedStats.totalXpEarned,
          }));
        } catch (error) {
          console.error("Error refreshing stats:", error);
        }
      } else {
        // Revert optimistic updates on failure
        setMyAcceptedTasks(originalAcceptedTasks);
        setPeerReviewStats(originalStats);

        setAlertState({
          variant: "error",
          message: "Failed to submit review",
          description: data?.error || "Please try again.",
        });
      }
    } catch (error) {
      console.error("Error:", error);

      // Revert optimistic updates on exception
      setMyAcceptedTasks(originalAcceptedTasks);
      setPeerReviewStats(originalStats);

      setAlertState({
        variant: "error",
        message: "An error occurred",
        description: "Please try again.",
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Task Testing & Acceptance</h1>
          <p className="text-muted-foreground">
            Compete with others and track your progress
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          disabled
          title="Coming soon"
        >
          <ExternalLink className="h-4 w-4" />
          Read About Testing
        </Button>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCardComponent
          title="Total Tasks Available"
          value={
            loading ? "..." : peerReviewStats.availableTasksCount.toString()
          }
          subtitle="Available for review"
          icon={FileText}
          iconColor="text-black dark:text-white"
        />
        <StatsCardComponent
          title="Tasks Tested By You"
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
            Available Tests
          </TabsTrigger>
          <TabsTrigger value="my-tests" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-black dark:text-white" />
            My Tests
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

        <TabsContent value="available-tests" className="space-y-6 mt-6">
          {alertState && (
            <InlineAlert
              variant={alertState.variant}
              message={alertState.message}
              description={alertState.description}
              onDismiss={() => setAlertState(null)}
            />
          )}

          {myAcceptedTasks.length > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <p className="text-sm text-primary">
                <strong>Note:</strong> You currently have{" "}
                {myAcceptedTasks.length} task(s) for review. Complete your
                current review before accepting new tasks.
              </p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">
                Loading available tasks...
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                      Task to Test
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                      Team
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                      Difficulty
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                      Reviewer XP (10%)
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                      Reviewer Points (10%)
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                      Submitted
                    </th>
                    <th className="text-right py-4 px-4 font-medium text-muted-foreground">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {availableTasks.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No submitted tasks for review
                      </td>
                    </tr>
                  ) : (
                    availableTasks
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
                              : "Accept Testing"
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

        <TabsContent value="my-tests" className="space-y-6 mt-6">
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
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                    Task to Test
                  </th>
                  <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                    Team
                  </th>
                  <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                    Difficulty
                  </th>
                  <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                    Reviewer XP (10%)
                  </th>
                  <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                    Reviewer Points (10%)
                  </th>
                  <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                    Submitted
                  </th>
                  <th className="text-right py-4 px-4 font-medium text-muted-foreground">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {myAcceptedTasks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No tasks accepted for review yet
                    </td>
                  </tr>
                ) : (
                  myAcceptedTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      variant="review"
                      reviewerReward={true}
                      onAction={() => openReviewModal(task)}
                      actionButtonText="Review Task"
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="my-tasks" className="space-y-6 mt-6">
          {alertState && (
            <InlineAlert
              variant={alertState.variant}
              message={alertState.message}
              description={alertState.description}
              onDismiss={() => setAlertState(null)}
            />
          )}

          {loading ? (
            <div className="text-center py-8">
              <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Loading my tasks...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                      Task
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                      Team
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                      Difficulty
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                      Submitted
                    </th>
                    <th className="text-right py-4 px-4 font-medium text-muted-foreground">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {myTasks.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center py-8 text-muted-foreground"
                      >
                        You haven&apos;t submitted any tasks for review
                      </td>
                    </tr>
                  ) : (
                    myTasks
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

        <TabsContent value="history" className="space-y-6 mt-6">
          {loading ? (
            <div className="text-center py-8">
              <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Loading review history...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                      Task Reviewed
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                      Team
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                      Assignee
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                      Difficulty
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                      XP Earned
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                      Points Earned
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                      Reviewed
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {completedReviews.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="text-center py-8 text-muted-foreground"
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
                          className="border-b border-border/50"
                        >
                          {/* Task Name */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
                                <Medal className="h-4 w-4 text-black dark:text-white" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <div className="font-medium text-sm">
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
                                <div className="text-xs text-muted-foreground max-w-xs truncate">
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
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-black dark:bg-white rounded-full"></div>
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
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6">
                                <AvatarImage
                                  src={
                                    review.assigned_user?.avatar_url ||
                                    "/avatars/default.jpg"
                                  }
                                  alt={review.assigned_user?.name || "User"}
                                />
                                <AvatarFallback className="bg-gradient-to-r from-purple-400 to-pink-400 text-primary-foreground font-bold text-xs">
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
                          <td className="py-4 px-4">
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
                          <td className="py-4 px-4">
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
                          <td className="py-4 px-4">
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
                          <td className="py-4 px-4">
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
                          <td className="py-4 px-4">
                            <div className="text-sm text-muted-foreground">
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
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        taskData={selectedTaskForReview || undefined}
        onReviewSubmit={async (
          feedback: string,
          decision: "accepted" | "rejected"
        ) => {
          await submitReview(feedback, decision);
        }}
        submittingReview={submittingReview}
      />

      {/* Feedback Modal */}
      {/* Feedback modal removed: selectedFeedbackTask was unused and removed */}
    </div>
  );
}
