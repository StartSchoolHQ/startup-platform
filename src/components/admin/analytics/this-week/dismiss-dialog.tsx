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
import { Textarea } from "@/components/ui/textarea";

interface Props {
  open: boolean;
  studentName: string | null;
  dismissDays: number;
  pending: boolean;
  onCancel: () => void;
  onConfirm: (note: string) => void;
}

export function DismissDialog({
  open,
  studentName,
  dismissDays,
  pending,
  onCancel,
  onConfirm,
}: Props) {
  const [note, setNote] = useState("");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dismiss for {dismissDays} days</DialogTitle>
          <DialogDescription>
            {studentName ?? "This student"} leaves the attention list until then
            and comes back automatically if the reasons still hold. The note
            lands in the Activity Log.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 300))}
          placeholder="What did you do? (optional)"
          rows={3}
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={() => {
              onConfirm(note.trim());
              setNote("");
            }}
          >
            {pending ? "Dismissing…" : "Dismiss"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
