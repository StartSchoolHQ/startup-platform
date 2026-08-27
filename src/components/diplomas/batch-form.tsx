"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CloseBatchDialog } from "@/components/admin/batches/close-batch-dialog";
import { ReopenBatchDialog } from "@/components/admin/batches/reopen-batch-dialog";
import { useRetryBans } from "@/components/admin/batches/use-batch-close";
import type { BatchRow } from "@/lib/diplomas/types";
import { useUpsertBatch } from "./use-diplomas";

export function BatchForm({ batch }: { batch: BatchRow }) {
  const upsert = useUpsertBatch();
  const retryBans = useRetryBans();
  const [admission, setAdmission] = useState(batch.admission_date ?? "");
  const [completion, setCompletion] = useState(batch.completion_date ?? "");
  const [closeOpen, setCloseOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const closed = !!batch.closed_at;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{batch.name}</CardTitle>
          {closed ? (
            <Badge variant="outline">
              Closed {new Date(batch.closed_at!).toLocaleDateString()}
            </Badge>
          ) : (
            <Badge>Open</Badge>
          )}
        </div>
        <CardDescription>
          Prefix {batch.number_prefix} · next number {batch.number_prefix}-S
          {String(batch.next_seq).padStart(3, "0")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor={`adm-${batch.id}`}>Date of admission</Label>
            <Input
              id={`adm-${batch.id}`}
              type="date"
              value={admission}
              onChange={(e) => setAdmission(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`cmp-${batch.id}`}>Date of completion</Label>
            <Input
              id={`cmp-${batch.id}`}
              type="date"
              value={completion}
              onChange={(e) => setCompletion(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            disabled={upsert.isPending}
            onClick={() =>
              upsert.mutate({
                id: batch.id,
                name: batch.name,
                number_prefix: batch.number_prefix,
                admission_date: admission || null,
                completion_date: completion || null,
              })
            }
          >
            {upsert.isPending ? "Saving…" : "Save dates"}
          </Button>
          <div className="flex-1" />
          {closed ? (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={retryBans.isPending}
                onClick={() => retryBans.mutate(batch.id)}
              >
                {retryBans.isPending ? "Checking…" : "Retry lock-out"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setReopenOpen(true)}
              >
                Reopen batch…
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setCloseOpen(true)}
            >
              Close batch…
            </Button>
          )}
        </div>
      </CardContent>
      <CloseBatchDialog
        batch={batch}
        open={closeOpen}
        onOpenChange={setCloseOpen}
      />
      <ReopenBatchDialog
        batch={batch}
        open={reopenOpen}
        onOpenChange={setReopenOpen}
      />
    </Card>
  );
}
