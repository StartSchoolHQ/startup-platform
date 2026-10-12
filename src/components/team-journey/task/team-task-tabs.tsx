"use client";

import {
  ClipboardCheck,
  FileText,
  History,
  Lightbulb,
  PackageCheck,
  Repeat,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { TaskHistoryTab } from "@/components/my-journey/task-history-tab";
import {
  TeamTaskBrief,
  TeamTaskTips,
  tipsCount,
} from "@/components/team-journey/task/team-task-brief";
import {
  TeamTaskSubmissionTab,
  hasSubmission,
} from "@/components/team-journey/task/team-task-submission-tab";
import { TeamTaskReviewTab } from "@/components/team-journey/task/team-task-review-tab";
import { TeamTaskHistoryTab } from "@/components/team-journey/task/team-task-history-tab";
import type { PeerReviewHistory } from "@/lib/validation-schemas";
import type { TeamTask } from "@/types/team-journey";

function Count({ n }: { n: number }) {
  if (n === 0) return null;
  return (
    <span className="bg-primary/10 text-primary rounded-full px-1.5 text-[10px] font-semibold tabular-nums">
      {n}
    </span>
  );
}

/**
 * Main column of the team task page, the solo page's tab strip plus the
 * team-only tabs: Task, Tips, Submission (once sent), Peer review, History,
 * and Previous cycles on recurring tasks.
 */
export function TeamTaskTabs({
  task,
  history,
  onSuggestEdits,
}: {
  task: TeamTask;
  history: PeerReviewHistory;
  onSuggestEdits: () => void;
}) {
  const recurring = task.is_recurring === true;
  const cycles = Array.isArray(task.submission_history)
    ? task.submission_history.length
    : 0;

  return (
    <Tabs defaultValue="task" className="w-full">
      <TabsList className="h-9 flex-wrap">
        <TabsTrigger value="task" className="gap-2 px-4">
          <FileText className="h-3.5 w-3.5" />
          Task
        </TabsTrigger>
        <TabsTrigger value="tips" className="gap-2 px-4">
          <Lightbulb className="h-3.5 w-3.5" />
          Tips
          <Count n={tipsCount(task)} />
        </TabsTrigger>
        {hasSubmission(task) && (
          <TabsTrigger value="submission" className="gap-2 px-4">
            <PackageCheck className="h-3.5 w-3.5" />
            Submission
          </TabsTrigger>
        )}
        <TabsTrigger value="review" className="gap-2 px-4">
          <ClipboardCheck className="h-3.5 w-3.5" />
          Peer review
        </TabsTrigger>
        <TabsTrigger value="history" className="gap-2 px-4">
          <History className="h-3.5 w-3.5" />
          History
        </TabsTrigger>
        {recurring && (
          <TabsTrigger value="cycles" className="gap-2 px-4">
            <Repeat className="h-3.5 w-3.5" />
            Previous
            <Count n={cycles} />
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="task" className="mt-4">
        <TeamTaskBrief task={task} onSuggestEdits={onSuggestEdits} />
      </TabsContent>
      <TabsContent value="tips" className="mt-4">
        <TeamTaskTips task={task} onSuggestEdits={onSuggestEdits} />
      </TabsContent>
      {hasSubmission(task) && (
        <TabsContent value="submission" className="mt-4">
          <TeamTaskSubmissionTab task={task} />
        </TabsContent>
      )}
      <TabsContent value="review" className="mt-4">
        <TeamTaskReviewTab
          task={task}
          history={history}
          onSuggestEdits={onSuggestEdits}
        />
      </TabsContent>
      <TabsContent value="history" className="mt-4">
        <TeamTaskHistoryTab task={task} history={history} />
      </TabsContent>
      {recurring && (
        <TabsContent value="cycles" className="mt-4">
          <Card className="gap-0 py-0">
            <TaskHistoryTab task={task} />
          </Card>
        </TabsContent>
      )}
    </Tabs>
  );
}
