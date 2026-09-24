"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAnalyticsSettings,
  useSetAnalyticsSettings,
} from "@/hooks/use-analytics-settings";
import type { AnalyticsSettings } from "@/lib/analytics/settings";

const FIELDS: {
  key: keyof AnalyticsSettings;
  label: string;
  help: string;
  max: number;
}[] = [
  {
    key: "inactiveDays",
    label: "Inactive after (days)",
    help: "No sign-in, task action, report or chat",
    max: 90,
  },
  {
    key: "stuckDays",
    label: "Stuck on a task after (days)",
    help: "In progress with nothing submitted",
    max: 90,
  },
  {
    key: "rejections",
    label: "Repeated rejections",
    help: "On the same task",
    max: 20,
  },
  {
    key: "lowSentiment",
    label: "Low sentiment at or below",
    help: "Latest weekly report score, 1–10",
    max: 10,
  },
  {
    key: "missedReports",
    label: "Missed reports (consecutive weeks)",
    help: "Expected but not submitted",
    max: 12,
  },
  {
    key: "behindPhases",
    label: "Behind the cohort by (phases)",
    help: "Below the cohort median",
    max: 5,
  },
  {
    key: "dismissDays",
    label: "Dismiss for (days)",
    help: "How long a dismissed student stays off the list",
    max: 60,
  },
];

/** Settings → Attention rules: the thresholds behind Analytics → This week. */
export function AttentionRulesCard() {
  const { data: settings, isLoading, isError } = useAnalyticsSettings();
  const setSettings = useSetAnalyticsSettings();
  const [inputs, setInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    // Sync editable copies after load/save, not while the admin is typing.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInputs(
      Object.fromEntries(FIELDS.map((f) => [f.key, String(settings[f.key])]))
    );
  }, [settings]);

  const commit = (key: keyof AnalyticsSettings, max: number) => {
    const parsed = parseInt(inputs[key] ?? "", 10);
    if (!Number.isFinite(parsed)) {
      setInputs((s) => ({ ...s, [key]: String(settings[key]) }));
      return;
    }
    const clamped = Math.min(max, Math.max(1, parsed));
    if (clamped !== settings[key]) setSettings.mutate({ [key]: clamped });
    else setInputs((s) => ({ ...s, [key]: String(clamped) }));
  };

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Attention rules</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive text-sm">
            Couldn&apos;t load the attention rules — refresh to try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attention rules</CardTitle>
        <CardDescription>
          When a student shows up on Analytics → This week. Changes apply on the
          next page load.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FIELDS.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <Label htmlFor={`rule-${f.key}`}>{f.label}</Label>
            {isLoading ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <Input
                id={`rule-${f.key}`}
                type="number"
                min={1}
                max={f.max}
                value={inputs[f.key] ?? ""}
                disabled={setSettings.isPending}
                onChange={(e) =>
                  setInputs((s) => ({ ...s, [f.key]: e.target.value }))
                }
                onBlur={() => commit(f.key, f.max)}
              />
            )}
            <p className="text-muted-foreground text-xs">{f.help}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
