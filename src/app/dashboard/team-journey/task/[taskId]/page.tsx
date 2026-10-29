"use client";

import { use, useMemo, useState } from "react";
import { StatusBadge, type TaskStatus } from "@/components/ui/status-badge";
import { TaskDetailSkeleton } from "@/components/ui/task-detail-skeleton";
import { TaskSubmissionModal } from "@/components/tasks/task-submission-modal";
import { SuggestEditsModal } from "@/components/tasks/suggest-edits-modal";
import { TeamTaskTabs } from "@/components/team-journey/task/team-task-tabs";
import { TeamTaskActionCard } from "@/components/team-journey/task/team-task-action-card";
import { ReassignTaskDialog } from "@/components/team-journey/task/reassign-task-dialog";
import { useAppContext } from "@/contexts/app-context";
import { useTeamTask } from "@/hooks/use-team-task";
import { useTeamTaskMutations } from "@/hooks/use-team-task-mutations";
import { formatTaskCategory } from "@/lib/task-category-labels";

/**
 * One team task in the solo task page's shape (2026-10-12): header, tabbed
 * brief on the left, one action card on the right. Peer review, cancel,
 * retry and reassign keep their flows; only the look moved.
 */
export default function TeamTaskDetailPage(props: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = use(props.params);
  const { user } = useAppContext();
  const [reassignOpen, setReassignOpen] = useState(false);
  const [submissionOpen, setSubmissionOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);

  const t = useTeamTask(taskId, user?.id);
  const m = useTeamTaskMutations({
    taskId,
    task: t.task,
    userId: user?.id,
    refetchTask: t.refetchTask,
    refetchPermissions: t.refetchPermissions,
    onSubmitted: () => setSubmissionOpen(false),
    onReassigned: () => setReassignOpen(false),
  });

  // A rejected task reopens the form with last time's text and links.
  const resubmitInitialData = useMemo(() => {
    const task = t.task;
    if (
      !task ||
      (task.status !== "rejected" && task.status !== "revision_required")
    )
      return undefined;
    const data = task.submission_data ?? {};
    return {
      description:
        typeof data.description === "string" ? data.description : undefined,
      external_urls: Array.isArray(data.external_urls)
        ? (data.external_urls as Array<{
            url: string;
            title: string;
            type: string;
          }>)
        : undefined,
    };
  }, [t.task]);

  if (t.loading) return <TaskDetailSkeleton />;

  const task = t.task;
  if (!task) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Task not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-primary text-xs font-medium">
            {formatTaskCategory(task.category) ?? "Team task"}
          </span>
          <StatusBadge status={task.status as TaskStatus} variant="journey" />
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
          <TeamTaskTabs
            task={task}
            history={t.reviewHistory}
            onSuggestEdits={() => setSuggestOpen(true)}
          />
        </div>
        <div className="space-y-6">
          <TeamTaskActionCard
            task={task}
            permissions={t.permissions}
            pending={{
              start: m.start.isPending,
              complete: m.complete.isPending,
              cancel: m.cancel.isPending,
              retry: m.retry.isPending,
            }}
            onStart={() => m.start.mutate()}
            onComplete={() => setSubmissionOpen(true)}
            onCancel={() => m.cancel.mutate()}
            onRetry={() => m.retry.mutate()}
            onReassign={() => setReassignOpen(true)}
          />
        </div>
      </div>

      <ReassignTaskDialog
        open={reassignOpen}
        onOpenChange={setReassignOpen}
        members={t.teamMembers}
        currentUserId={task.assigned_to_user_id}
        pending={m.reassign.isPending}
        onPick={(userId) => m.reassign.mutate(userId)}
      />
      <TaskSubmissionModal
        isOpen={submissionOpen}
        onClose={() => setSubmissionOpen(false)}
        onSubmit={async (data) => {
          // The mutation's onError already toasts; the modal stays open.
          await m.complete.mutateAsync(data).catch(() => undefined);
        }}
        taskTitle={task.title}
        formSchema={task.submission_form_schema}
        isLoading={m.complete.isPending}
        initialData={resubmitInitialData}
        progressId={task.progress_id}
        submittedAt={task.submitted_at ?? null}
      />
      <SuggestEditsModal
        open={suggestOpen}
        onOpenChange={setSuggestOpen}
        taskId={task.task_id}
        taskTitle={task.title}
      />
    </div>
  );
}
