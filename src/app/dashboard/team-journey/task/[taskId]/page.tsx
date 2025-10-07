"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  getTaskById,
  startTask,
  completeTask,
  cancelTask,
  retryTask,
  checkTaskPermission,
  reassignTask,
} from "@/lib/tasks";
import { useAppContext } from "@/contexts/app-context";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

  // Load task data
  const loadTask = useCallback(async () => {
    if (!taskId || !user?.id) return;

    setLoading(true);
    try {
      const taskData = await getTaskById(taskId);
      setTask(taskData);

      // Load permissions and team members if task data is available
      if (taskData?.progress_id && taskData?.team_id) {
        const [startPerm, completePerm, cancelPerm, reassignPerm] =
          await Promise.all([
            checkTaskPermission(taskData.progress_id, user.id, "start"),
            checkTaskPermission(taskData.progress_id, user.id, "complete"),
            checkTaskPermission(taskData.progress_id, user.id, "cancel"),
            checkTaskPermission(taskData.progress_id, user.id, "reassign"),
          ]);

        setPermissions({
          canStart: startPerm.canManage,
          canComplete: completePerm.canManage,
          canCancel: cancelPerm.canManage,
          canReassign: reassignPerm.canManage,
          userRole: startPerm.userRole,
          isAssignedUser: startPerm.isAssignedUser,
        });

        // Load team members for reassign functionality
        if (reassignPerm.canManage) {
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
              members.map(
                (m: {
                  user_id: string;
                  users: {
                    id: string;
                    name: string | null;
                    avatar_url: string | null;
                  };
                }) => ({
                  id: m.users.id,
                  name: m.users.name || "Unknown User",
                  avatar_url: m.users.avatar_url || undefined,
                })
              )
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
  const handleStartTask = async () => {
    if (!task?.progress_id || !user?.id) return;

    setActionLoading(true);
    try {
      const success = await startTask(task.progress_id, user.id);
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

  const handleCompleteTask = async () => {
    if (!task?.progress_id) return;

    setActionLoading(true);
    try {
      const success = await completeTask(task.progress_id, {
        completed_by: user?.id,
        completion_date: new Date().toISOString(),
        notes: "Task completed",
      });
      if (success) {
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

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "approved":
        return { label: "Finished", color: "bg-green-100 text-green-800" };
      case "in_progress":
        return { label: "In Progress", color: "bg-orange-100 text-orange-800" };
      case "rejected":
      case "revision_required":
        return { label: "Not Accepted", color: "bg-red-100 text-red-800" };
      case "pending_review":
        return { label: "Peer Review", color: "bg-purple-100 text-purple-800" };
      case "not_started":
      default:
        return { label: "Not Started", color: "bg-gray-100 text-gray-800" };
    }
  };

  const statusConfig = getStatusConfig(task.status);

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard/team-journey">
              Products
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink
              href={`/dashboard/team-journey/${task.team_id || task.teams?.id}`}
            >
              {task.teams?.name || "Team"}
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
            <Badge variant="secondary" className={statusConfig.color}>
              {statusConfig.label}
            </Badge>
          </div>
          <p className="text-muted-foreground text-lg">
            {task.category && `{{${task.category}}}`}
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
                  <Button variant="link" className="text-blue-500 p-0 h-auto">
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
                  {task.deliverables && task.deliverables.length > 0 && (
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
                  <Button variant="link" className="text-blue-500 p-0 h-auto">
                    Suggest Edits
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                  {task.tips_content && task.tips_content.length > 0 ? (
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
                  {task.resources && task.resources.length > 0 && (
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-semibold mb-3">
                        Helpful Resources
                      </h3>
                      <div className="grid gap-3">
                        {task.resources.map((resource, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50"
                          >
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100">
                              <FileText className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">
                                {resource.title}
                              </div>
                              <div className="text-sm text-gray-600">
                                {resource.description}
                              </div>
                              <div className="text-xs text-blue-600 capitalize">
                                {resource.type}
                              </div>
                            </div>
                          </div>
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
                  <Button variant="link" className="text-blue-500 p-0 h-auto">
                    Suggest Edits
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                  {task.peer_review_criteria &&
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

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle className="text-lg font-semibold">
                    Peer Review Information
                  </CardTitle>
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-800"
                  >
                    Accepted
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-700 leading-relaxed">
                    Lorem Ipsum is simply dummy text of the printing and
                    typesetting industry. Lorem Ipsum has been the
                    industry&apos;s standard dummy text ever since the 1500s,
                    when an unknown printer took a galley of type and scrambled
                    it to make a type specimen book. It has survived not only
                    five centuries, but also the leap into electronic
                    typesetting, remaining essentially unchanged. It was
                    popularised in the 1960s with the release of Letraset sheets
                    containing Lorem Ipsum passages, and more recently with
                    desktop publishing software like Aldus PageMaker including
                    versions of Lorem Ipsum.
                  </p>

                  <div className="flex items-center gap-3 pt-4 border-t">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src="/avatars/john-doe.jpg" />
                      <AvatarFallback className="bg-gradient-to-r from-purple-400 to-pink-400 text-white font-bold text-xs">
                        JD
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">John Doe</div>
                      <div className="text-xs text-muted-foreground">
                        14.07 5:45 PM
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">
                    History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">
                    Similar component to activity Log
                  </p>
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
                  <CreditCard className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-gray-600">Points</span>
                </div>
                <span className="font-semibold">{task.base_xp_reward}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-green-500" />
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
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
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
                  <div>
                    <div className="text-sm font-medium">
                      {task.assignee_name || "Unknown User"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {task.assigned_at
                        ? new Date(task.assigned_at).toLocaleDateString()
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
                    className="w-full gap-2"
                    onClick={handleStartTask}
                    disabled={actionLoading}
                  >
                    <Play className="h-4 w-4" />
                    {actionLoading ? "Starting..." : "Start Task"}
                  </Button>
                ) : task.assigned_to_user_id ? (
                  <Button variant="outline" className="w-full gap-2" disabled>
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
                      className="w-full gap-2"
                      onClick={handleCompleteTask}
                      disabled={actionLoading}
                    >
                      <CheckCircle className="h-4 w-4" />
                      {actionLoading ? "Completing..." : "Complete"}
                    </Button>
                  )}
                  {permissions.canCancel && (
                    <Button
                      variant="link"
                      className="w-full text-red-500 text-xs"
                      onClick={handleCancelTask}
                      disabled={actionLoading}
                    >
                      Cancel Task
                    </Button>
                  )}
                  {!permissions.canComplete && !permissions.canCancel && (
                    <Button variant="outline" className="w-full gap-2" disabled>
                      <User className="h-4 w-4" />
                      View Info - In Progress by {task.assignee_name}
                    </Button>
                  )}
                </div>
              ) : task.status === "approved" ? (
                <Button
                  className="w-full gap-2 bg-green-600 hover:bg-green-700"
                  disabled
                >
                  <CheckCircle className="h-4 w-4" />
                  Completed
                </Button>
              ) : task.status === "rejected" ||
                task.status === "revision_required" ? (
                permissions.canStart ? (
                  <Button
                    className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
                    onClick={handleRetryTask}
                    disabled={actionLoading}
                  >
                    <Play className="h-4 w-4" />
                    {actionLoading ? "Retrying..." : "Retry"}
                  </Button>
                ) : (
                  <Button variant="outline" className="w-full gap-2" disabled>
                    <User className="h-4 w-4" />
                    View Info - Needs Revision by {task.assignee_name}
                  </Button>
                )
              ) : task.status === "cancelled" ? (
                <div className="space-y-2">
                  {permissions.canStart ? (
                    <Button
                      className="w-full gap-2"
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
                      className="w-full gap-2"
                      onClick={() => setShowReassignModal(true)}
                    >
                      Reassign Task
                    </Button>
                  )}
                </div>
              ) : task.status === "pending_review" ? (
                <div className="space-y-2">
                  <Button variant="outline" className="w-full gap-2" disabled>
                    <User className="h-4 w-4" />
                    View Info - Under Peer Review
                  </Button>
                  {permissions.canReassign && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => setShowReassignModal(true)}
                    >
                      Reassign Task
                    </Button>
                  )}
                </div>
              ) : (
                <Button className="w-full" disabled>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {statusConfig.label}
                </Button>
              )}

              {/* Reassign button for leaders (show for active tasks too) */}
              {permissions.canReassign &&
                task.status !== "approved" &&
                task.status !== "cancelled" &&
                task.status !== "pending_review" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setShowReassignModal(true)}
                  >
                    Reassign Task
                  </Button>
                )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Simple Reassign Modal */}
      {showReassignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full">
            <h3 className="text-lg font-semibold mb-4">Reassign Task</h3>
            <p className="text-sm text-gray-600 mb-4">
              Choose a team member to assign this task to:
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {teamMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleReassignTask(member.id)}
                  disabled={actionLoading}
                  className="w-full flex items-center gap-3 p-2 rounded hover:bg-gray-100 disabled:opacity-50"
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
                    <span className="text-xs text-blue-600 ml-auto">
                      Current
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setShowReassignModal(false)}
                disabled={actionLoading}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
