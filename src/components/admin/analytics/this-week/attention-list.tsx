"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { splitDismissed, type AttentionRow } from "@/lib/analytics/attention";
import { useAnalyticsSettings } from "@/hooks/use-analytics-settings";
import { useDismissAttention } from "../use-analytics";
import { AttentionRowItem } from "./attention-row";
import { DismissDialog } from "./dismiss-dialog";

interface Props {
  rows: AttentionRow[] | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function AttentionList({ rows, isLoading, isError }: Props) {
  const { data: settings } = useAnalyticsSettings();
  const dismiss = useDismissAttention();
  const [target, setTarget] = useState<AttentionRow | null>(null);
  const [showDismissed, setShowDismissed] = useState(false);
  const { open, dismissed } = splitDismissed(rows ?? []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Who needs attention</CardTitle>
        <CardDescription>
          Students flagged by the attention rules, most urgent first. Rules live
          in Settings → Attention rules.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        )}
        {isError && (
          <p className="text-destructive text-sm">
            Couldn&apos;t load the attention list. Refresh the page.
          </p>
        )}
        {!isLoading && !isError && open.length === 0 && (
          <p className="text-muted-foreground py-6 text-center text-sm">
            Nobody is flagged right now.
          </p>
        )}
        {!isLoading && !isError && open.length > 0 && (
          <div className="divide-y">
            {open.map((row) => (
              <AttentionRowItem
                key={row.user_id}
                row={row}
                onDismiss={() => setTarget(row)}
              />
            ))}
          </div>
        )}
        {dismissed.length > 0 && (
          <div className="mt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowDismissed((v) => !v)}
              aria-expanded={showDismissed}
            >
              <ChevronDown
                className={`size-4 transition-transform ${showDismissed ? "rotate-180" : ""}`}
              />
              Dismissed ({dismissed.length})
            </Button>
            {showDismissed && (
              <div className="divide-y">
                {dismissed.map((row) => (
                  <AttentionRowItem
                    key={row.user_id}
                    row={row}
                    onDismiss={() => {}}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
      <DismissDialog
        open={!!target}
        studentName={target?.name ?? null}
        dismissDays={settings.dismissDays}
        pending={dismiss.isPending}
        onCancel={() => setTarget(null)}
        onConfirm={(note) => {
          if (!target) return;
          dismiss.mutate(
            { userId: target.user_id, note },
            { onSettled: () => setTarget(null) }
          );
        }}
      />
    </Card>
  );
}
