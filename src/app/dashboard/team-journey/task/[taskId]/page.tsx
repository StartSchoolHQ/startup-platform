"use client";

import posthog from "posthog-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  FileText,
  Zap,
  CreditCard,
  Clock,
  User,
  CheckCircle,
  AlertCircle,
  Play,
  ExternalLink,
} from "lucide-react";
import { useEffect, useState, use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TeamTask } from "@/types/team-journey";
import {
  getTaskByIdLazy,
  startTask,
  startTaskLazy,
  completeTask,
  cancelTask,
  retryTask,
  checkTaskPermission,
  reassignTask,
} from "@/lib/tasks";
import { useAppContext } from "@/contexts/app-context";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { invalidateNotifications } from "@/hooks/use-task-notifications";
import { toast } from "sonner";
import { TaskDetailsModal } from "@/components/ui/task-details-modal";
import { StatusBadge, TaskStatus } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/date-utils";
import { uploadTaskFiles } from "@/lib/file-upload";
import ReactMarkdown from "react-markdown";
import { TaskDetailSkeleton } from "@/components/ui/task-detail-skeleton";
import { peerReviewHistorySchema } from "@/lib/validation-schemas";
import { SuggestEditsModal } from "@/components/tasks/suggest-edits-modal";

interface TaskDetailPageProps {
  params: Promise<{
    taskId: string;
  }>;
}

