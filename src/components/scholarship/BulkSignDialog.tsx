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
import { toast } from "sonner";

const BATCH_MAX = 10;

interface BulkSignDialogProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  selectedIds: string[];
  onDone: () => void;
}

/**
 * Two-button signing picker shown after the admin selects N rows to
 * countersign:
 *
 *   - **Batch (eParaksts / ID card)** — POST to /sign-batch, redirects to
 *     a single Dokobit batch UI where one PIN signs all selected docs.
 *     Max 20 per batch (Dokobit limit).
 *
 *   - **Sequential (Smart-ID)** — opens N tabs, each pointing to the
 *     Dokobit single-doc signing UI. The admin enters Smart-ID PIN once
 *     per tab (Smart-ID protocol can't batch).
 *
 * Either path opens Dokobit in new tabs so the admin's queue page
 * remains intact and live-updates as postbacks land.
 */
export function BulkSignDialog({
  open,
  onOpenChange,
  selectedIds,
  onDone,
}: BulkSignDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const overBatchLimit = selectedIds.length > BATCH_MAX;

  async function signBatch() {
    if (overBatchLimit) {
      toast.error(
        `Batch supports up to ${BATCH_MAX} documents. Please trim the selection.`
      );
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/agreements/admin/sign-batch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body?.error ?? "Batch failed");
        return;
      }
      const { url } = (await res.json()) as { url: string };
      window.open(url, "_blank", "noopener,noreferrer");
      toast.success(
        `Batch opened. Sign once with eParaksts / ID card to sign all ${selectedIds.length} agreements.`
      );
      onDone();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function signSequential() {
    setSubmitting(true);
    let opened = 0;
    try {
      for (const id of selectedIds) {
        const res = await fetch(`/api/agreements/admin/${id}/sign-single`);
        if (!res.ok) {
          toast.error(`Failed to open ${id}`);
          continue;
        }
        const { url } = (await res.json()) as { url: string };
        window.open(url, "_blank", "noopener,noreferrer");
        opened += 1;
      }
      if (opened > 0) {
        toast.success(
          `Opened ${opened} tab${opened === 1 ? "" : "s"}. Sign each with Smart-ID PIN.`
        );
      }
      onDone();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Sign {selectedIds.length} agreement
            {selectedIds.length === 1 ? "" : "s"}
          </DialogTitle>
          <DialogDescription>
            Pick the option that matches the eID method you have available.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <MethodCard
            title="Batch (recommended)"
            description={`Sign all ${selectedIds.length} documents with ONE PIN entry using eParaksts Mobile, ID card, or USB token. Max ${BATCH_MAX} per batch.`}
            buttonLabel="Sign with eParaksts / ID card"
            onClick={signBatch}
            disabled={submitting || overBatchLimit}
            warning={
              overBatchLimit
                ? `Selection of ${selectedIds.length} exceeds the ${BATCH_MAX}-doc batch limit. Trim the selection or use sequential signing.`
                : undefined
            }
          />
          <MethodCard
            title="Sequential"
            description="Open each document in its own tab and sign individually with Smart-ID PIN. Smart-ID protocol can't batch."
            buttonLabel="Sign each with Smart-ID"
            onClick={signSequential}
            disabled={submitting}
            buttonVariant="outline"
          />
        </div>

        <DialogFooter className="sm:justify-start">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface MethodCardProps {
  title: string;
  description: string;
  buttonLabel: string;
  buttonVariant?: "default" | "outline";
  onClick: () => void;
  disabled?: boolean;
  warning?: string;
}

function MethodCard({
  title,
  description,
  buttonLabel,
  buttonVariant = "default",
  onClick,
  disabled,
  warning,
}: MethodCardProps) {
  return (
    <div className="rounded-md border p-4">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-zinc-600">{description}</p>
      {warning && <p className="mt-2 text-sm text-amber-700">{warning}</p>}
      <Button
        className="mt-3"
        variant={buttonVariant}
        onClick={onClick}
        disabled={disabled}
      >
        {buttonLabel}
      </Button>
    </div>
  );
}
