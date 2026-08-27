"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { BanFailure } from "@/lib/batches/types";
import { useRetryBans } from "./use-batch-close";

/** Shows auth-ban failures after a close and offers a re-runnable retry. */
export function BanFailuresList({
  batchId,
  failures,
}: {
  batchId: string;
  failures: BanFailure[];
}) {
  const retry = useRetryBans();
  if (failures.length === 0) return null;
  return (
    <Alert variant="destructive">
      <AlertTitle>
        {failures.length} account{failures.length === 1 ? "" : "s"} could not be
        locked out
      </AlertTitle>
      <AlertDescription className="space-y-2">
        <ul className="list-disc pl-4 text-xs">
          {failures.map((f) => (
            <li key={f.id}>
              {f.email ?? f.id}: {f.error}
            </li>
          ))}
        </ul>
        <p className="text-xs">
          The users are archived in the database. Retry the lock-out; it only
          touches accounts that are not yet banned.
        </p>
        <Button
          size="sm"
          variant="outline"
          disabled={retry.isPending}
          onClick={() => retry.mutate(batchId)}
        >
          {retry.isPending ? "Retrying…" : "Retry lock-out"}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
