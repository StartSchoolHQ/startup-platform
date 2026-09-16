"use client";

import { Badge } from "@/components/ui/badge";
import { StatusBadge, type TaskStatus } from "@/components/ui/status-badge";
import { TaskSectionTitle } from "@/components/tasks/task-content-lists";
import {
  buildSubmissionHistory,
  type HistoryEntry,
} from "@/lib/my-journey-history";
import type { TeamTask } from "@/types/team-journey";
import { History, Link2, Paperclip, Sparkles } from "lucide-react";

const BADGE_STATUS: Record<string, TaskStatus> = {
  approved: "approved",
  pending_review: "pending_review",
  rejected: "rejected",
  revision_required: "revision_required",
};

function formatDate(value: string | null) {
  if (!value) return "Date unknown";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unknown"
    : date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

function EntryLabel({ entry }: { entry: HistoryEntry }) {
  if (entry.kind === "current") {
    return (
      <Badge variant="outline" className="gap-1 text-[11px]">
        <Sparkles className="h-3 w-3" />
        {entry.cycle ? `Cycle ${entry.cycle} · current` : "Current attempt"}
      </Badge>
    );
  }
  if (entry.cycle) {
    return <Badge variant="secondary">Cycle {entry.cycle}</Badge>;
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Earlier attempt
    </Badge>
  );
}

function HistoryItem({ entry }: { entry: HistoryEntry }) {
  return (
    <li className="border-primary/30 relative border-l-2 pb-2 pl-5">
      <span className="bg-primary/60 absolute top-1.5 -left-[5px] h-2 w-2 rounded-full" />
      <div className="flex flex-wrap items-center gap-2">
        <EntryLabel entry={entry} />
        <span className="text-muted-foreground text-xs">
          {formatDate(entry.date)}
        </span>
        {BADGE_STATUS[entry.status] && (
          <StatusBadge
            status={BADGE_STATUS[entry.status]}
            variant="my_journey"
          />
        )}
        {entry.points != null && entry.points > 0 && (
          <span className="text-muted-foreground text-xs tabular-nums">
            +{entry.points}
          </span>
        )}
      </div>

      {entry.description ? (
        <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">
          {entry.description}
        </p>
      ) : (
        <p className="text-muted-foreground mt-2 text-sm italic">
          No written answer in this submission.
        </p>
      )}

      {(entry.links.length > 0 || entry.files.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {entry.links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="text-primary inline-flex items-center gap-1 text-xs underline-offset-2 hover:underline"
            >
              <Link2 className="h-3 w-3" />
              {link.title || link.url}
            </a>
          ))}
          {entry.files.map((file) => (
            <a
              key={file.url}
              href={file.url}
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
            >
              <Paperclip className="h-3 w-3" />
              {file.name}
            </a>
          ))}
        </div>
      )}

      {entry.feedback && (
        <blockquote className="bg-muted/50 text-muted-foreground mt-3 rounded-md border-l-2 px-3 py-2 text-sm">
          <span className="text-foreground font-medium">Review: </span>
          {entry.feedback}
        </blockquote>
      )}
    </li>
  );
}

/**
 * History tab of a recurring solo task: every cycle's answer, newest first,
 * so the student can read how their thinking changed month to month.
 */
export function TaskHistoryTab({ task }: { task: TeamTask }) {
  const entries = buildSubmissionHistory(task.submission_history, {
    submission_data: task.submission_data,
    status: task.status,
    completed_at: task.completed_at ?? null,
    review_feedback: task.review_feedback ?? null,
  });
  const cycles = entries.filter((e) => e.cycle != null).length;

  return (
    <div className="flex flex-col gap-6 p-5 sm:p-6">
      <div>
        <TaskSectionTitle icon={History}>Your history</TaskSectionTitle>
        <p className="text-muted-foreground -mt-2 text-sm leading-relaxed">
          {cycles === 0
            ? "Each time you finish this task your answer is kept here, so you can look back and see how your thinking changed."
            : `${cycles} ${cycles === 1 ? "cycle" : "cycles"} so far, newest first. Scroll down to see where you started.`}
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="text-muted-foreground -mt-2 text-sm italic">
          Nothing here yet. Your first submission will start the record.
        </p>
      ) : (
        <ol className="-mt-2 space-y-4">
          {entries.map((entry, index) => (
            <HistoryItem key={`${entry.date ?? "x"}-${index}`} entry={entry} />
          ))}
        </ol>
      )}
    </div>
  );
}
