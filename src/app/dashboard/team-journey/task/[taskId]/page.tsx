"use client";

import Link from "next/link";
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
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
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
import { TaskDetailsModal } from "@/components/ui/task-details-modal";
import { StatusBadge, TaskStatus } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/date-utils";
import { uploadTaskFiles } from "@/lib/file-upload";

interface TaskDetailPageProps {
  params: Promise<{
    taskId: string;
  }>;
}

export default function TaskDetailPage({ params }: TaskDetailPageProps) {
  const { user } = useAppContext();
  const [task, setTask] = useState<TeamTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [teamMembers, setTeamMembers] = useState<
    Array<{ id: string; name: string; avatar_url?: string }>
  >([]);
  const [permissions, setPermissions] = useState<{
    canStart: boolean;
    canComplete: boolean;
    canCancel: boolean;
    canReassign: boolean;
    userRole: string;
    isAssignedUser: boolean;
  }>({
    canStart: false,
    canComplete: false,
    canCancel: false,
    canReassign: false,
    userRole: "unknown",
    isAssignedUser: false,
  });

  // Extract ID from params
  useEffect(() => {
    const extractId = async () => {
      const { taskId } = await params;
      setTaskId(taskId);
    };
    extractId();
  }, [params]);

  // Load task data using lazy progress model
  const loadTask = useCallback(async () => {
    if (!taskId || !user?.id) return;

    setLoading(true);
    try {
      // Use new lazy progress function that handles both task_id and progress_id
      const taskData = await getTaskByIdLazy(taskId, user.id);
      setTask(taskData);

      // Load permissions and team members if task data is available
      // For lazy progress: taskData.progress_id might be null for new tasks
      if (taskData && taskData.team_id) {
        let hasReassignPermission = false;

        if (taskData.progress_id && taskData.progress_id !== "none") {
          // Task has progress - check existing permissions
          const [startPerm, completePerm, cancelPerm, reassignPerm] =
            await Promise.all([
              checkTaskPermission(taskData.progress_id, user.id, "start"),
              checkTaskPermission(taskData.progress_id, user.id, "complete"),
              checkTaskPermission(taskData.progress_id, user.id, "cancel"),
              checkTaskPermission(taskData.progress_id, user.id, "reassign"),
            ]);

          hasReassignPermission = reassignPerm.canManage;

          setPermissions({
            canStart: startPerm.canManage,
            canComplete: completePerm.canManage,
            canCancel: cancelPerm.canManage,
            canReassign: reassignPerm.canManage,
            userRole: startPerm.userRole,
            isAssignedUser: startPerm.isAssignedUser,
          });
        } else {
          // New task without progress - set default permissions
          // Any team member can start an unassigned task
          hasReassignPermission = false; // Can't reassign unassigned task

          setPermissions({
            canStart: true, // Anyone can start a new task
            canComplete: false, // Can't complete what hasn't been started
            canCancel: false, // Can't cancel what hasn't been started
            canReassign: false, // Can't reassign unassigned task
            userRole: "member", // Default role
            isAssignedUser: false, // No one assigned yet
          });
        }

        // Load team members for reassign functionality
        if (hasReassignPermission) {
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
            `
            )
            .eq("team_id", taskData.team_id)
            .is("left_at", null);

          if (members) {
            setTeamMembers(
              members.map((m: unknown) => {
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
              })
            );
          }
        }
      }
    } catch (error) {
      console.error("Error loading task:", error);
    } finally {
      setLoading(false);
    }
  }, [taskId, user?.id]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  // Task action handlers
  const handleCompleteTask = async () => {
    setShowSubmissionModal(true);
  };

  const handleSubmissionSubmit = async (submissionData: {
    description?: string;
    external_urls: Array<{ url: string; title: string; type: string }>;
    files: File[];
    submitted_at: string;
    [key: string]: unknown;
  }) => {
    if (!task?.progress_id || !user?.id) return;

    setActionLoading(true);
    try {
      // Upload files first
      let uploadedFileUrls: string[] = [];
      if (submissionData.files.length > 0) {
        const uploadResults = await uploadTaskFiles(
          submissionData.files,
          task.progress_id,
          user.id
        );
        uploadedFileUrls = uploadResults.map((result) => result.url);
      }

      // Prepare submission data for database
      const dbSubmissionData = {
        ...submissionData,
        files: uploadedFileUrls, // Replace File objects with URLs
        completed_by: user.id,
        completion_date: new Date().toISOString(),
      };

      // Submit to database
      const success = await completeTask(task.progress_id, dbSubmissionData);
      if (success) {
        setShowSubmissionModal(false);
        await loadTask(); // Reload task to get updated status
      } else {
        console.error("Failed to complete task");
      }
    } catch (error) {
      console.error("Error completing task:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelTask = async () => {
    if (!task?.progress_id || !user?.id) return;

    setActionLoading(true);
    try {
      const success = await cancelTask(task.progress_id, user.id);
      if (success) {
        await loadTask(); // Reload task to get updated status
      } else {
        console.error("Failed to cancel task");
      }
    } catch (error) {
      console.error("Error cancelling task:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetryTask = async () => {
    if (!task?.progress_id || !user?.id) return;

    setActionLoading(true);
    try {
      const success = await retryTask(task.progress_id, user.id);
      if (success) {
        await loadTask(); // Reload task to get updated status
      } else {
        console.error("Failed to retry task");
      }
    } catch (error) {
      console.error("Error retrying task:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartTask = async () => {
    if (!task || !user?.id) return;

    setActionLoading(true);
    try {
      let success = false;

      if (task.progress_id && task.progress_id !== "none") {
        // Task already has progress entry - use existing startTask
        success = await startTask(task.progress_id, user.id);
      } else {
        // New task without progress - use lazy progress creation
        success = await startTaskLazy(
          task.task_id,
          task.team_id || undefined,
          user.id,
          "team" // Assuming team context for team journey pages
        );
      }

      if (success) {
        await loadTask(); // Reload task to get updated status
      } else {
        console.error("Failed to start task");
      }
    } catch (error) {
      console.error("Error starting task:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReassignTask = async (newUserId: string) => {
    if (!task?.progress_id || !user?.id) return;

    setActionLoading(true);
    try {
      const success = await reassignTask(task.progress_id, newUserId, user.id);
      if (success) {
        await loadTask(); // Reload task to get updated status
        setShowReassignModal(false);
      } else {
        console.error("Failed to reassign task");
      }
    } catch (error) {
      console.error("Error reassigning task:", error);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading task...</div>
      </div>
    );
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
                {task.teams?.name || "Team"}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <span className="font-medium">{task.title}</span>
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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="task" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Task
              </TabsTrigger>
              <TabsTrigger value="tips" className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Tips
              </TabsTrigger>
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
            </TabsList>

            <TabsContent value="task" className="space-y-6 mt-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle className="text-lg font-semibold">
                    Task Information
                  </CardTitle>
                  <Button variant="link" className="text-blue-500 p-0 h-auto" disabled>
                    Suggest Edits
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                  {task.detailed_instructions ? (
                    <div className="prose max-w-none">
                      <div
                        className="text-gray-700 leading-relaxed whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{
                          __html: task.detailed_instructions.replace(
                            /\n/g,
                            "<br/>"
                          ),
                        }}
                      />
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
                              {objective}
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
                              {deliverable}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tips" className="space-y-6 mt-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle className="text-lg font-semibold">
                    Tips for task
                  </CardTitle>
                  <Button variant="link" className="text-blue-500 p-0 h-auto" disabled>
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
                  {task.resources &&
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
                    )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="peer-review" className="space-y-6 mt-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle className="text-lg font-semibold">
                    Peer Review Criteria
                  </CardTitle>
                  <Button variant="link" className="text-blue-500 p-0 h-auto" disabled>
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
                        <ul className="space-y-2 text-gray-700">
                          {criteria.points.map((point, pointIndex) => (
                            <li
                              key={pointIndex}
                              className="flex items-start gap-2"
                            >
                              <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0"></span>
                              {point}
                            </li>
                          ))}
                        </ul>
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
                    {task.peer_review_history &&
                      task.peer_review_history.length > 0 && (
                        <div className="mt-6">
                          <h4 className="text-sm font-medium text-gray-800 mb-3">
                            Review History
                          </h4>
                          <div className="space-y-3">
                            {task.peer_review_history
                              .sort(
                                (a, b) =>
                                  new Date(a.timestamp).getTime() -
                                  new Date(b.timestamp).getTime()
                              )
                              .map((event, index) => (
                                <div
                                  key={index}
                                  className="flex items-start gap-3 p-3 border rounded-lg bg-white"
                                >
                                  <div
                                    className={`flex items-center justify-center w-6 h-6 rounded-full mt-1 ${
                                      event.event_type ===
                                      "submitted_for_review"
                                        ? "bg-blue-500"
                                        : event.event_type ===
                                          "reviewer_assigned"
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
                                    {event.event_type ===
                                      "reviewer_assigned" && (
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
                      if (
                        task.peer_review_history &&
                        task.peer_review_history.length > 0
                      ) {
                        task.peer_review_history.forEach((event) => {
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
                                avatar_url: event.reviewer_avatar_url,
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
                                avatar_url: event.reviewer_avatar_url,
                              },
                              status: event.decision,
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

                      // Sort events by timestamp
                      timelineEvents.sort(
                        (a, b) =>
                          new Date(a.timestamp).getTime() -
                          new Date(b.timestamp).getTime()
                      );

                      // Render timeline events
                      return timelineEvents.map((event, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-3 border rounded-lg"
                        >
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
                            } ${!event.icon ? "mt-2" : "mt-1"}`}
                          >
                            {event.icon || null}
                          </div>
                          <div className="flex-1">
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
                    disabled={actionLoading}
                  >
                    <Play className="h-4 w-4" />
                    {actionLoading ? "Starting..." : "Start Task"}
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
                      disabled={actionLoading}
                    >
                      <CheckCircle className="h-4 w-4" />
                      {actionLoading ? "Completing..." : "Complete"}
                    </Button>
                  )}
                  {permissions.canCancel && (
                    <Button
                      variant="outline"
                      className="w-full gap-2 text-red-500 border-red-500 hover:bg-red-500 hover:text-white"
                      onClick={handleCancelTask}
                      disabled={actionLoading}
                    >
                      Cancel Task
                    </Button>
                  )}
                  {!permissions.canComplete && !permissions.canCancel && (
                    <Button
                      variant="outline"
                      className="w-full gap-2 border-[#0000ff] text-[#0000ff]"
                      disabled
                    >
                      <User className="h-4 w-4" />
                      View Info - In Progress by {task.assignee_name}
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
                    disabled={actionLoading}
                  >
                    <Play className="h-4 w-4" />
                    {actionLoading ? "Retrying..." : "Retry"}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full gap-2 border-[#0000ff] text-[#0000ff]"
                    disabled
                  >
                    <User className="h-4 w-4" />
                    View Info - Needs Revision by {task.assignee_name}
                  </Button>
                )
              ) : task.status === "cancelled" ? (
                <div className="space-y-2">
                  {permissions.canStart ? (
                    <Button
                      className="w-full gap-2 bg-[#ff78c8] text-white hover:bg-[#ff78c8]/90"
                      onClick={handleStartTask}
                      disabled={actionLoading}
                    >
                      <Play className="h-4 w-4" />
                      {actionLoading ? "Starting..." : "Restart Task"}
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
                    View Info - Under Peer Review
                  </Button>
                  {permissions.canReassign && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs border-[#0000ff] text-[#0000ff] hover:bg-[#0000ff] hover:text-white"
                      onClick={() => setShowReassignModal(true)}
                    >
                      Reassign Task
                    </Button>
                  )}
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
        isLoading={actionLoading}
      />
    </div>
  );
}
