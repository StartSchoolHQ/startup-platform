"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { STARTUP_CATEGORIES } from "@/lib/diplomas/constants";
import { TECH_MODULE_MIN_PERCENT } from "@/lib/diplomas/snapshot";
import type { BatchRow } from "@/lib/diplomas/types";
import { useDiplomaPreview, useIssueDiploma } from "./use-diplomas";

const READINESS_LABELS: Record<string, string> = {
  qwasar_username: "Qwasar username set",
  personal_code: "Personal code set",
  batch_dates: "Batch admission & completion dates set",
  has_qwasar_rows: "Qwasar progress uploaded for this student",
};

export function PreviewDialog({
  userId,
  batch,
  onClose,
}: {
  userId: string;
  batch: BatchRow;
  onClose: () => void;
}) {
  const { data, isLoading, isError } = useDiplomaPreview(userId, batch.id);
  const issue = useIssueDiploma();

  const ready =
    !!data && Object.values(data.readiness).every((v) => v === true);
  const displayName = new Map(
    STARTUP_CATEGORIES.map((c) => [c.key, c.displayName])
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Diploma preview
            {data && (
              <Badge className="ml-2" variant="secondary">
                {data.diploma_type === "full" ? "Full" : "Tech module only"}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Values below are computed live and frozen into the diploma at issue
            time. Next number:{" "}
            {`${batch.number_prefix}-S${String(batch.next_seq).padStart(3, "0")}`}
          </DialogDescription>
        </DialogHeader>

        {isLoading && <Skeleton className="h-48 w-full" />}
        {isError && (
          <p className="text-destructive text-sm">
            Failed to compute preview — check the student&apos;s data.
          </p>
        )}

        {data && (
          <div className="space-y-4">
            <div className="space-y-1">
              {Object.entries(data.readiness).map(([key, ok]) => (
                <div key={key} className="flex items-center gap-2 text-sm">
                  {ok ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="text-destructive h-4 w-4" />
                  )}
                  {READINESS_LABELS[key] ?? key}
                </div>
              ))}
            </div>

            <div>
              <h4 className="mb-1 text-sm font-semibold">
                Tech Module ({data.data.tech_modules.length} tracks)
              </h4>
              <ul className="space-y-0.5 text-sm">
                {data.data.tech_modules.map((t) => {
                  const printed = (t.percent ?? 0) >= TECH_MODULE_MIN_PERCENT;
                  return (
                    <li
                      key={t.track}
                      className={`flex justify-between ${printed ? "" : "text-muted-foreground line-through"}`}
                    >
                      <span>{t.display_name}</span>
                      <span className="tabular-nums">
                        {t.percent ?? "—"}%
                        {!printed &&
                          ` — not printed (<${TECH_MODULE_MIN_PERCENT}%)`}
                      </span>
                    </li>
                  );
                })}
                {data.data.tech_modules.length === 0 && (
                  <li className="text-muted-foreground">
                    No Qwasar progress rows.
                  </li>
                )}
              </ul>
            </div>

            {data.diploma_type === "full" && (
              <div>
                <h4 className="mb-1 text-sm font-semibold">
                  Startup Module{" "}
                  {data.data.startup_name ? `— ${data.data.startup_name}` : ""}
                </h4>
                <ul className="space-y-0.5 text-sm">
                  {data.data.startup_modules.map((m) => (
                    <li key={m.category} className="flex justify-between">
                      <span>{displayName.get(m.category) ?? m.category}</span>
                      <span className="tabular-nums">
                        {m.hours}h · {m.percent}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!ready || issue.isPending}
            onClick={() =>
              issue.mutate(
                { user_id: userId, batch_id: batch.id },
                { onSuccess: () => onClose() }
              )
            }
          >
            {issue.isPending ? "Issuing…" : "Issue diploma"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
