"use client";

import { useState, useEffect } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";

import { Trophy, CheckCircle2, Users, ExternalLink, Clock } from "lucide-react";
import { StatsCardComponent } from "@/components/dashboard/stats-card";
import {
  getAvailableTasksForReview,
  getMySubmittedTasksForReview,
  getPeerReviewStatsFromTransactions,
} from "@/lib/database";
import { useApp } from "@/contexts/app-context";
import { createClient } from "@/lib/supabase/client";
import { TaskRow } from "@/components/tasks/task-row";

import { TaskDetailsModal } from "@/components/ui/task-details-modal";
import { FileText, User, Zap, CreditCard } from "lucide-react";

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

export default function PeerReviewPage() {
  const { user } = useApp();
  const [availableTasks, setAvailableTasks] = useState<AvailableTask[]>([]);
  const [myTasks, setMyTasks] = useState<AvailableTask[]>([]);
  const [myAcceptedTasks, setMyAcceptedTasks] = useState<AvailableTask[]>([]);
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
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [selectedFeedbackTask, setSelectedFeedbackTask] =
    useState<AvailableTask | null>(null);

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
            completed_at,
            submission_data,
            tasks(
              id,
              title,
              description,
              difficulty_level,
              base_xp_reward,
              category,
              peer_review_criteria
            ),
            teams(
              id,
              name
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

    setSubmittingReview(true);

    // Calculate rewards (base values, actual values come from backend)
    const estimatedXP = selectedTaskForReview.tasks?.base_xp_reward
      ? Math.round(selectedTaskForReview.tasks.base_xp_reward * 0.2)
      : 20;
    const estimatedPoints = Math.round(estimatedXP * 0.1);

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

      // Call database function to submit peer review
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc(
        "submit_external_peer_review",
        {
          p_progress_id: selectedTaskForReview.id,
          p_decision: decision,
          p_feedback: feedback || null,
        }
      );

      if (error) {
        console.error("Error submitting review:", error);

        // Revert optimistic updates
        setMyAcceptedTasks(originalAcceptedTasks);
        setPeerReviewStats(originalStats);

        setAlertState({
          variant: "error",
          message: "Failed to submit review",
          description:
            "Please try again or contact support if the issue persists.",
        });
        return;
      }

      if (data?.success) {
        setAlertState({
          variant: "success",
          message: `Review submitted successfully`,
          description: `Task ${decision}. You earned ${estimatedXP} XP and ${estimatedPoints} points.`,
        });

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
        <Button variant="outline" className="gap-2">
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
          iconColor="text-green-500"
        />
        <StatsCardComponent
          title="Tasks Tested By You"
          value={
            loading ? "..." : peerReviewStats.tasksReviewedByUser.toString()
          }
          subtitle="Reviews completed"
          icon={User}
          iconColor="text-pink-500"
        />
        <StatsCardComponent
          title="Points Earned"
          value={loading ? "..." : peerReviewStats.totalPointsEarned.toString()}
          subtitle="From peer reviews"
          icon={CreditCard}
          iconColor="text-orange-500"
        />
        <StatsCardComponent
          title="XP Earned"
          value={loading ? "..." : peerReviewStats.totalXpEarned.toString()}
          subtitle="From peer reviews"
          icon={Zap}
          iconColor="text-purple-500"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="available-tests" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger
            value="available-tests"
            className="flex items-center gap-2"
          >
            <Trophy className="h-4 w-4" />
            Available Tests
          </TabsTrigger>
          <TabsTrigger value="my-tests" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            My Tests
          </TabsTrigger>
          <TabsTrigger value="my-tasks" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            My Tasks
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
                      XP Reward
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
                        colSpan={6}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No tasks available for review
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
                    XP Reward
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
                      colSpan={6}
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
                        colSpan={6}
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
                            setSelectedFeedbackTask(task);
                            setFeedbackModalOpen(true);
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
      <TaskDetailsModal
        mode="feedback"
        isOpen={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        taskData={selectedFeedbackTask || undefined}
      />
    </div>
  );
}
