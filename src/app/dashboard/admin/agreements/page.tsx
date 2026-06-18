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
import { AgreementsSummaryCard } from "@/components/scholarship/AgreementsSummaryCard";
import { AgreementsTable } from "@/components/scholarship/AgreementsTable";
import { BulkSignDialog } from "@/components/scholarship/BulkSignDialog";
import { DokobitDemoPanel } from "@/components/scholarship/DokobitDemoPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminSkeleton } from "@/components/ui/admin-skeleton";
import { useApp } from "@/contexts/app-context";
import type { Database } from "@/types/database";
import { toast } from "sonner";

type Row = Database["public"]["Tables"]["scholarship_agreements"]["Row"];
type Status = Database["public"]["Enums"]["scholarship_agreement_status"];
type AgreementType = Database["public"]["Enums"]["scholarship_agreement_type"];

const BATCH_MAX = 10;
const SEARCH_DEBOUNCE_MS = 250;

// The ONLY statuses the admin queue surfaces. Everything else
// (identity_verified, student_signed, school_signed, cancelled, expired,
// failed) stays in the DB but is never shown — the board only cares about
// these four. Acts as a whitelist for both the table and the dropdown.
const VISIBLE_STATUSES: ReadonlySet<Status> = new Set([
  "draft",
  "awaiting_student_signature",
  "awaiting_school_signature",
  "archived",
]);

// Status options in workflow order. "all" is the no-filter sentinel.
// Kept in lockstep with VISIBLE_STATUSES above.
const STATUS_OPTIONS: Array<{ value: Status | "all"; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "awaiting_student_signature", label: "Awaiting student signature" },
  { value: "awaiting_school_signature", label: "Awaiting school signature" },
  { value: "archived", label: "Archived" },
];

// Type filter options. "all" is the no-filter sentinel.
const TYPE_OPTIONS: Array<{ value: AgreementType | "all"; label: string }> = [
  { value: "all", label: "All types" },
  { value: "full", label: "Full" },
  { value: "partial", label: "Partial" },
];

export default function AdminAgreementsPage() {
  const { user, loading } = useApp();
  const [rows, setRows] = useState<Row[]>([]);
  const [rowsLoading, setRowsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [typeFilter, setTypeFilter] = useState<AgreementType | "all">("all");

  // Client-side admin guard. Server-side requireAdmin() is the real fence.
  if (!loading && (!user || user.primary_role !== "admin")) {
    redirect("/dashboard");
  }

  // Debounce the search input so we don't fire a request per keystroke.
  useEffect(() => {
    const handle = setTimeout(
      () => setSearch(searchInput.trim()),
      SEARCH_DEBOUNCE_MS
    );
    return () => clearTimeout(handle);
  }, [searchInput]);

  const reload = useCallback(async () => {
    setRowsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);
      const qs = params.toString();
      const res = await fetch(`/api/agreements/admin${qs ? `?${qs}` : ""}`);
      if (!res.ok) {
        toast.error("Failed to load agreements");
        return;
      }
      const { data } = (await res.json()) as { data: Row[] };
      setRows(data);
    } finally {
      setRowsLoading(false);
    }
  }, [search, statusFilter, typeFilter]);

  useEffect(() => {
    if (user?.primary_role === "admin") reload();
  }, [user, reload]);

  // Whitelist the four statuses the board cares about. Always applied, so a
  // row in any other status (cancelled/expired/failed/etc.) can never render,
  // no matter what the API returns. Pure view filter; rows stay in the DB.
  const visibleRows = useMemo(
    () => rows.filter((row) => VISIBLE_STATUSES.has(row.status)),
    [rows]
  );

  // Rows the admin can batch-countersign: the student has signed and the
  // row has been promoted to awaiting_school_signature (the school was
  // placed on the document as a co-signer at creation).
  const eligibleIds = useMemo(
    () =>
      visibleRows
        .filter((row) => row.status === "awaiting_school_signature")
        .map((row) => row.id),
    [visibleRows]
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

      <DokobitDemoPanel />

      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="search"
          placeholder="Search by name, surname, or email"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-sm"
          aria-label="Search agreements"
        />
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as Status | "all")}
        >
          <SelectTrigger className="w-[220px]" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={typeFilter}
          onValueChange={(value) =>
            setTypeFilter(value as AgreementType | "all")
          }
        >
          <SelectTrigger className="w-[140px]" aria-label="Filter by type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(search || statusFilter !== "all" || typeFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchInput("");
              setStatusFilter("all");
              setTypeFilter("all");
            }}
          >
            Clear
          </Button>
        )}
        <div className="ml-auto">
          <AgreementsSummaryCard rows={visibleRows} />
        </div>
      </div>

      <AgreementsTable
        rows={visibleRows}
        selectedIds={selectedIds}
        onToggle={onToggle}
        onToggleAll={onToggleAll}
        onSelect={(row) => setDetailId(row.id)}
        emptyMessage={
          rowsLoading
            ? "Loading agreements…"
            : search || statusFilter !== "all" || typeFilter !== "all"
              ? "No agreements match the current filters."
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
