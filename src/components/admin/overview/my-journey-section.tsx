import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AiReviewsSummary } from "@/components/admin/ai-reviews-summary";
import { TaskPipelineCard } from "./task-pipeline-card";
import type { AdminStats } from "@/types/admin-stats";

/** Overview block shown while the My Journey phase is on. */
export function MyJourneySection({ stats }: { stats: AdminStats }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wide uppercase">
          My Journey
        </h3>
        <Link
          href="/dashboard/admin/ai-reviews"
          className="text-primary flex items-center gap-1 text-xs font-medium hover:underline"
        >
          AI reviews <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <AiReviewsSummary summary={stats.aiReview} />
      <TaskPipelineCard
        title="Solo task pipeline"
        rows={stats.taskPipeline}
        activityType="individual"
      />
    </section>
  );
}
