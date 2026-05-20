"use client";

/**
 * /dashboard/admin/agreements
 *
 * Admin queue for scholarship agreements:
 *   - Lists every row, sortable by status
 *   - Multi-select student-signed rows for batch countersign
 *   - Detail modal with realtime updates + per-row actions
 *
 * Auth: client-side guard via useApp() (matches the rest of the admin
 * pages); the API routes also enforce requireAdmin() server-side so the
 * UI guard is defence-in-depth, not the security boundary.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { redirect } from "next/navigation";
import { AgreementDetailModal } from "@/components/scholarship/AgreementDetailModal";
import { AgreementsTable } from "@/components/scholarship/AgreementsTable";
import { BulkSignDialog } from "@/components/scholarship/BulkSignDialog";
import { Button } from "@/components/ui/button";
import { AdminSkeleton } from "@/components/ui/admin-skeleton";
import { useApp } from "@/contexts/app-context";
import type { Database } from "@/types/database";
import { toast } from "sonner";

type Row = Database["public"]["Tables"]["scholarship_agreements"]["Row"];

const BATCH_MAX = 20;

export default function AdminAgreementsPage() {
  const { user, loading } = useApp();
  const [rows, setRows] = useState<Row[]>([]);
  const [rowsLoading, setRowsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  // Client-side admin guard. Server-side requireAdmin() is the real fence.
  if (!loading && (!user || user.primary_role !== "admin")) {
    redirect("/dashboard");
  }

  const reload = useCallback(async () => {
    setRowsLoading(true);
    try {
      const res = await fetch("/api/agreements/admin");
      if (!res.ok) {
        toast.error("Failed to load agreements");
        return;
      }
      const { data } = (await res.json()) as { data: Row[] };
      setRows(data);
    } finally {
      setRowsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.primary_role === "admin") reload();
  }, [user, reload]);

  const eligibleIds = useMemo(
    () =>
      rows
        .filter((row) => row.status === "student_signed")
        .map((row) => row.id),
    [rows]
  );

  const onToggle = useCallback((id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const onToggleAll = useCallback(() => {
    setSelectedIds((current) => {
      const allSelected =
        eligibleIds.length > 0 && eligibleIds.every((id) => current.has(id));
      if (allSelected) return new Set();
      // Cap at the batch limit so the UI doesn't lure admins into over-selecting.
      return new Set(eligibleIds.slice(0, BATCH_MAX));
    });
  }, [eligibleIds]);

  const onBulkDone = useCallback(() => {
    setSelectedIds(new Set());
    reload();
  }, [reload]);

  const onDetailChanged = useCallback(() => {
    reload();
  }, [reload]);

  const onCloseDetail = useCallback((open: boolean) => {
    if (!open) setDetailId(null);
  }, []);

  if (loading || !user || user.primary_role !== "admin") {
    return <AdminSkeleton />;
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Scholarship agreements
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Review student submissions and countersign as the school.
          </p>
        </div>
        <Button
          onClick={() => setBulkOpen(true)}
          disabled={selectedIds.size === 0}
        >
          Sign {selectedIds.size > 0 ? selectedIds.size : ""} selected
        </Button>
      </div>

      <AgreementsTable
        rows={rows}
        selectedIds={selectedIds}
        onToggle={onToggle}
        onToggleAll={onToggleAll}
        onSelect={(row) => setDetailId(row.id)}
        emptyMessage={
          rowsLoading
            ? "Loading agreements…"
            : "No agreements yet. Share /full-scholarship-agreement or /partial-scholarship-agreement with students to get started."
        }
      />

      <BulkSignDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        selectedIds={Array.from(selectedIds)}
        onDone={onBulkDone}
      />

      <AgreementDetailModal
        open={detailId !== null}
        onOpenChange={onCloseDetail}
        agreementId={detailId}
        onChanged={onDetailChanged}
      />
    </div>
  );
}
