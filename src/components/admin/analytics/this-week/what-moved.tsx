"use client";

import { formatDistanceToNow } from "date-fns";
import { Award, BadgeDollarSign, Smile, Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PulseData } from "../types";

const ICON: Record<PulseData["what_moved"][number]["kind"], typeof Award> = {
  first_approval: Sparkles,
  phase_completed: Award,
  sentiment_up: Smile,
  revenue: BadgeDollarSign,
};

export function WhatMoved({
  items,
}: {
  items: PulseData["what_moved"] | undefined;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>What moved</CardTitle>
        <CardDescription>
          Good news from the last seven days: first approvals, phases completed,
          sentiment jumps, new revenue.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!items || items.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            Nothing yet this week. Fills in with the first approval or phase
            completion.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((m) => {
              const Icon = ICON[m.kind] ?? Sparkles;
              return (
                <li
                  key={`${m.kind}-${m.occurred_at}-${m.user_id}`}
                  className="flex items-start gap-2 text-sm"
                >
                  <Icon className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  <span className="flex-1">{m.text}</span>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {formatDistanceToNow(new Date(m.occurred_at))} ago
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
