"use client";

import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { economyLabels } from "@/lib/economy-labels";
import type { AiReviewStatus } from "@/lib/database";

const labels = economyLabels("my_journey");

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
            +{xp} {labels.xp} · +{points} {labels.points}
          </p>
        ) : null}
        {status.feedback ? (
          <div className="bg-muted/50 rounded-md p-3 text-sm whitespace-pre-wrap">
            {status.feedback}
          </div>
        ) : null}
        {status.criteria_results?.length ? (
          <ul className="space-y-1 text-sm">
            {status.criteria_results.map((c) => (
              <li key={c.id} className="flex gap-2">
                {c.passed ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                )}
                <span>
                  <span className="font-medium">{c.label}</span>
                  {c.evidence ? (
                    <span className="text-muted-foreground">
                      {" "}
                      — {c.evidence}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
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
