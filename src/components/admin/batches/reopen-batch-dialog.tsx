"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BatchRow } from "@/lib/diplomas/types";
import { useReopenBatch } from "./use-batch-close";

export function ReopenBatchDialog({
  batch,
  open,
  onOpenChange,
}: {
  batch: BatchRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const reopen = useReopenBatch();
  const [confirm, setConfirm] = useState("");

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setConfirm("");
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reopen batch “{batch.name}”</DialogTitle>
          <DialogDescription>
            Restores every user and product archived when this batch was closed
            and lets those users sign in again. Products that were already
            dissolved before the close stay archived.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          <Label htmlFor="confirm-reopen">
            Type <span className="font-mono">{batch.name}</span> to confirm
          </Label>
          <Input
            id="confirm-reopen"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="off"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={confirm.trim() !== batch.name || reopen.isPending}
            onClick={() =>
              reopen.mutate(batch.id, { onSuccess: () => onOpenChange(false) })
            }
          >
            {reopen.isPending ? "Reopening…" : "Reopen batch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
