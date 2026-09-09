"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import type { AiReviewCriterion } from "@/lib/data/ai-reviews";

export function CriteriaSection({
  criteria,
}: {
  criteria: AiReviewCriterion[];
}) {
  if (!criteria.length) {
    return (
      <p className="text-muted-foreground text-sm">
        No criteria results recorded
      </p>
    );
  }

  return (
    <ul className="space-y-1 text-sm">
      {criteria.map((c) => (
        <li key={c.id} className="flex gap-2">
          {c.passed ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          )}
          <span>
            <span className="font-medium">{c.label}</span>
            {c.evidence ? (
              <span className="text-muted-foreground"> — {c.evidence}</span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
