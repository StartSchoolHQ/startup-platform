"use client";

import { useState, useEffect } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

import { Trophy, CheckCircle2, Users, ExternalLink, Clock } from "lucide-react";
import { peerReviewData } from "@/data/peer-review-data";
import { StatsCardComponent } from "@/components/dashboard/stats-card";
import {
  getAvailableTasksForReview,
  getMySubmittedTasksForReview,
} from "@/lib/database";
import { useApp } from "@/contexts/app-context";
import { createClient } from "@/lib/supabase/client";
import { TaskRow } from "@/components/tasks/task-row";

import { TaskDetailsModal } from "@/components/ui/task-details-modal";

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
  const [acceptingTaskId, setAcceptingTaskId] = useState<string | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedTaskForReview, setSelectedTaskForReview] =
    useState<AvailableTask | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [reviewDecision, setReviewDecision] = useState<
    "accepted" | "rejected" | null
  >(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [selectedFeedbackTask, setSelectedFeedbackTask] =
    useState<AvailableTask | null>(null);

  useEffect(() => {
    const loadTasks = async () => {
      if (!user?.id) return;

      try {
        const [available, mySubmitted] = await Promise.all([
          getAvailableTasksForReview(user.id),
          getMySubmittedTasksForReview(user.id),
        ]);

        // Load tasks that current user has accepted for review
        const supabase = createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: acceptedTasksData } = await (supabase as any)
          .from("team_task_progress")
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

    setAcceptingTaskId(taskId);

    try {
      // Check if user already has a task assigned for review
      if (myAcceptedTasks.length > 0) {
        alert(
          "You can only review one task at a time. Please complete or cancel your current review first."
        );
        setAcceptingTaskId(null);
        return;
      }

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
        alert("Failed to accept task for review. Please try again.");
        return;
      }

      if (data?.success) {
        // Move task from available to accepted
        const acceptedTask = availableTasks.find((task) => task.id === taskId);
        if (acceptedTask) {
          setMyAcceptedTasks((prev) => [...prev, acceptedTask]);
          setAvailableTasks((prev) =>
            prev.filter((task) => task.id !== taskId)
          );
        }

        alert('Task accepted for review! Check the "My Tests" tab.');
      } else {
        alert(data?.error || "Failed to accept task for review");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setAcceptingTaskId(null);
    }
  };

  const openReviewModal = (task: AvailableTask) => {
    setSelectedTaskForReview(task);
    setReviewModalOpen(true);
    setReviewDecision(null);
    setReviewFeedback("");
  };

  const submitReview = async () => {
    if (!selectedTaskForReview || !reviewDecision || !user?.id) return;

    setSubmittingReview(true);

    try {
      const supabase = createClient();

      // Call database function to submit peer review
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc(
        "submit_external_peer_review",
        {
          p_progress_id: selectedTaskForReview.id,
          p_decision: reviewDecision,
          p_feedback: reviewFeedback || null,
        }
      );

      if (error) {
        console.error("Error submitting review:", error);
        alert("Failed to submit review. Please try again.");
        return;
      }

      if (data?.success) {
        // Remove task from accepted tasks
        setMyAcceptedTasks((prev) =>
          prev.filter((task) => task.id !== selectedTaskForReview.id)
        );
        setReviewModalOpen(false);
        alert(`Review submitted! Task ${reviewDecision}.`);
      } else {
        alert(data?.error || "Failed to submit review");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred. Please try again.");
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
        {peerReviewData.statsCards.map((card, index) => (
          <StatsCardComponent key={index} {...card} />
        ))}
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
          setReviewFeedback(feedback);
          setReviewDecision(decision);
          await submitReview();
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