export default function TaskDetailPage(props: TaskDetailPageProps) {
  const params = use(props.params);
  const { user } = useAppContext();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [taskId, setTaskId] = useState<string | null>(null);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [showSuggestEditsModal, setShowSuggestEditsModal] = useState(false);

  // Extract ID from params
  useEffect(() => {
    const extractId = async () => {
      const { taskId } = await params;
      setTaskId(taskId);
    };
    extractId();
  }, [params]);

  // Main task query
  const {
    data: task = null,
    isLoading: loading,
    refetch: refetchTask,
  } = useQuery({
    queryKey: ["task", taskId, user?.id],
    queryFn: () => getTaskByIdLazy(taskId!, user!.id),
    enabled: !!taskId && !!user?.id,
  });

  // Validate peer_review_history with Zod
  const parsed = peerReviewHistorySchema.safeParse(task?.peer_review_history);
  const validatedReviewHistory = parsed.success ? parsed.data : [];
  if (!parsed.success && task?.peer_review_history) {
    console.error(
      "Invalid peer_review_history in task detail page:",
      parsed.error,
    );
  }

  // Check if task is recurring
  const isRecurringTask =
    task?.title?.includes("Weekly") || (task as any)?.is_recurring === true;

  // Check if task has submission data
  const hasSubmission =
    task?.submission_data &&
    Object.keys(task.submission_data).length > 0;

  // Team name query (conditional)
  const { data: teamName = null } = useQuery({
    queryKey: ["team", "name", task?.team_id],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("teams")
        .select("name")
        .eq("id", task!.team_id!)
        .single();
      return data?.name || null;
    },
    enabled: !!task?.team_id,
    staleTime: 5 * 60 * 1000, // 5 minutes - team names don't change often
  });

  // Permissions query (conditional)
  const {
    data: permissions = {
      canStart: false,
      canComplete: false,
      canCancel: false,
      canReassign: false,
      userRole: "unknown",
      isAssignedUser: false,
    },
    refetch: refetchPermissions,
  } = useQuery({
    queryKey: [
      "task",
      "permissions",
      task?.progress_id,
      task?.status,
      user?.id,
    ],
    queryFn: async () => {
      if (!task?.progress_id || task.progress_id === "none") {
        // New task without progress - default permissions
        return {
          canStart: true,
          canComplete: false,
          canCancel: false,
          canReassign: false,
          userRole: "member",
          isAssignedUser: false,
        };
      }

      // Check all permissions in parallel
      const [startPerm, completePerm, cancelPerm, reassignPerm] =
        await Promise.all([
          checkTaskPermission(task.progress_id, user!.id, "start"),
          checkTaskPermission(task.progress_id, user!.id, "complete"),
          checkTaskPermission(task.progress_id, user!.id, "cancel"),
          checkTaskPermission(task.progress_id, user!.id, "reassign"),
        ]);

      const result = {
        canStart: startPerm.canManage,
        canComplete: completePerm.canManage,
        canCancel: cancelPerm.canManage,
        canReassign: reassignPerm.canManage,
        userRole: startPerm.userRole,
        isAssignedUser: startPerm.isAssignedUser,
      };

      return result;
    },
    enabled: !!task && !!user?.id,
  });

  // Team members query (conditional on reassign permission)
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team", "members", task?.team_id],
    queryFn: async () => {
      const supabase = createClient();
      const { data: members } = await supabase
        .from("team_members")
        .select(
          `
          user_id,
          users!user_id(
            id,
            name,
            avatar_url
          )
        `,
        )
        .eq("team_id", task!.team_id!)
        .is("left_at", null);

      if (!members) return [];

      return members.map((m: unknown) => {
        const member = m as {
          users: {
            id: string;
            name: string | null;
            avatar_url: string | null;
          };
        };
        return {
          id: member.users.id,
          name: member.users.name || "Unknown User",
          avatar_url: member.users.avatar_url || undefined,
        };
      });
    },
    enabled: !!task?.team_id && !!permissions?.canReassign,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Previous submissions query (conditional on recurring task)
  const { data: previousSubmissions = [], isLoading: loadingSubmissions } =
    useQuery({
      queryKey: ["task", "submissions", task?.task_id, task?.team_id],
      queryFn: async () => {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("task_progress")
          .select(
            `
            id,
            status,
            completed_at,
            assigned_to_user_id,
            submission_data,
            submission_url,
            review_feedback,
            users!inner(name, avatar_url)
          `,
          )
          .eq("task_id", task!.task_id)
          .eq("team_id", task!.team_id!)
          .neq("id", task!.id)
          .in("status", ["approved", "rejected"])
          .order("completed_at", { ascending: false });

        if (error) {
          console.error("Error loading previous submissions:", error);
          return [];
        }

        return data || [];
      },
      enabled: !!task && !!isRecurringTask && !!task.team_id,
      staleTime: 60 * 1000, // 1 minute
    });

  // Start task mutation
  const startTaskMutation = useMutation({
    mutationFn: async () => {
      if (!task || !user?.id) throw new Error("Missing data");

      if (task.progress_id && task.progress_id !== "none") {
        return await startTask(task.progress_id, user.id);
      } else {
        return await startTaskLazy(
          task.task_id,
          task.team_id || undefined,
          user.id,
          "team",
        );
      }
    },
    onMutate: async () => {
      // Optimistically update UI to show in_progress state
      await queryClient.cancelQueries({ queryKey: ["task", taskId] });

      const previousTask = queryClient.getQueryData(["task", taskId, user?.id]);

      queryClient.setQueryData(["task", taskId, user?.id], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          status: "in_progress",
          started_at: new Date().toISOString(),
        };
      });

      return { previousTask };
    },
    onSuccess: async (success) => {
      if (success) {
        posthog.capture("task_started", {
          task_id: taskId,
          task_title: task?.title,
          task_category: task?.category,
          team_id: task?.team_id,
        });
        await refetchTask();
        await refetchPermissions(); // Explicitly refetch permissions
        queryClient.invalidateQueries({ queryKey: ["teamJourney"] });
        toast.success("Task started successfully!");
      } else {
        toast.error("Failed to start task");
      }
    },
    onError: (error, variables, context: any) => {
      // Revert optimistic update on error
      if (context?.previousTask) {
        queryClient.setQueryData(
          ["task", taskId, user?.id],
          context.previousTask,
        );
      }
      console.error("Error starting task:", error);
      toast.error("Failed to start task");
    },
  });

  // Complete task mutation
  const completeTaskMutation = useMutation({
    mutationFn: async (submissionData: {
      description?: string;
      external_urls: Array<{ url: string; title: string; type: string }>;
      files: File[];
      submitted_at: string;
      [key: string]: unknown;
    }) => {
      if (!task?.progress_id || !user?.id) throw new Error("Missing data");

      // Upload files first
      let uploadedFileUrls: string[] = [];
      if (submissionData.files.length > 0) {
        const uploadResults = await uploadTaskFiles(
          submissionData.files,
          task.progress_id,
          user.id,
        );
        uploadedFileUrls = uploadResults.map((result) => result.url);
      }

      // Prepare submission data
      const dbSubmissionData = {
        ...submissionData,
        files: uploadedFileUrls,
        completed_by: user.id,
        completion_date: new Date().toISOString(),
      };

      return await completeTask(task.progress_id, dbSubmissionData);
    },
    onSuccess: async (success) => {
      if (success) {
        posthog.capture("task_submitted", {
          task_id: taskId,
          task_title: task?.title,
          task_category: task?.category,
          team_id: task?.team_id,
          base_xp_reward: task?.base_xp_reward,
        });
        setShowSubmissionModal(false);
        await refetchTask(); // Refetch task data
        queryClient.invalidateQueries({ queryKey: ["dashboard", "stats"] });
        queryClient.invalidateQueries({ queryKey: ["teamJourney", "stats"] });
        invalidateNotifications(queryClient, user?.id);
        toast.success("Task Submitted Successfully! ✅", {
          description:
            "Your task is in the peer review queue. You'll be notified when complete (2-3 days).",
          duration: 5000,
        });
      } else {
        posthog.capture("task_submission_failed", {
          task_id: taskId,
          task_title: task?.title,
          reason: "submission_returned_false",
        });
        toast.error("Failed to submit task", {
          description: "Please check your internet connection and try again.",
        });
      }
    },
    onError: (error) => {
      posthog.capture("task_submission_failed", {
        task_id: taskId,
        task_title: task?.title,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      console.error("Error completing task:", error);
      toast.error("Failed to submit task");
    },
  });

  // Cancel task mutation
  const cancelTaskMutation = useMutation({
    mutationFn: async () => {
      if (!task?.progress_id || !user?.id) throw new Error("Missing data");
      return await cancelTask(task.progress_id, user.id);
    },
    onSuccess: (success) => {
      if (success) {
        posthog.capture("task_cancelled", {
          task_id: taskId,
          task_title: task?.title,
          task_category: task?.category,
          team_id: task?.team_id,
        });
        toast.success("Task cancelled successfully");
        queryClient.invalidateQueries({ queryKey: ["task", taskId] });
        queryClient.invalidateQueries({ queryKey: ["task", "permissions"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard", "stats"] });
        queryClient.invalidateQueries({ queryKey: ["teamJourney", "stats"] });
        queryClient.invalidateQueries({ queryKey: ["teamJourney"] }); // Refresh tasks list
        // Navigate back to team journey page since task is no longer in progress
        const teamId = task?.team_id || task?.teams?.id;
        if (teamId) {
          router.push(`/dashboard/team-journey/${teamId}`);
        } else {
          router.push("/dashboard/team-journey");
        }
      } else {
        toast.error("Failed to cancel task");
      }
    },
    onError: (error) => {
      console.error("Error cancelling task:", error);
      toast.error("Failed to cancel task");
    },
  });

  // Retry task mutation
  const retryTaskMutation = useMutation({
    mutationFn: async () => {
      if (!task?.progress_id || !user?.id) throw new Error("Missing data");
      return await retryTask(task.progress_id, user.id);
    },
    onSuccess: (success) => {
      if (success) {
        posthog.capture("task_retried", {
          task_id: taskId,
          task_title: task?.title,
          task_category: task?.category,
          team_id: task?.team_id,
        });
        queryClient.invalidateQueries({ queryKey: ["task", taskId] });
        queryClient.invalidateQueries({ queryKey: ["task", "permissions"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard", "stats"] });
        queryClient.invalidateQueries({ queryKey: ["teamJourney", "stats"] });
      } else {
        toast.error("Failed to retry task");
      }
    },
    onError: (error) => {
      console.error("Error retrying task:", error);
      toast.error("Failed to retry task");
    },
  });

  // Reassign task mutation
  const reassignTaskMutation = useMutation({
    mutationFn: async (newUserId: string) => {
      if (!task?.progress_id || !user?.id) throw new Error("Missing data");
      return await reassignTask(task.progress_id, newUserId, user.id);
    },
    onSuccess: (success) => {
      if (success) {
        posthog.capture("task_reassigned", {
          task_id: taskId,
          task_title: task?.title,
          team_id: task?.team_id,
        });
        setShowReassignModal(false);
        queryClient.invalidateQueries({ queryKey: ["task", taskId] });
        queryClient.invalidateQueries({ queryKey: ["task", "permissions"] });
        toast.success("Task reassigned successfully");
      } else {
        toast.error("Failed to reassign task");
      }
    },
    onError: (error) => {
      console.error("Error reassigning task:", error);
      toast.error("Failed to reassign task");
    },
  });

  // Action handlers
  const handleStartTask = () => startTaskMutation.mutate();
  const handleCompleteTask = () => setShowSubmissionModal(true);
  const handleSubmissionSubmit = async (submissionData: any) => {
    completeTaskMutation.mutate(submissionData);
  };
  const handleCancelTask = () => cancelTaskMutation.mutate();
  const handleRetryTask = () => retryTaskMutation.mutate();
  const handleReassignTask = (newUserId: string) =>
    reassignTaskMutation.mutate(newUserId);

  // Individual loading states for each button
  const actionLoading = reassignTaskMutation.isPending; // Only for reassign modal

  if (loading) {
    return <TaskDetailSkeleton />;
  }

  if (!task) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Task not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard/team-journey">Products</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link
                href={`/dashboard/team-journey/${
                  task.team_id || task.teams?.id
                }`}
              >
                {teamName || task.teams?.name || "Product"}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <span
              className="font-medium truncate max-w-[200px]"
              title={task.title}
            >
              {task.title}
            </span>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      {/* Task Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{task.title}</h1>
            <StatusBadge status={task.status as TaskStatus} variant="journey" />
          </div>
          <p className="text-muted-foreground text-lg">
            {(() => {
              // Map database categories to achievement names
              const categoryToAchievementMap: Record<string, string> = {
                development: "Product Foundation",
                design: "Product Foundation",
                testing: "Product Foundation",
                deployment: "Product Foundation",
                marketing: "Customer Acquisition",
                business: "Team & Growth",
                onboarding: "Team & Growth",
                milestone: "Revenue Generation",
              };

              const category = task.category?.toLowerCase();
              return category
                ? categoryToAchievementMap[category] || task.category
                : "No category assigned";
            })()}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="task" className="w-full">
            <TabsList
              className={`grid w-full`}
              style={{
                gridTemplateColumns: `repeat(${3 + (hasSubmission ? 1 : 0) + (isRecurringTask ? 1 : 0)}, minmax(0, 1fr))`,
              }}
            >
              <TabsTrigger value="task" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Task
              </TabsTrigger>
              {hasSubmission && (
                <TabsTrigger
                  value="submission"
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Submission
                </TabsTrigger>
              )}
              <TabsTrigger
                value="peer-review"
                className="flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                Peer Review
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                History
              </TabsTrigger>
              {isRecurringTask && (
                <TabsTrigger
                  value="submissions"
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Previous ({previousSubmissions.length})
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="task" className="space-y-6 mt-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle className="text-lg font-semibold">
                    Task Information
                  </CardTitle>
                  <Button
                    variant="link"
                    className="text-blue-500 p-0 h-auto"
                    onClick={() => setShowSuggestEditsModal(true)}
                  >
                    Suggest Edits
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                  {task.detailed_instructions ? (
                    <div className="prose max-w-none text-gray-700 leading-relaxed [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-3 [&_h2]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:space-y-1.5 [&_li]:leading-relaxed [&_p]:leading-relaxed [&_p]:mb-3 [&_strong]:font-bold [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm">
                      <ReactMarkdown>
                        {task.detailed_instructions}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">
                        Task Description
                      </h3>
                      <p className="text-gray-700 leading-relaxed">
                        {task.description ||
                          "No detailed instructions available for this task yet."}
                      </p>
                    </div>
                  )}

                  {/* Learning Objectives */}
                  {task.learning_objectives &&
                    Array.isArray(task.learning_objectives) &&
                    task.learning_objectives.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3">
                          Learning Objectives
                        </h3>
                        <ul className="space-y-2 text-gray-700">
                          {task.learning_objectives.map((objective, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                              <span className="break-words">{objective}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {/* Deliverables */}
                  {task.deliverables &&
                    Array.isArray(task.deliverables) &&
                    task.deliverables.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3">
                          Expected Deliverables
                        </h3>
                        <ul className="space-y-2 text-gray-700">
                          {task.deliverables.map((deliverable, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span className="break-words">{deliverable}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TODO: Re-enable Tips tab for full release */}
            {/* <TabsContent value="tips" className="space-y-6 mt-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle className="text-lg font-semibold">
                    Tips for task
                  </CardTitle>
                  <Button
                    variant="link"
                    className="text-blue-500 p-0 h-auto"
                    disabled
                    title="Coming soon"
                  >
                    Suggest Edits
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                  {task.tips_content &&
                  Array.isArray(task.tips_content) &&
                  task.tips_content.length > 0 ? (
                    task.tips_content.map((tip, index) => (
                      <div
                        key={index}
                        className="border-l-4 border-blue-500 pl-4"
                      >
                        <h3 className="text-lg font-semibold mb-3 text-blue-900">
                          {tip.title}
                        </h3>
                        <p className="text-gray-700 leading-relaxed">
                          {tip.content}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">
                        No tips available
                      </h3>
                      <p className="text-gray-700 leading-relaxed">
                        Tips and best practices for this task haven&apos;t been
                        added yet. Check back later or reach out to your mentor
                        for guidance.
                      </p>
                    </div>
                  )}

                  {/* Resources */}
            {/* {task.resources &&
                    Array.isArray(task.resources) &&
                    task.resources.length > 0 && (
                      <div className="border-t pt-6">
                        <h3 className="text-lg font-semibold mb-3">
                          Helpful Resources
                        </h3>
                        <div className="grid gap-3">
                          {task.resources.map((resource, index) => (
                            <a
                              key={index}
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors group cursor-pointer"
                            >
                              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 group-hover:bg-blue-200">
                                <FileText className="h-4 w-4 text-blue-600" />
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-blue-700 group-hover:text-blue-800">
                                  {resource.title}
                                </div>
                                {resource.description && (
                                  <div className="text-sm text-gray-600">
                                    {resource.description}
                                  </div>
                                )}
                                <div className="text-xs text-blue-600 capitalize">
                                  {resource.type} • Click to open
                                </div>
                                <div className="text-xs text-gray-400 mt-1 truncate">
                                  {resource.url}
                                </div>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )} */}
            {/* </CardContent>
              </Card>
            </TabsContent> */}

            {/* Submission Tab - Shows what the member actually submitted */}
            {hasSubmission && (
              <TabsContent value="submission" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">
                      Task Submission
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      What was delivered for this task
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Description */}
                    {typeof task.submission_data?.description === "string" &&
                      task.submission_data.description && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">
                            Description
                          </h4>
                          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {task.submission_data.description}
                          </p>
                        </div>
                      )}

                    {/* External URLs */}
                    {Array.isArray(task.submission_data?.external_urls) &&
                      task.submission_data.external_urls.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">
                            External Resources
                          </h4>
                          <div className="space-y-2">
                            {(
                              task.submission_data.external_urls as Array<{
                                url: string;
                                title?: string;
                                type?: string;
                              }>
                            ).map((urlItem, index) => {
                              const url =
                                typeof urlItem === "string"
                                  ? urlItem
                                  : urlItem?.url;
                              const title =
                                typeof urlItem === "string"
                                  ? urlItem
                                  : urlItem?.title || "External Link";

                              return (
                                <a
                                  key={index}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted/50 hover:border-blue-300 transition-colors group"
                                >
                                  <ExternalLink className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <div className="text-sm font-medium text-blue-700 group-hover:text-blue-800">
                                      {title}
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                      {url}
                                    </div>
                                  </div>
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}

                    {/* Files */}
                    {Array.isArray(task.submission_data?.files) &&
                      task.submission_data.files.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">
                            Uploaded Files
                          </h4>
                          <div className="space-y-3">
                            {(task.submission_data.files as string[]).map(
                              (fileUrl, index) => {
                                const fileName =
                                  fileUrl.split("/").pop() ||
                                  `File ${index + 1}`;
                                const isImage =
                                  /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(
                                    fileName,
                                  );

                                return (
                                  <div key={index} className="space-y-2">
                                    <a
                                      href={fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-2"
                                    >
                                      <FileText className="h-4 w-4 flex-shrink-0" />
                                      {fileName}
                                    </a>
                                    {isImage && (
                                      <div className="border rounded-lg p-2 bg-muted/30">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src={fileUrl}
                                          alt={fileName}
                                          className="w-full max-h-80 object-contain rounded"
                                          onError={(e) => {
                                            (
                                              e.target as HTMLImageElement
                                            ).style.display = "none";
                                          }}
                                        />
                                      </div>
                                    )}
                                  </div>
                                );
                              },
                            )}
                          </div>
                        </div>
                      )}

                    {/* Submitted at */}
                    {typeof task.submission_data?.submitted_at === "string" && (
                      <div className="pt-3 border-t text-sm text-muted-foreground">
                        Submitted on{" "}
                        {formatDate(task.submission_data.submitted_at)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            <TabsContent value="peer-review" className="space-y-6 mt-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle className="text-lg font-semibold">
                    Peer Review Criteria
                  </CardTitle>
                  <Button
                    variant="link"
                    className="text-blue-500 p-0 h-auto"
                    onClick={() => setShowSuggestEditsModal(true)}
                  >
                    Suggest Edits
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                  {task.peer_review_criteria &&
                  Array.isArray(task.peer_review_criteria) &&
                  task.peer_review_criteria.length > 0 ? (
                    task.peer_review_criteria.map((criteria, index) => (
                      <div key={index}>
                        <h3 className="text-lg font-semibold mb-3 text-purple-900">
                          {criteria.category}
                        </h3>
                        <div className="space-y-3">
                          {criteria.points.map((point, pointIndex) => (
                            <div
                              key={pointIndex}
                              className="text-gray-700 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:space-y-1.5 [&_li]:leading-relaxed [&_p]:leading-relaxed [&_strong]:font-bold"
                            >
                              <ReactMarkdown>{point}</ReactMarkdown>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">
                        No review criteria available
                      </h3>
                      <p className="text-gray-700 leading-relaxed">
                        Peer review criteria for this task haven&apos;t been
                        defined yet.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Peer Review Results */}
              {(task.status === "approved" ||
                task.status === "rejected" ||
                task.status === "revision_required") &&
              task.submission_notes &&
              task.submission_notes.includes("Peer Review:") ? (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-lg font-semibold">
                      Peer Review Results
                    </CardTitle>
                    <StatusBadge
                      status={task.status as TaskStatus}
                      variant="journey"
                    />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">
                          Reviewer Feedback:
                        </span>
                      </div>
                      <p className="text-gray-700 leading-relaxed">
                        {task.submission_notes
                          .split("Peer Review:")
                          .pop()
                          ?.trim() || "No feedback provided"}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 pt-4 border-t">
                      <Avatar className="w-8 h-8">
                        {task.reviewer_avatar_url ? (
                          <AvatarImage src={task.reviewer_avatar_url} />
                        ) : null}
                        <AvatarFallback className="bg-gradient-to-r from-purple-400 to-pink-400 text-white font-bold text-xs">
                          {task.reviewer_name
                            ? task.reviewer_name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                            : "PR"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">
                          {task.reviewer_name || "Peer Reviewer"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Reviewed on{" "}
                          {task.completed_at
                            ? formatDate(task.completed_at)
                            : "Recently"}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : task.status === "pending_review" ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">
                      Peer Review Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <Clock className="h-5 w-5 text-yellow-600" />
                      <div>
                        <p className="font-medium text-yellow-800">
                          Under Review
                        </p>
                        <p className="text-sm text-yellow-700">
                          This task is currently being reviewed by a peer.
                          Results will appear here once the review is complete.
                        </p>
                        {task.reviewer_name && (
                          <p className="text-sm text-yellow-700 mt-2">
                            Being reviewed by {task.reviewer_name}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (task.status === "approved" || task.status === "rejected") &&
                task.reviewer_name ? (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-lg font-semibold">
                      Peer Review Completed
                    </CardTitle>
                    <StatusBadge
                      status={task.status as TaskStatus}
                      variant="journey"
                    />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Reviewer Information */}
                    <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                      <Avatar className="w-10 h-10">
                        {task.reviewer_avatar_url ? (
                          <AvatarImage src={task.reviewer_avatar_url} />
                        ) : null}
                        <AvatarFallback className="bg-gradient-to-r from-purple-400 to-pink-400 text-white font-bold">
                          {task.reviewer_name
                            ? task.reviewer_name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                            : "PR"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {task.reviewer_name}
                          </span>
                          <Badge
                            variant="secondary"
                            className={`${
                              task.status === "approved"
                                ? "bg-green-100 text-green-800 border-green-200"
                                : "bg-red-100 text-red-800 border-red-200"
                            }`}
                          >
                            {task.status === "approved"
                              ? "Approved"
                              : "Rejected"}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Reviewed on{" "}
                          {task.updated_at
                            ? formatDate(task.updated_at)
                            : "Recently"}
                        </div>
                      </div>
                    </div>

                    {/* Review Feedback - Show only once */}
                    {(task.review_feedback ||
                      (task.submission_notes &&
                        task.submission_notes.includes("Peer Review:"))) && (
                      <div className="bg-gray-50 border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 text-gray-600" />
                          <span className="text-sm font-medium text-gray-800">
                            Review Feedback:
                          </span>
                        </div>
                        <p className="text-gray-700 leading-relaxed">
                          {task.review_feedback ||
                            task.submission_notes
                              ?.split("Peer Review:")
                              ?.pop()
                              ?.trim() ||
                            "No feedback provided"}
                        </p>
                      </div>
                    )}

                    {/* Complete Peer Review History */}
                    {validatedReviewHistory.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-sm font-medium text-gray-800 mb-3">
                          Review History
                        </h4>
                        <div className="space-y-3">
                          {validatedReviewHistory
                            .sort(
                              (a, b) =>
                                new Date(a.timestamp).getTime() -
                                new Date(b.timestamp).getTime(),
                            )
                            .map((event, index) => (
                              <div
                                key={index}
                                className="flex items-start gap-3 p-3 border rounded-lg bg-white"
                              >
                                <div
                                  className={`flex items-center justify-center w-6 h-6 rounded-full mt-1 ${
                                    event.event_type === "submitted_for_review"
                                      ? "bg-blue-500"
                                      : event.event_type === "reviewer_assigned"
                                        ? "bg-indigo-500"
                                        : event.decision === "approved"
                                          ? "bg-green-500"
                                          : "bg-red-500"
                                  }`}
                                >
                                  {event.event_type ===
                                    "submitted_for_review" && (
                                    <FileText className="w-3 h-3 text-white" />
                                  )}
                                  {event.event_type === "reviewer_assigned" && (
                                    <User className="w-3 h-3 text-white" />
                                  )}
                                  {event.event_type === "review_completed" &&
                                    event.decision === "approved" && (
                                      <CheckCircle className="w-3 h-3 text-white" />
                                    )}
                                  {event.event_type === "review_completed" &&
                                    event.decision === "rejected" && (
                                      <AlertCircle className="w-3 h-3 text-white" />
                                    )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-medium text-sm">
                                      {event.event_type ===
                                        "submitted_for_review" &&
                                        "Submitted for Review"}
                                      {event.event_type ===
                                        "reviewer_assigned" &&
                                        "Reviewer Assigned"}
                                      {event.event_type ===
                                        "review_completed" &&
                                        `Review ${
                                          event.decision || "Completed"
                                        }`}
                                    </p>
                                    {event.decision && (
                                      <Badge
                                        variant="secondary"
                                        className={`text-xs ${
                                          event.decision === "approved"
                                            ? "bg-green-100 text-green-800 border-green-200"
                                            : "bg-red-100 text-red-800 border-red-200"
                                        }`}
                                      >
                                        {event.decision === "approved"
                                          ? "Approved"
                                          : "Rejected"}
                                      </Badge>
                                    )}
                                  </div>

                                  {event.reviewer_name && (
                                    <div className="flex items-center gap-2 mb-1">
                                      <Avatar className="w-4 h-4">
                                        {event.reviewer_avatar_url ? (
                                          <AvatarImage
                                            src={event.reviewer_avatar_url}
                                          />
                                        ) : null}
                                        <AvatarFallback className="bg-gradient-to-r from-purple-400 to-pink-400 text-white text-[10px] font-bold">
                                          {event.reviewer_name
                                            ?.split(" ")
                                            .map((n) => n[0])
                                            .join("")
                                            .toUpperCase() || "R"}
                                        </AvatarFallback>
                                      </Avatar>
                                      <p className="text-xs text-muted-foreground">
                                        {event.reviewer_name}
                                      </p>
                                    </div>
                                  )}

                                  <p className="text-xs text-muted-foreground">
                                    {formatDate(event.timestamp)}
                                  </p>

                                  {/* Show feedback for review completed events */}
                                  {event.event_type === "review_completed" &&
                                    event.feedback && (
                                      <div className="bg-gray-50 border rounded p-2 mt-2">
                                        <p className="text-xs font-medium text-gray-800 mb-1">
                                          Review Feedback:
                                        </p>
                                        <p className="text-xs text-gray-700">
                                          {event.feedback}
                                        </p>
                                      </div>
                                    )}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">
                      Peer Review Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No peer review information available yet.</p>
                      <p className="text-sm">
                        Complete and submit this task to initiate peer review.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">
                    Task History
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Complete timeline of task lifecycle events
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Create a comprehensive timeline from all available events */}
                    {(() => {
                      // Collect all timeline events
                      const timelineEvents: Array<{
                        timestamp: string;
                        type: string;
                        title: string;
                        description?: string;
                        color: string;
                        icon?: React.ReactNode;
                        reviewer?: {
                          name: string;
                          avatar_url?: string;
                        };
                        status?: "approved" | "rejected";
                        feedback?: string;
                      }> = [];

                      // Add assignment event
                      if (task.assigned_at) {
                        timelineEvents.push({
                          timestamp: task.assigned_at,
                          type: "assigned",
                          title: "Task assigned",
                          description: task.assignee_name
                            ? `Assigned to ${task.assignee_name}`
                            : undefined,
                          color: "purple",
                        });
                      }

                      // Add start event
                      if (task.started_at) {
                        timelineEvents.push({
                          timestamp: task.started_at,
                          type: "started",
                          title: "Work started",
                          color: "yellow",
                        });
                      }

                      // Add peer review history events (if available)
                      if (validatedReviewHistory.length > 0) {
                        validatedReviewHistory.forEach((event) => {
                          if (event.event_type === "submitted_for_review") {
                            timelineEvents.push({
                              timestamp: event.timestamp,
                              type: "submitted_for_review",
                              title: "Task submitted for review",
                              description:
                                "Ready for peer review by external team members",
                              color: "blue",
                            });
                          } else if (event.event_type === "reviewer_assigned") {
                            timelineEvents.push({
                              timestamp: event.timestamp,
                              type: "reviewer_assigned",
                              title: "Reviewer assigned",
                              description: event.reviewer_name
                                ? `${event.reviewer_name} accepted this task for review`
                                : "External reviewer assigned",
                              color: "indigo",
                              reviewer: {
                                name: event.reviewer_name || "Reviewer",
                                avatar_url:
                                  event.reviewer_avatar_url || undefined,
                              },
                            });
                          } else if (event.event_type === "review_completed") {
                            timelineEvents.push({
                              timestamp: event.timestamp,
                              type: "review_completed",
                              title: `Peer review ${
                                event.decision || "completed"
                              }`,
                              color:
                                event.decision === "approved" ? "green" : "red",
                              icon:
                                event.decision === "approved" ? (
                                  <CheckCircle className="w-4 h-4 text-white bg-green-500 rounded-full" />
                                ) : (
                                  <AlertCircle className="w-4 h-4 text-white bg-red-500 rounded-full" />
                                ),
                              reviewer: {
                                name: event.reviewer_name || "Reviewer",
                                avatar_url:
                                  event.reviewer_avatar_url || undefined,
                              },
                              status:
                                event.decision === "approved" ||
                                event.decision === "rejected"
                                  ? event.decision
                                  : undefined,
                            });
                          }
                        });
                      } else {
                        // Fallback: use legacy data if no peer_review_history
                        if (task.completed_at) {
                          timelineEvents.push({
                            timestamp: task.completed_at,
                            type: "submitted_for_review",
                            title: "Task submitted for review",
                            description:
                              "Ready for peer review by external team members",
                            color: "blue",
                          });
                        }

                        // Legacy review completion event
                        if (
                          (task.status === "approved" ||
                            task.status === "rejected") &&
                          task.reviewer_name
                        ) {
                          timelineEvents.push({
                            timestamp:
                              task.updated_at ||
                              task.completed_at ||
                              new Date().toISOString(),
                            type: "review_completed",
                            title: `Peer review ${task.status}`,
                            color: task.status === "approved" ? "green" : "red",
                            icon:
                              task.status === "approved" ? (
                                <CheckCircle className="w-4 h-4 text-white bg-green-500 rounded-full" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-white bg-red-500 rounded-full" />
                              ),
                            reviewer: {
                              name: task.reviewer_name,
                              avatar_url: task.reviewer_avatar_url,
                            },
                            feedback:
                              task.review_feedback ||
                              (task.submission_notes?.includes("Peer Review:")
                                ? task.submission_notes
                                    .split("Peer Review:")
                                    .pop()
                                    ?.trim()
                                : undefined),
                            status: task.status as "approved" | "rejected",
                          });
                        }
                      }

                      // Sort events by timestamp (newest first)
                      timelineEvents.sort(
                        (a, b) =>
                          new Date(b.timestamp).getTime() -
                          new Date(a.timestamp).getTime(),
                      );

                      // Render timeline events
                      return timelineEvents.map((event, index) => (
                        <div
                          key={index}
                          className="flex gap-3 p-3 border rounded-lg"
                        >
                          <div className="flex items-center justify-center flex-shrink-0 w-6 h-6 mt-1">
                            <div
                              className={`flex items-center justify-center ${
                                event.icon ? "w-6 h-6" : "w-2 h-2"
                              } ${
                                event.color === "purple"
                                  ? "bg-purple-500"
                                  : event.color === "yellow"
                                    ? "bg-yellow-500"
                                    : event.color === "blue"
                                      ? "bg-blue-500"
                                      : event.color === "indigo"
                                        ? "bg-indigo-500"
                                        : event.color === "green"
                                          ? "bg-green-500"
                                          : event.color === "red"
                                            ? "bg-red-500"
                                            : "bg-gray-500"
                              } rounded-full ${
                                event.icon
                                  ? "border-2 border-white shadow-sm"
                                  : ""
                              }`}
                            >
                              {event.icon || null}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium">{event.title}</p>
                              {event.status && (
                                <Badge
                                  variant="secondary"
                                  className={`text-xs ${
                                    event.status === "approved"
                                      ? "bg-green-100 text-green-800 border-green-200"
                                      : "bg-red-100 text-red-800 border-red-200"
                                  }`}
                                >
                                  {event.status === "approved"
                                    ? "Approved"
                                    : "Rejected"}
                                </Badge>
                              )}
                            </div>

                            {event.reviewer && (
                              <div className="flex items-center gap-2 mb-2">
                                <Avatar className="w-5 h-5">
                                  {event.reviewer.avatar_url ? (
                                    <AvatarImage
                                      src={event.reviewer.avatar_url}
                                    />
                                  ) : null}
                                  <AvatarFallback className="bg-gradient-to-r from-purple-400 to-pink-400 text-white text-xs font-bold">
                                    {event.reviewer.name
                                      ?.split(" ")
                                      .map((n) => n[0])
                                      .join("")
                                      .toUpperCase() || "PR"}
                                  </AvatarFallback>
                                </Avatar>
                                <p className="text-sm text-muted-foreground">
                                  {event.type === "reviewer_assigned"
                                    ? "Reviewer: "
                                    : "Reviewed by "}
                                  <span className="font-medium">
                                    {event.reviewer.name}
                                  </span>
                                </p>
                              </div>
                            )}

                            <p className="text-sm text-muted-foreground">
                              {formatDate(event.timestamp)}
                            </p>

                            {event.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {event.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ));
                    })()}

                    {/* Legacy support: Multiple review attempts from submission_notes */}
                    {(task.status === "approved" ||
                      task.status === "rejected") &&
                      task.reviewer_name &&
                      !task.review_feedback &&
                      task.submission_notes &&
                      task.submission_notes.split("Peer Review:").length >
                        2 && (
                        <>
                          {/* Parse multiple review attempts from submission_notes */}
                          {(() => {
                            const reviewParts = task.submission_notes
                              .split("Peer Review:")
                              .filter((part) => part.trim())
                              .slice(0, -1); // Exclude the last one (already shown above)

                            return reviewParts.map((reviewFeedback, index) => (
                              <div
                                key={index}
                                className="flex items-start gap-3 p-3 border rounded-lg opacity-75"
                              >
                                <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                                <div className="flex-1">
                                  <p className="font-medium">
                                    Peer review rejected (attempt {index + 1})
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Reviewed by {task.reviewer_name}
                                  </p>
                                  <p className="text-sm text-muted-foreground mt-1 italic">
                                    &ldquo;{reviewFeedback.trim()}&rdquo;
                                  </p>
                                </div>
                              </div>
                            ));
                          })()}
                        </>
                      )}
                    {task.status === "pending_review" && (
                      <div className="flex items-start gap-3 p-3 border rounded-lg border-dashed">
                        <div className="w-2 h-2 bg-orange-300 rounded-full mt-2 animate-pulse"></div>
                        <div className="flex-1">
                          <p className="font-medium text-orange-700">
                            Awaiting peer review
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Task is currently under review
                          </p>
                        </div>
                      </div>
                    )}
                    {/* Empty state */}
                    {!task.assigned_at &&
                      !task.started_at &&
                      !task.completed_at && (
                        <div className="text-center py-8 text-muted-foreground">
                          <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No timeline events yet</p>
                          <p className="text-sm">
                            Task activity will appear here once started
                          </p>
                        </div>
                      )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Previous Submissions Tab - Only for recurring tasks */}
            {isRecurringTask && (
              <TabsContent value="submissions" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">
                      Previous Submissions
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      History of all completed instances of this recurring task
                    </p>
                  </CardHeader>
                  <CardContent>
                    {loadingSubmissions ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="text-muted-foreground">
                          Loading previous submissions...
                        </div>
                      </div>
                    ) : previousSubmissions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No previous submissions found.</p>
                        <p className="text-sm">
                          This is the first completion of this recurring task.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {previousSubmissions.map((submission, index) => (
                          <div
                            key={submission.id}
                            className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage
                                    src={
                                      submission.users?.avatar_url || undefined
                                    }
                                  />
                                  <AvatarFallback>
                                    {submission.users?.name
                                      ?.split(" ")
                                      .map((n: string) => n[0])
                                      .join("") || "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium text-sm">
                                    {submission.users?.name || "Unknown User"}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Completed{" "}
                                    {submission.completed_at
                                      ? new Date(
                                          submission.completed_at,
                                        ).toLocaleDateString()
                                      : "N/A"}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={
                                    submission.status === "approved"
                                      ? "default"
                                      : "destructive"
                                  }
                                  className="text-xs"
                                >
                                  {submission.status === "approved"
                                    ? "Approved"
                                    : "Rejected"}
                                </Badge>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs"
                                  onClick={() =>
                                    window.open(
                                      `/dashboard/team-journey/task/${submission.id}`,
                                      "_blank",
                                    )
                                  }
                                >
                                  View Details
                                </Button>
                              </div>
                            </div>
                            {submission.review_feedback && (
                              <div className="mt-3 p-3 bg-blue-50 rounded-md">
                                <p className="text-sm text-gray-700">
                                  <span className="font-medium">
                                    Review Feedback:
                                  </span>{" "}
                                  {submission.review_feedback}
                                </p>
                              </div>
                            )}
                            {((submission.submission_data as any)?.files || [])
                              .length > 0 && (
                              <div className="mt-3">
                                <p className="text-xs text-muted-foreground mb-2">
                                  Evidence Files:
                                </p>
                                <div className="flex gap-2 flex-wrap">
                                  {(
                                    (submission.submission_data as any)
                                      ?.files || []
                                  ).map((url: string, fileIndex: number) => (
                                    <Button
                                      key={fileIndex}
                                      variant="outline"
                                      size="sm"
                                      className="text-xs h-7"
                                      onClick={() => window.open(url, "_blank")}
                                    >
                                      File {fileIndex + 1}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Reward Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Reward</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-black dark:text-white" />
                  <span className="text-sm text-gray-600">Points</span>
                </div>
                <span className="font-semibold">{task.base_xp_reward}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-black dark:text-white" />
                  <span className="text-sm text-gray-600">XP</span>
                </div>
                <span className="font-semibold">{task.base_xp_reward}</span>
              </div>
            </CardContent>
          </Card>

          {/* Task Action Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Task Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Assigned User Info */}
              {task.assigned_to_user_id ? (
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage
                      src={task.assignee_avatar_url || "/avatars/john-doe.jpg"}
                    />
                    <AvatarFallback className="bg-gradient-to-r from-purple-400 to-pink-400 text-white font-bold text-xs">
                      {task.assignee_name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("") || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {task.assignee_name || "Unknown User"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {task.assigned_at
                        ? formatDate(task.assigned_at, "date-only")
                        : "Recently assigned"}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-sm text-gray-500 py-2">
                  No one assigned to this task yet
                </div>
              )}

              {/* Action Buttons based on status and permissions */}
              {task.status === "not_started" ? (
                permissions.canStart ? (
                  <Button
                    className="w-full gap-2 bg-[#ff78c8] text-white hover:bg-[#ff78c8]/90"
                    onClick={handleStartTask}
                    disabled={startTaskMutation.isPending}
                  >
                    <Play className="h-4 w-4" />
                    {startTaskMutation.isPending ? "Starting..." : "Start Task"}
                  </Button>
                ) : task.assigned_to_user_id ? (
                  <Button
                    variant="outline"
                    className="w-full gap-2 border-[#0000ff] text-[#0000ff]"
                    disabled
                  >
                    <User className="h-4 w-4" />
                    View Info
                  </Button>
                ) : (
                  <div className="text-center text-sm text-gray-500">
                    Task not assigned
                  </div>
                )
              ) : task.status === "in_progress" ? (
                <div className="space-y-2">
                  {permissions.canComplete && (
                    <Button
                      className="w-full gap-2 bg-[#ff78c8] text-white hover:bg-[#ff78c8]/90"
                      onClick={handleCompleteTask}
                      disabled={completeTaskMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4" />
                      {completeTaskMutation.isPending
                        ? "Completing..."
                        : "Complete"}
                    </Button>
                  )}
                  {permissions.canCancel && (
                    <Button
                      variant="outline"
                      className="w-full gap-2 text-red-500 border-red-500 hover:bg-red-500 hover:text-white"
                      onClick={handleCancelTask}
                      disabled={cancelTaskMutation.isPending}
                    >
                      {cancelTaskMutation.isPending
                        ? "Cancelling..."
                        : "Cancel Task"}
                    </Button>
                  )}
                  {!permissions.canComplete && !permissions.canCancel && (
                    <Button
                      variant="outline"
                      className="w-full gap-2 border-[#0000ff] text-[#0000ff]"
                      disabled
                    >
                      <User className="h-4 w-4" />
                      In Progress
                    </Button>
                  )}
                </div>
              ) : task.status === "approved" ? (
                <Button
                  className="w-full gap-2 bg-[#ff78c8] hover:bg-[#ff78c8]/90"
                  disabled
                >
                  <CheckCircle className="h-4 w-4" />
                  Completed
                </Button>
              ) : task.status === "rejected" ||
                task.status === "revision_required" ? (
                permissions.canStart ? (
                  <Button
                    className="w-full gap-2 bg-[#ff78c8] text-white hover:bg-[#ff78c8]/90"
                    onClick={handleRetryTask}
                    disabled={retryTaskMutation.isPending}
                  >
                    <Play className="h-4 w-4" />
                    {retryTaskMutation.isPending ? "Retrying..." : "Retry"}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full gap-2 border-[#0000ff] text-[#0000ff]"
                    disabled
                  >
                    <User className="h-4 w-4" />
                    Needs Revision
                  </Button>
                )
              ) : task.status === "cancelled" ? (
                <div className="space-y-2">
                  {permissions.canStart ? (
                    <Button
                      className="w-full gap-2 bg-[#ff78c8] text-white hover:bg-[#ff78c8]/90"
                      onClick={handleStartTask}
                      disabled={startTaskMutation.isPending}
                    >
                      <Play className="h-4 w-4" />
                      {startTaskMutation.isPending
                        ? "Starting..."
                        : "Restart Task"}
                    </Button>
                  ) : (
                    <div className="text-center text-sm text-gray-500">
                      Task cancelled - contact team leader to restart
                    </div>
                  )}
                  {permissions.canReassign && (
                    <Button
                      variant="outline"
                      className="w-full gap-2 border-[#0000ff] text-[#0000ff] hover:bg-[#0000ff] hover:text-white"
                      onClick={() => setShowReassignModal(true)}
                    >
                      Reassign Task
                    </Button>
                  )}
                </div>
              ) : task.status === "pending_review" ? (
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full gap-2 border-[#0000ff] text-[#0000ff]"
                    disabled
                  >
                    <User className="h-4 w-4" />
                    Under Peer Review
                  </Button>
                </div>
              ) : (
                <Button className="w-full bg-[#ff78c8] text-white" disabled>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Task Status
                </Button>
              )}

              {/* Reassign button for leaders (show for active tasks too) */}
              {permissions.canReassign &&
                task.status !== "approved" &&
                task.status !== "cancelled" &&
                task.status !== "pending_review" && (
                  <Button
                    variant="outline"
                    className="w-full gap-2 border-[#0000ff] text-[#0000ff] hover:bg-[#0000ff] hover:text-white"
                    onClick={() => setShowReassignModal(true)}
                  >
                    Reassign Task
                  </Button>
                )}
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Reassign Task Modal */}
      <Dialog open={showReassignModal} onOpenChange={setShowReassignModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reassign Task</DialogTitle>
            <DialogDescription>
              Choose a team member to assign this task to.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {teamMembers.map((member) => (
              <button
                key={member.id}
                onClick={() => handleReassignTask(member.id)}
                disabled={actionLoading}
                className="w-full flex items-center gap-3 p-2 rounded hover:bg-muted disabled:opacity-50"
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage
                    src={member.avatar_url || "/avatars/john-doe.jpg"}
                  />
                  <AvatarFallback className="bg-gradient-to-r from-blue-400 to-purple-400 text-white font-bold text-xs">
                    {member.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{member.name}</span>
                {member.id === task?.assigned_to_user_id && (
                  <span className="text-xs text-[#0000ff] ml-auto">
                    Current
                  </span>
                )}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReassignModal(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Task Submission Modal */}
      <TaskDetailsModal
        mode="submission"
        isOpen={showSubmissionModal}
        onClose={() => setShowSubmissionModal(false)}
        onSubmit={handleSubmissionSubmit}
        taskTitle={task?.title || "Task"}
        formSchema={task?.submission_form_schema}
        isLoading={completeTaskMutation.isPending}
      />
      {/* Suggest Edits Modal */}
      <SuggestEditsModal
        open={showSuggestEditsModal}
        onOpenChange={setShowSuggestEditsModal}
        taskId={task?.task_id || ""}
        taskTitle={task?.title || "Task"}
      />
    </div>
  );
}
