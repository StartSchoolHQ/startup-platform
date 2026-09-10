"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { getTaskByIdLazy } from "@/lib/tasks";
import { submitIndividualTaskV1 } from "@/lib/database";
import { uploadTaskFiles } from "@/lib/file-upload";
import { useAiReviewStatus } from "@/hooks/use-ai-review-status";
import { normalizeSubmission } from "@/lib/ai-review/normalize";
import type { AiReviewStatus } from "@/lib/database";
import { TaskActionCard } from "@/components/my-journey/task-action-card";
import { TaskDetailTabs } from "@/components/my-journey/task-detail-tabs";
import posthog from "posthog-js";
import { TaskSubmissionModal } from "@/components/tasks/task-submission-modal";
import { useAppContext } from "@/contexts/app-context";
import { toast } from "sonner";
import { StatusBadge, TaskStatus } from "@/components/ui/status-badge";
import { TaskDetailSkeleton } from "@/components/ui/task-detail-skeleton";
import type { TeamTask } from "@/types/team-journey";
import { SuggestEditsModal } from "@/components/tasks/suggest-edits-modal";
import { economyLabels } from "@/lib/economy-labels";
import { formatTaskCategory } from "@/lib/task-category-labels";

const labels = economyLabels("my_journey");

export default function IndividualTaskDetailPage() {
  const params = useParams();
  const { user } = useAppContext();
  const queryClient = useQueryClient();
  const [task, setTask] = useState<TeamTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuggestEditsModal, setShowSuggestEditsModal] = useState(false);

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

  const reviewActive =
    task?.status === "pending_review" ||
    task?.status === "rejected" ||
    task?.status === "approved";
  const { data: review } = useAiReviewStatus(task?.progress_id ?? null, {
    active: !!reviewActive,
  });

  /** Refreshes every cache a task's status change can affect — used after
   * both a settled AI review and an immediate auto-approve submission. */
  const invalidateJourneyCaches = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["myJourney"] });
    queryClient.invalidateQueries({ queryKey: ["my-journey-overview"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }, [queryClient]);

  const handleReviewFinished = useCallback(
    (status?: AiReviewStatus) => {
      loadTask();
      invalidateJourneyCaches();
      if (status && !["queued", "running"].includes(status.status)) {
        posthog.capture("ai_review_completed", {
          task_id: taskId,
          outcome: status.status,
          attempt: status.attempt,
        });
      }
    },
    [loadTask, invalidateJourneyCaches, taskId]
  );

  /**
   * A rejected task reopens the same form prefilled with what was submitted
   * last time, so the student edits instead of retyping. Files are not
   * prefillable (only their URLs were stored) and must be re-attached.
   */
  const resubmitInitialData = useMemo(() => {
    if (task?.status !== "rejected") return undefined;
    const previous = normalizeSubmission(task.submission_data);
    return {
      description: previous.description || undefined,
      external_urls: previous.links.map((l) => ({
        url: l.url,
        title: l.title || l.url,
        type: "external",
      })),
    };
  }, [task?.status, task?.submission_data]);

  const handleSubmission = async (submissionData: Record<string, unknown>) => {
    if (!task || !user?.id || !task.progress_id) return;
    setIsSubmitting(true);
    try {
      const rawFiles = Array.isArray(submissionData.files)
        ? (submissionData.files as File[]).filter((f) => f instanceof File)
        : [];
      const uploaded = rawFiles.length
        ? await uploadTaskFiles(rawFiles, task.progress_id, user.id)
        : [];
      if (uploaded.length !== rawFiles.length) {
        throw new Error(
          "Some files could not be uploaded. Please try again — nothing was submitted."
        );
      }
      const payload = {
        ...submissionData,
        files: uploaded.map((u, i) => ({
          url: u.url,
          name: u.name,
          size: u.size,
          type: rawFiles[i].type || null,
        })),
        completed_by: user.id,
        completion_date: new Date().toISOString(),
      };
      const result = await submitIndividualTaskV1(task.progress_id, payload);
      posthog.capture("individual_task_submitted", {
        task_id: task.task_id,
        attempt: result.attempt,
        mode: result.mode,
      });
      setIsSubmissionModalOpen(false);
      await loadTask();
      invalidateJourneyCaches();
      const successToast = {
        ai: {
          title: "Submitted — reviewing now",
          description:
            "You can stay or leave; we'll notify you when the review is done.",
        },
        self_check: {
          title: "Recorded — self-check task",
          description: `This one is between you and yourself. ${labels.xp} and ${labels.points} awarded.`,
        },
        auto_approve: {
          title: "Task completed",
          description: `${labels.xp} and ${labels.points} awarded.`,
        },
      }[result.mode];
      toast.success(successToast.title, {
        description: successToast.description,
      });
    } catch (error) {
      posthog.capture("individual_task_submission_failed", {
        task_id: task.task_id,
      });
      toast.error("Failed to submit task", {
        description:
          error instanceof Error
            ? error.message
            : "Please try again or contact support if the issue persists.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteTask = async () => {
    setIsSubmissionModalOpen(true);
  };

  if (loading) {
    return <TaskDetailSkeleton />;
  }

  if (!task) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">Task not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Task Header */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-primary text-xs font-medium">
            {formatTaskCategory(task.category) ?? "No category assigned"}
          </span>
          <StatusBadge
            status={task.status as TaskStatus}
            variant="my_journey"
          />
        </div>
        <h1 className="text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">
          {task.title}
        </h1>
        {task.description && (
          <p className="text-muted-foreground max-w-3xl text-sm">
            {task.description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <TaskDetailTabs
            task={task}
            onSuggestEdits={() => setShowSuggestEditsModal(true)}
          />
        </div>

        <div className="space-y-6">
          <TaskActionCard
            task={task}
            user={user ?? null}
            review={review}
            isSubmitting={isSubmitting}
            onComplete={handleCompleteTask}
            onReviewFinished={handleReviewFinished}
          />
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
        initialData={resubmitInitialData}
      />
      {/* Suggest Edits Modal */}
      <SuggestEditsModal
        open={showSuggestEditsModal}
        onOpenChange={setShowSuggestEditsModal}
        taskId={task.task_id}
        taskTitle={task.title}
      />
    </div>
  );
}
