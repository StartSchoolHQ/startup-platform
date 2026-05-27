"use client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";
import { StatusBadge } from "./StatusBadge";

type Row = Database["public"]["Tables"]["scholarship_agreements"]["Row"];

interface AgreementsTableProps {
  rows: Row[];
  selectedIds: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onSelect: (row: Row) => void;
  /** When the queue is empty, this caption appears in a styled card. */
  emptyMessage?: string;
}

function isSelectable(row: Row): boolean {
  // `awaiting_school_signature` = student signed AND school added as
  // second signer (i.e. dokobit_school_signer_token populated). The
  // /sign-batch API rejects anything else with 409. `student_signed`
  // is the transient state in between and never has the school token.
  return row.status === "awaiting_school_signature";
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

/**
 * Admin queue of scholarship agreements. Renders a ShadCN table with:
 *   - A checkbox column that's only enabled for `awaiting_school_signature`
 *     rows (the rows eligible for the school's batch countersign).
 *   - A header checkbox that selects/deselects all eligible rows.
 *   - Per-row "Detail" button → opens the detail modal.
 *
 * Selection state is owned by the parent so the table can be paired with
 * filters and the bulk-sign dialog without re-fetching.
 */
export function AgreementsTable({
  rows,
  selectedIds,
  onToggle,
  onToggleAll,
  onSelect,
  emptyMessage = "No agreements yet.",
}: AgreementsTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center text-sm text-zinc-500 dark:bg-zinc-950">
        {emptyMessage}
      </div>
    );
  }

  const selectable = rows.filter(isSelectable);
  const allSelected =
    selectable.length > 0 && selectable.every((row) => selectedIds.has(row.id));
  const someSelected =
    !allSelected && selectable.some((row) => selectedIds.has(row.id));

  return (
    <div className="overflow-x-auto rounded-lg border bg-white dark:bg-zinc-950">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected}
                indeterminate={someSelected}
                onChange={onToggleAll}
                aria-label="Select all eligible rows"
                disabled={selectable.length === 0}
              />
            </TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="tabular-nums">Created</TableHead>
            <TableHead className="tabular-nums">Student signed</TableHead>
            <TableHead className="text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const canSelect = isSelectable(row);
            return (
              <TableRow key={row.id} className="hover:bg-zinc-50/50">
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(row.id)}
                    onChange={() => onToggle(row.id)}
                    disabled={!canSelect}
                    aria-label={`Select ${row.recipient_email}`}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {row.recipient_email}
                </TableCell>
                <TableCell className="capitalize">
                  {row.agreement_type}
                </TableCell>
                <TableCell>
                  <StatusBadge status={row.status} />
                </TableCell>
                <TableCell className="text-sm text-zinc-600 tabular-nums">
                  {formatDate(row.created_at)}
                </TableCell>
                <TableCell className="text-sm text-zinc-600 tabular-nums">
                  {formatDate(row.student_signed_at)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSelect(row)}
                  >
                    Detail
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

interface CheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  disabled?: boolean;
  "aria-label"?: string;
}

/**
 * Minimal accessible checkbox styled with Tailwind. Avoids pulling in a
 * Radix dependency for the one place we need a checkbox in this module.
 */
function Checkbox({
  checked,
  indeterminate,
  onChange,
  disabled,
  ...rest
}: CheckboxProps) {
  return (
    <input
      type="checkbox"
      checked={checked}
      ref={(el) => {
        if (el) el.indeterminate = Boolean(indeterminate);
      }}
      onChange={onChange}
      disabled={disabled}
      className={cn(
        "text-primary focus:ring-primary/50 h-4 w-4 cursor-pointer rounded border-zinc-300 focus:ring-2 focus:ring-offset-0",
        disabled && "cursor-not-allowed opacity-50"
      )}
      aria-label={rest["aria-label"]}
    />
  );
}
