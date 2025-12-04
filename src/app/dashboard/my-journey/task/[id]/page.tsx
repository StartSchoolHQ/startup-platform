"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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
  CheckCircle,
  AlertCircle,
  Play,
} from "lucide-react";
import { getTaskByIdLazy, completeIndividualTask } from "@/lib/tasks";
import { TaskSubmissionModal } from "@/components/tasks/task-submission-modal";
import { useAppContext } from "@/contexts/app-context";
import { taskNotificationManager } from "@/hooks/use-task-notifications";
import { toast } from "sonner";
import { StatusBadge, TaskStatus } from "@/components/ui/status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { TeamTask } from "@/types/team-journey";

export default function IndividualTaskDetailPage() {
  const params = useParams();
  const { user } = useAppContext();
  const [task, setTask] = useState<TeamTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const taskId = params.id as string;

  const loadTask = useCallback(async () => {
    if (!taskId || !user?.id) return;

    setLoading(true);
    try {
      const taskData = await getTaskByIdLazy(taskId, user.id);
      setTask(taskData);
    } catch (error) {
      console.error("Error loading task:", error);
    } finally {
      setLoading(false);
    }
  }, [taskId, user?.id]);

  useEffect(() => {
    if (taskId && user?.id) {
      loadTask();
    }
  }, [taskId, user?.id, loadTask]);

  const handleSubmission = async (submissionData: Record<string, unknown>) => {
    if (!task || !user?.id || !task.progress_id) return;

    setIsSubmitting(true);
    try {
      const success = await completeIndividualTask(
        task.progress_id,
        submissionData
      );

      if (success) {
        // Refresh task data to show completed status
        await loadTask();
        setIsSubmissionModalOpen(false);

        // Refresh notifications
        taskNotificationManager.refresh();

        // Enhanced success feedback for individual tasks
        toast.success("Task Completed Successfully! 🎉", {
          description:
            "XP and points awarded! Your task was automatically approved.",
          duration: 5000,
        });
      } else {
        toast.error("Failed to submit task", {
          description: "Please check your submission and try again.",
        });
      }
    } catch (error) {
      console.error("Error submitting task:", error);
      alert("Failed to submit task. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteTask = async () => {
    setIsSubmissionModalOpen(true);
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
              <Link href="/dashboard/my-journey">My Journey</Link>
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
            {task.category && `{{${task.category}}}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="task" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="task" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Task
              </TabsTrigger>
              <TabsTrigger value="tips" className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Tips
              </TabsTrigger>
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
                    disabled
                    title="Coming soon"
                  >
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

            <TabsContent value="tips" className="space-y-6 mt-6">
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
                        {typeof task.tips_content === "string"
                          ? task.tips_content ||
                            "Tips and best practices for this task haven't been added yet. Check back later or reach out to your mentor for guidance."
                          : "Tips and best practices for this task haven't been added yet. Check back later or reach out to your mentor for guidance."}
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
                          {task.resources.map(
                            (
                              resource: {
                                url: string;
                                title?: string;
                                description?: string;
                                type?: string;
                              },
                              index
                            ) => (
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
                                    {resource.title || "External Resource"}
                                  </div>
                                  {resource.description && (
                                    <div className="text-sm text-gray-600">
                                      {resource.description}
                                    </div>
                                  )}
                                  <div className="text-xs text-blue-600 capitalize">
                                    {resource.type || "external"} • Click to
                                    open
                                  </div>
                                  <div className="text-xs text-gray-400 mt-1 truncate">
                                    {resource.url}
                                  </div>
                                </div>
                              </a>
                            )
                          )}
                        </div>
                      </div>
                    )}
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
              {/* User Info */}
              {user && (
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-r from-purple-400 to-pink-400 text-white font-bold text-xs">
                      {user.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium">
                      {user.name || "Unknown User"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {task.started_at
                        ? new Date(task.started_at).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )
                        : "Not started yet"}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons based on status */}
              {task.status === "in_progress" ? (
                <Button
                  className="w-full gap-2"
                  onClick={handleCompleteTask}
                  disabled={isSubmitting}
                >
                  <CheckCircle className="h-4 w-4" />
                  {isSubmitting ? "Submitting..." : "Complete Task"}
                </Button>
              ) : task.status === "approved" ? (
                <Button
                  className="w-full gap-2 bg-green-600 hover:bg-green-700"
                  disabled
                >
                  <CheckCircle className="h-4 w-4" />
                  Completed
                </Button>
              ) : task.status === "not_started" ? (
                <Button variant="outline" className="w-full gap-2" disabled>
                  <Play className="h-4 w-4" />
                  Task Not Started
                </Button>
              ) : (
                <Button className="w-full" disabled>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Task Status: {task.status}
                </Button>
              )}

              {task.status === "approved" && (
                <div className="text-center text-xs text-green-600 mt-2">
                  XP and points have been awarded!
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Task Submission Modal */}
      <TaskSubmissionModal
        isOpen={isSubmissionModalOpen}
        onClose={() => setIsSubmissionModalOpen(false)}
        onSubmit={handleSubmission}
        taskTitle={task.title}
        formSchema={task.submission_form_schema}
        isLoading={isSubmitting}
        isIndividualTask={true}
      />
    </div>
  );
}
