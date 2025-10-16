"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Trophy,
  CheckCircle2,
  Users,
  Medal,
  Zap,
  ExternalLink,
  Clock,
} from "lucide-react";
import { peerReviewData } from "@/data/peer-review-data";
import { StatsCardComponent } from "@/components/dashboard/stats-card";
import {
  getAvailableTasksForReview,
  getMySubmittedTasksForReview,
} from "@/lib/database";
import { useApp } from "@/contexts/app-context";
import { createClient } from "@/lib/supabase/client";

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
              category
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

  const getDifficultyConfig = (difficulty: number | string) => {
    const level =
      typeof difficulty === "string" ? parseInt(difficulty) : difficulty;

    if (level <= 1) {
      return {
        text: "Easy",
        class: "bg-green-100 text-green-800 border-green-200",
      };
    } else if (level <= 3) {
      return {
        text: "Medium",
        class: "bg-yellow-100 text-yellow-800 border-yellow-200",
      };
    } else {
      return {
        text: "Hard",
        class: "bg-red-100 text-red-800 border-red-200",
      };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
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
                      .map((task) => {
                        const difficultyConfig = getDifficultyConfig(
                          task.tasks!.difficulty_level
                        );

                        return (
                          <tr
                            key={task.id}
                            className="border-b border-border hover:bg-muted/50"
                          >
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
                                  <Medal className="h-4 w-4" />
                                </div>
                                <div>
                                  <div className="font-medium text-sm">
                                    {task.tasks!.title}
                                  </div>
                                  <div className="text-xs text-muted-foreground max-w-xs truncate">
                                    {task.tasks!.description}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                <span className="text-sm font-medium">
                                  {task.teams!.name}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <Badge
                                variant="secondary"
                                className={difficultyConfig.class}
                              >
                                {difficultyConfig.text}
                              </Badge>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-1">
                                <Zap className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium">
                                  {task.tasks!.base_xp_reward}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="text-sm text-muted-foreground">
                                {formatDate(task.completed_at)}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex justify-end">
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="text-xs px-3 py-2"
                                  onClick={() => acceptTaskForReview(task.id)}
                                  disabled={
                                    acceptingTaskId === task.id ||
                                    myAcceptedTasks.length > 0
                                  }
                                  title={
                                    myAcceptedTasks.length > 0
                                      ? "You can only review one task at a time"
                                      : "Accept this task for review"
                                  }
                                >
                                  {acceptingTaskId === task.id
                                    ? "Accepting..."
                                    : myAcceptedTasks.length > 0
                                    ? "Max 1 Task"
                                    : "Accept Testing"}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
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
                  myAcceptedTasks.map((task) => {
                    const difficultyConfig = getDifficultyConfig(
                      task.tasks!.difficulty_level
                    );

                    return (
                      <tr
                        key={task.id}
                        className="border-b border-border hover:bg-muted/50"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
                              <Medal className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="font-medium text-sm">
                                {task.tasks!.title}
                              </div>
                              <div className="text-xs text-muted-foreground max-w-xs truncate">
                                {task.tasks!.description}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                            <span className="text-sm font-medium">
                              {task.teams!.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <Badge
                            variant="secondary"
                            className={difficultyConfig.class}
                          >
                            {difficultyConfig.text}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1">
                            <Zap className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium">
                              {task.tasks!.base_xp_reward}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm text-muted-foreground">
                            {formatDate(task.completed_at)}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex justify-end">
                            <Button
                              variant="default"
                              size="sm"
                              className="text-xs px-3 py-2"
                              onClick={() => openReviewModal(task)}
                            >
                              Review Task
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
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
                      .map((task) => {
                        const difficultyConfig = getDifficultyConfig(
                          task.tasks!.difficulty_level
                        );

                        return (
                          <tr
                            key={task.id}
                            className="border-b border-border hover:bg-muted/50"
                          >
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
                                  <Medal className="h-4 w-4" />
                                </div>
                                <div>
                                  <div className="font-medium text-sm">
                                    {task.tasks!.title}
                                  </div>
                                  <div className="text-xs text-muted-foreground max-w-xs truncate">
                                    {task.tasks!.description}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-sm font-medium">
                                  {task.teams!.name}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <Badge
                                variant="secondary"
                                className={difficultyConfig.class}
                              >
                                {difficultyConfig.text}
                              </Badge>
                            </td>
                            <td className="py-4 px-4">
                              <Badge
                                variant="secondary"
                                className={
                                  task.status === "approved"
                                    ? "bg-green-100 text-green-800 border-green-200"
                                    : task.status === "rejected"
                                    ? "bg-red-100 text-red-800 border-red-200"
                                    : task.status === "revision_required"
                                    ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                                    : "bg-orange-100 text-orange-800 border-orange-200"
                                }
                              >
                                {task.status === "approved"
                                  ? "Accepted"
                                  : task.status === "rejected"
                                  ? "Rejected"
                                  : task.status === "revision_required"
                                  ? "Revision Required"
                                  : "Pending Review"}
                              </Badge>
                            </td>
                            <td className="py-4 px-4">
                              <div className="text-sm text-muted-foreground">
                                {formatDate(task.completed_at)}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs px-3 py-2"
                                >
                                  View Submission
                                </Button>
                                {(task.status === "approved" ||
                                  task.status === "rejected" ||
                                  task.status === "revision_required") &&
                                  task.submission_notes &&
                                  task.submission_notes.includes(
                                    "Peer Review:"
                                  ) && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-xs px-3 py-2"
                                      onClick={() => {
                                        setSelectedFeedbackTask(task);
                                        setFeedbackModalOpen(true);
                                      }}
                                    >
                                      View Feedback
                                    </Button>
                                  )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Review Modal */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              Review Task: {selectedTaskForReview?.tasks?.title}
            </DialogTitle>
          </DialogHeader>

          {selectedTaskForReview && (
            <div className="space-y-6 overflow-y-auto flex-1 pr-2">
              {/* Task Info */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Task Details</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {selectedTaskForReview.tasks?.description}
                </p>
                <div className="flex gap-4 text-sm">
                  <span>
                    Team: <strong>{selectedTaskForReview.teams?.name}</strong>
                  </span>
                  <span>
                    XP Reward:{" "}
                    <strong>
                      {selectedTaskForReview.tasks?.base_xp_reward}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Submission Data */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Submission</h3>
                {selectedTaskForReview.submission_data ? (
                  (() => {
                    // Parse submission data if it's a string
                    let submission: Record<string, unknown>;
                    try {
                      submission =
                        typeof selectedTaskForReview.submission_data ===
                        "string"
                          ? JSON.parse(selectedTaskForReview.submission_data)
                          : (selectedTaskForReview.submission_data as Record<
                              string,
                              unknown
                            >);
                    } catch (error) {
                      console.error("Error parsing submission data:", error);
                      submission = {};
                    }

                    return (
                      <div className="space-y-3">
                        {typeof submission.description === "string" &&
                          submission.description && (
                            <div>
                              <span className="font-medium text-sm">
                                Description:
                              </span>
                              <p className="text-sm mt-1">
                                {submission.description}
                              </p>
                            </div>
                          )}

                        {Array.isArray(submission.files) &&
                          submission.files.length > 0 && (
                            <div>
                              <span className="font-medium text-sm">
                                Files:
                              </span>
                              <div className="mt-2 space-y-3">
                                {submission.files.map(
                                  (file: unknown, index: number) => {
                                    const fileUrl = String(file);
                                    const fileName =
                                      fileUrl.split("/").pop() ||
                                      `File ${index + 1}`;
                                    const isImage =
                                      /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(
                                        fileName
                                      );

                                    return (
                                      <div key={index} className="space-y-2">
                                        <a
                                          href={fileUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-800 text-sm block"
                                        >
                                          📎 {fileName}
                                        </a>
                                        {isImage && (
                                          <div className="border rounded-lg p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 mt-2">
                                            <div className="text-sm font-medium text-blue-800 mb-3 flex items-center gap-2">
                                              <svg
                                                className="w-4 h-4"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                              >
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  strokeWidth={2}
                                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                />
                                              </svg>
                                              Image Preview
                                            </div>
                                            <div className="relative bg-white rounded-lg p-2 shadow-sm">
                                              {/* eslint-disable-next-line @next/next/no-img-element */}
                                              <img
                                                src={fileUrl}
                                                alt={fileName}
                                                className="w-full max-h-80 object-contain rounded border"
                                                onError={(e) => {
                                                  console.error(
                                                    "Image failed to load:",
                                                    fileUrl
                                                  );
                                                  const target =
                                                    e.target as HTMLImageElement;
                                                  target.style.display = "none";
                                                  const errorDiv =
                                                    document.createElement(
                                                      "div"
                                                    );
                                                  errorDiv.className =
                                                    "text-red-600 text-sm p-4 text-center";
                                                  errorDiv.textContent =
                                                    "Failed to load image";
                                                  target.parentNode?.appendChild(
                                                    errorDiv
                                                  );
                                                }}
                                                onLoad={() => {
                                                  console.log(
                                                    "Image loaded successfully:",
                                                    fileUrl
                                                  );
                                                }}
                                              />
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  }
                                )}
                              </div>
                            </div>
                          )}

                        {Array.isArray(submission.external_urls) &&
                          submission.external_urls.length > 0 && (
                            <div>
                              <span className="font-medium text-sm">
                                External URLs:
                              </span>
                              <div className="mt-2 space-y-2">
                                {submission.external_urls.map(
                                  (url: unknown, index: number) => (
                                    <div
                                      key={index}
                                      className="border rounded-lg p-3 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200"
                                    >
                                      <div className="flex items-center gap-2 mb-1">
                                        <svg
                                          className="w-4 h-4 text-green-600"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                                          />
                                        </svg>
                                        <span className="text-sm font-medium text-green-800">
                                          External Link
                                        </span>
                                      </div>
                                      <a
                                        href={String(url)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 text-sm break-all underline"
                                      >
                                        {String(url)}
                                      </a>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                        {typeof submission.submitted_at === "string" &&
                          submission.submitted_at && (
                            <div>
                              <span className="font-medium text-sm">
                                Submitted:
                              </span>
                              <p className="text-sm text-muted-foreground mt-1">
                                {new Date(
                                  submission.submitted_at
                                ).toLocaleString()}
                              </p>
                            </div>
                          )}
                      </div>
                    );
                  })()
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No submission data available
                  </p>
                )}
              </div>

              {/* Review Form */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Review Feedback
                  </label>
                  <Textarea
                    value={reviewFeedback}
                    onChange={(e) => setReviewFeedback(e.target.value)}
                    placeholder="Provide feedback on the task submission..."
                    rows={4}
                  />
                </div>

                <div className="flex gap-4">
                  <Button
                    variant={
                      reviewDecision === "accepted" ? "default" : "outline"
                    }
                    onClick={() => setReviewDecision("accepted")}
                    className="flex-1"
                  >
                    Accept Task
                  </Button>
                  <Button
                    variant={
                      reviewDecision === "rejected" ? "destructive" : "outline"
                    }
                    onClick={() => setReviewDecision("rejected")}
                    className="flex-1"
                  >
                    Reject Task
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Fixed Footer with Action Buttons */}
          <div className="flex gap-2 pt-4 border-t bg-background flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => setReviewModalOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={submitReview}
              disabled={!reviewDecision || submittingReview}
              className="flex-1"
            >
              {submittingReview ? "Submitting..." : "Submit Review"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feedback Modal */}
      <Dialog open={feedbackModalOpen} onOpenChange={setFeedbackModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>Peer Review Feedback</span>
              {selectedFeedbackTask && (
                <Badge
                  variant="secondary"
                  className={
                    selectedFeedbackTask.status === "approved"
                      ? "bg-green-100 text-green-800"
                      : selectedFeedbackTask.status === "rejected"
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                  }
                >
                  {selectedFeedbackTask.status === "approved"
                    ? "Accepted"
                    : selectedFeedbackTask.status === "rejected"
                    ? "Rejected"
                    : "Revision Required"}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedFeedbackTask && (
            <div className="space-y-4">
              {/* Task Info */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-medium text-sm mb-1">
                  {selectedFeedbackTask.tasks?.title}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Team: {selectedFeedbackTask.teams?.name}
                </p>
              </div>

              {/* Reviewer Feedback */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    Reviewer Feedback:
                  </span>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {selectedFeedbackTask.submission_notes
                      ?.split("Peer Review:")
                      .pop()
                      ?.trim() || "No feedback provided"}
                  </p>
                </div>
              </div>

              {/* Reviewer Info */}
              {selectedFeedbackTask.reviewer && (
                <div className="flex items-center gap-3 pt-4 border-t">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center">
                    {selectedFeedbackTask.reviewer.avatar_url ? (
                      <Image
                        src={selectedFeedbackTask.reviewer.avatar_url}
                        alt={selectedFeedbackTask.reviewer.name}
                        width={40}
                        height={40}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-bold text-sm">
                        {selectedFeedbackTask.reviewer.name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase() || "PR"}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      {selectedFeedbackTask.reviewer.name || "Peer Reviewer"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Reviewed on{" "}
                      {formatDate(selectedFeedbackTask.completed_at)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button onClick={() => setFeedbackModalOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
