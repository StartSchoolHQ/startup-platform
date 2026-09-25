"use client";

import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { economyLabels } from "@/lib/economy-labels";
import type { AiReviewStatus } from "@/lib/database";

const labels = economyLabels("my_journey");

type CriterionResult = NonNullable<AiReviewStatus["criteria_results"]>[number];

/**
 * Verdict card for an AI-reviewed solo task.
 *
 * The prose feedback is the hero on both outcomes. Criteria are summarised as
 * a "N of M checks passed" line; only the failed ones are listed (label +
 * what the reviewer saw), since the passed ones add nothing the founder can
 * act on and the full rubric should not be handed over verbatim.
 */
export function AiReviewResult({
  status,
  taskStatus,
  xp,
  points,
  onResubmit,
}: {
  status: AiReviewStatus;
  taskStatus: "approved" | "rejected";
  xp: number;
  points: number;
  onResubmit: () => void;
}) {
  const passed = taskStatus === "approved";
  const criteria = status.criteria_results ?? [];
  const failed = criteria.filter((c) => !c.passed);
  const passedCount = criteria.length - failed.length;

  return (
    <Card className={passed ? "border-green-500/40" : "border-amber-500/40"}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {passed ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <XCircle className="h-5 w-5 text-amber-600" />
          )}
          {passed ? "Task passed" : "Not passed yet"}
          {status.attempt > 1 ? (
            <span className="text-muted-foreground text-sm font-normal">
              · attempt {status.attempt}
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {passed ? (
          <p className="text-sm text-green-700">
            +{xp} {labels.xp}
            {labels.hasPoints ? ` · +${points} ${labels.points}` : null}
          </p>
        ) : null}
        {status.feedback ? (
          <div className="bg-muted/50 rounded-md p-3 text-sm whitespace-pre-wrap">
            {status.feedback}
          </div>
        ) : null}
        {criteria.length ? (
          <CriteriaSummary
            passedCount={passedCount}
            total={criteria.length}
            failed={passed ? [] : failed}
          />
        ) : null}
        {!passed ? (
          <Button className="w-full gap-2" onClick={onResubmit}>
            <RefreshCw className="h-4 w-4" />
            Fix and resubmit
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CriteriaSummary({
  passedCount,
  total,
  failed,
}: {
  passedCount: number;
  total: number;
  failed: CriterionResult[];
}) {
  const allPassed = passedCount === total;
  return (
    <div className="space-y-2 text-sm">
      <p className="flex items-center gap-2 font-medium">
        {allPassed ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
        ) : (
          <XCircle className="h-4 w-4 shrink-0 text-amber-600" />
        )}
        {allPassed
          ? `All ${total} checks passed`
          : `${passedCount} of ${total} checks passed`}
      </p>
      {failed.length ? (
        <ul className="space-y-2 border-l-2 border-amber-500/40 pl-3">
          {failed.map((c) => (
            <li key={c.id}>
              <p className="font-medium">{c.label}</p>
              {c.evidence ? (
                <p className="text-muted-foreground">{c.evidence}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
