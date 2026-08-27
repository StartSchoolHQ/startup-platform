"use client";

// Close a cohort batch: preview → uncheck exceptions → type batch name →
// archive + lock out. Nothing is deleted; reopen reverses it.

import { useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Skeleton } from "@/components/ui/skeleton";
import type { BatchRow } from "@/lib/diplomas/types";
import type { CloseBatchResult } from "@/lib/batches/types";
import { BanFailuresList } from "./ban-failures-list";
import { TeamsCheckList, UsersCheckList } from "./close-batch-lists";
import { useBatchClosePreview, useCloseBatch } from "./use-batch-close";

export function CloseBatchDialog({
  batch,
  open,
  onOpenChange,
}: {
  batch: BatchRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data, isLoading, isError } = useBatchClosePreview(batch.id, open);
  const close = useCloseBatch();
  const [users, setUsers] = useState<Set<string>>(new Set());
  const [teams, setTeams] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [confirm, setConfirm] = useState("");
  const [result, setResult] = useState<CloseBatchResult | null>(null);

  // Defaults: if anyone is already tagged with this batch, pre-check only
  // them (untagged = next cohort, e.g. a student who joined early). If nobody
  // is tagged yet, pre-check everyone. Admin teams are never pre-checked.
  useEffect(() => {
    if (!data) return;
    const anyTagged = data.users.some((u) => u.pre_tagged);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUsers(
      new Set(
        data.users.filter((u) => !anyTagged || u.pre_tagged).map((u) => u.id)
      )
    );
    const anyTeamTagged = data.teams.some((t) => t.pre_tagged);
    setTeams(
      new Set(
        data.teams
          .filter((t) => !t.has_admin_member)
          .filter((t) => !anyTeamTagged || t.pre_tagged)
          .map((t) => t.id)
      )
    );
  }, [data]);

  const q = search.trim().toLowerCase();
  const visibleUsers = useMemo(
    () =>
      (data?.users ?? []).filter(
        (u) =>
          !q ||
          (u.name ?? "").toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      ),
    [data, q]
  );
  const visibleTeams = useMemo(
    () =>
      (data?.teams ?? []).filter((t) => !q || t.name.toLowerCase().includes(q)),
    [data, q]
  );

  const toggle =
    (set: React.Dispatch<React.SetStateAction<Set<string>>>) =>
    (id: string, next: boolean) =>
      set((prev) => {
        const s = new Set(prev);
        if (next) s.add(id);
        else s.delete(id);
        return s;
      });
  const toggleAll =
    (set: React.Dispatch<React.SetStateAction<Set<string>>>, ids: string[]) =>
    (next: boolean) =>
      set((prev) => {
        const s = new Set(prev);
        ids.forEach((id) => (next ? s.add(id) : s.delete(id)));
        return s;
      });

  const canSubmit = !!data && confirm.trim() === batch.name && !close.isPending;

  const handleClose = (next: boolean) => {
    if (!next) {
      setConfirm("");
      setSearch("");
      setResult(null);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Close batch “{batch.name}”</DialogTitle>
          <DialogDescription>
            Archives the selected users and products, tags them with this batch,
            and blocks the users from signing in. Nothing is deleted — the batch
            can be reopened later.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-3">
            <Alert>
              <AlertTitle>Batch closed</AlertTitle>
              <AlertDescription>
                {result.users_archived} users and {result.teams_archived}{" "}
                products archived. {result.banned} accounts locked out.
              </AlertDescription>
            </Alert>
            <BanFailuresList batchId={batch.id} failures={result.banFailures} />
          </div>
        ) : isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : isError || !data ? (
          <Alert variant="destructive">
            <AlertTitle>Could not load preview</AlertTitle>
            <AlertDescription>Reload the page and try again.</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            <Input
              placeholder="Filter by name, email or product…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <UsersCheckList
                items={visibleUsers}
                checked={users}
                onToggle={toggle(setUsers)}
                onToggleAll={toggleAll(
                  setUsers,
                  visibleUsers.map((u) => u.id)
                )}
              />
              <TeamsCheckList
                items={visibleTeams}
                checked={teams}
                onToggle={toggle(setTeams)}
                onToggleAll={toggleAll(
                  setTeams,
                  visibleTeams.map((t) => t.id)
                )}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirm-batch">
                Type <span className="font-mono">{batch.name}</span> to confirm
                archiving {users.size} users and {teams.size} products
              </Label>
              <Input
                id="confirm-batch"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            {result ? "Done" : "Cancel"}
          </Button>
          {!result && (
            <Button
              variant="destructive"
              disabled={!canSubmit}
              onClick={() =>
                close.mutate(
                  {
                    batchId: batch.id,
                    userIds: [...users],
                    teamIds: [...teams],
                  },
                  { onSuccess: setResult }
                )
              }
            >
              {close.isPending ? "Closing…" : "Close batch"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
