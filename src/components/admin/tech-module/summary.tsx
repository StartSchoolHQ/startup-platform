"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Play } from "lucide-react";
import type {
  ProgramAssistantLatest,
  VerdictStatus,
} from "@/types/program-assistant";

const STATUSES: VerdictStatus[] = [
  "Talk to",
  "Watch",
  "On pace",
  "Not tracked",
];

export const STATUS_TONE: Record<VerdictStatus, string> = {
  "Talk to": "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  Watch: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  "On pace":
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  "Not tracked": "bg-muted text-muted-foreground",
};

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Europe/Riga",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  data: ProgramAssistantLatest;
  onRunNow: () => void;
  runPending: boolean;
}

export function TechModuleSummary({ data, onRunNow, runPending }: Props) {
  const { run, latest_run: latest, verdicts, stale_days: stale } = data;
  const running = latest?.status === "running";
  const counts = Object.fromEntries(
    STATUSES.map((s) => [s, verdicts.filter((v) => v.status === s).length])
  ) as Record<VerdictStatus, number>;
  const week = verdicts.find((v) => v.week != null)?.week ?? null;
  const warnings = (run?.steps ?? []).filter((s) => s.status !== "ok");

  return (
    <div className="space-y-4">
      {latest?.status === "failed" && (
        <Alert variant="destructive">
          <AlertTitle>Last run failed</AlertTitle>
          <AlertDescription>
            {formatWhen(latest.started_at)} — {latest.error ?? "no error text"}.
            The table shows the last successful run.
          </AlertDescription>
        </Alert>
      )}
      {stale != null && stale >= 8 && (
        <Alert>
          <AlertTitle>Stale data</AlertTitle>
          <AlertDescription>
            The last successful run is {stale} days old. Check the alert emails
            or start a run.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-muted-foreground text-sm">
          {run ? (
            <>
              Snapshot <span className="font-medium">{run.snapshot_date}</span>
              {week != null && <> · week {week}</>} · run{" "}
              {formatWhen(run.finished_at ?? run.started_at)} ({run.kind})
              {warnings.length > 0 && (
                <>
                  {" "}
                  ·{" "}
                  <span className="text-amber-700 dark:text-amber-300">
                    {warnings.map((w) => `${w.step}: ${w.status}`).join(", ")}
                  </span>
                </>
              )}
            </>
          ) : (
            "No successful run yet."
          )}
        </div>
        <Button
          size="sm"
          onClick={onRunNow}
          disabled={runPending || running}
          aria-busy={runPending || running}
        >
          {running || runPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          {running ? "Running…" : "Run now"}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STATUSES.map((s) => (
          <Card key={s}>
            <CardContent className="flex items-center justify-between p-4">
              <Badge variant="outline" className={STATUS_TONE[s]}>
                {s}
              </Badge>
              <span className="text-2xl font-semibold tabular-nums">
                {counts[s]}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
