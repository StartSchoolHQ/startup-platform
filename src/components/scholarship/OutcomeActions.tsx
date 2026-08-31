"use client";

/**
 * Post-signature outcome actions for the agreement detail modal:
 *   - archived rows: "Mark dropped out" / "Mark terminated by school",
 *     each behind a small dialog that requires a reason.
 *   - outcome rows: "Revert to archived" (undo for misclicks; the event
 *     timeline keeps the full history).
 *
 * All three go through PATCH /api/agreements/admin/:id with
 * { action: "set_status" }, backed by the scholarship_set_outcome_v1 RPC.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Database } from "@/types/database";
import { toast } from "sonner";

type Row = Database["public"]["Tables"]["scholarship_agreements"]["Row"];
type OutcomeStatus = "dropped_out" | "terminated_by_school";

const OUTCOME_LABELS: Record<OutcomeStatus, string> = {
  dropped_out: "Dropped out",
  terminated_by_school: "Terminated by school",
};

interface OutcomeActionsProps {
  agreement: Row;
  /** Fired after a successful status change so the parent list refreshes. */
  onChanged: () => void;
}

export function OutcomeActions({ agreement, onChanged }: OutcomeActionsProps) {
  const [target, setTarget] = useState<OutcomeStatus | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState(false);
  const [pending, setPending] = useState(false);

  const isArchived = agreement.status === "archived";
  const isOutcome =
    agreement.status === "dropped_out" ||
    agreement.status === "terminated_by_school";

  async function setStatus(status: OutcomeStatus | "archived", why?: string) {
    setPending(true);
    try {
      const res = await fetch(`/api/agreements/admin/${agreement.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "set_status", status, reason: why }),
      });
      if (!res.ok) {
        toast.error(
          res.status === 409
            ? "Status changed in the meantime — refresh and try again."
            : "Status update failed. Try again."
        );
        return;
      }
      toast.success(
        status === "archived"
          ? "Reverted to archived"
          : `Marked as ${OUTCOME_LABELS[status].toLowerCase()}`
      );
      setTarget(null);
      setReason("");
      onChanged();
    } finally {
      setPending(false);
    }
  }

  function openDialog(status: OutcomeStatus) {
    setReason("");
    setReasonError(false);
    setTarget(status);
  }

  function submitOutcome() {
    if (!target) return;
    if (!reason.trim()) {
      setReasonError(true);
      return;
    }
    void setStatus(target, reason.trim());
  }

  if (!isArchived && !isOutcome) return null;

  return (
    <>
      {isArchived && (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => openDialog("dropped_out")}
          >
            Mark dropped out
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
            onClick={() => openDialog("terminated_by_school")}
          >
            Mark terminated by school
          </Button>
        </>
      )}
      {isOutcome && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => void setStatus("archived")}
        >
          {pending ? "Reverting…" : "Revert to archived"}
        </Button>
      )}

      <Dialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open && !pending) setTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {target ? `Mark as ${OUTCOME_LABELS[target].toLowerCase()}` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="outcome-reason">Reason</Label>
            <Textarea
              id="outcome-reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (reasonError) setReasonError(false);
              }}
              placeholder="Why is this student leaving the programme?"
              className={reasonError ? "border-red-500" : undefined}
              rows={3}
            />
            {reasonError && (
              <p className="text-sm text-red-600">
                A reason is required — it is stored on the agreement and in the
                event timeline.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={submitOutcome}
            >
              {pending ? "Saving…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
