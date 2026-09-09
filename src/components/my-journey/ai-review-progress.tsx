"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAiReviewStatus } from "@/hooks/use-ai-review-status";

const STAGE_COPY: Record<string, string> = {
  fetching_evidence: "Collecting your submission…",
  reading_files: "Reading your files…",
  checking_links: "Opening your links…",
  reviewing: "Checking your work against the criteria…",
  finalizing: "Writing your feedback…",
};

const STAGE_PROGRESS: Record<string, number> = {
  fetching_evidence: 15,
  reading_files: 35,
  checking_links: 55,
  reviewing: 80,
  finalizing: 95,
};

/** Never claims a result — just keeps the wait feeling alive. */
const FILLER = [
  "Looking for dates and visible details in screenshots…",
  "Counting what the criteria ask to count…",
  "Comparing what you wrote with what the evidence shows…",
  "Cross-checking each criterion one by one…",
  "Almost there — making sure nothing is missed…",
];

/**
 * Plain (non-component) helper so `Date.now()` doesn't run during a
 * component's render body — react-hooks/purity flags that as impure.
 */
function ageMsSince(createdAt: string | undefined): number {
  if (!createdAt) return 0;
  return Date.now() - new Date(createdAt).getTime();
}

export function AiReviewProgress({
  progressId,
  onFinished,
}: {
  progressId: string;
  onFinished: () => void;
}) {
  const { data, isError } = useAiReviewStatus(progressId, { active: true });
  const [fillerIdx, setFillerIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(
      () => setFillerIdx((i) => (i + 1) % FILLER.length),
      4000
    );
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (data && !["queued", "running"].includes(data.status)) onFinished();
  }, [data, onFinished]);

  const stage = data?.stage ?? "fetching_evidence";
  const ageMs = ageMsSince(data?.created_at);
  const slow = ageMs > 5 * 60_000;

  return (
    <Card className="border-primary/30">
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-center gap-3">
          <Loader2 className="text-primary h-5 w-5 animate-spin" />
          <div>
            <div className="font-medium">
              {slow
                ? "Still working — you can leave, we'll notify you"
                : "Reviewing your submission"}
            </div>
            <div className="text-muted-foreground text-sm">
              {STAGE_COPY[stage] ?? STAGE_COPY.fetching_evidence}
            </div>
          </div>
        </div>
        <Progress value={STAGE_PROGRESS[stage] ?? 15} />
        <p className="text-muted-foreground flex items-center gap-2 text-xs">
          <Sparkles className="h-3 w-3" />
          {FILLER[fillerIdx]}
        </p>
        {data?.attempt && data.attempt > 1 ? (
          <p className="text-muted-foreground text-xs">
            Attempt {data.attempt}
          </p>
        ) : null}
        {isError ? (
          <p className="text-destructive text-xs">
            Couldn&apos;t refresh the review status. It keeps running — reload
            the page in a moment.
          </p>
        ) : null}
        <p className="text-muted-foreground text-xs">
          You can close this page. The review continues and you&apos;ll get a
          notification.
        </p>
      </CardContent>
    </Card>
  );
}
