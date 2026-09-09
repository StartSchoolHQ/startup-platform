"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { EvidenceManifestEntry } from "@/lib/ai-review/types";

export function EvidenceManifestSection({
  manifest,
}: {
  manifest: EvidenceManifestEntry[];
}) {
  if (!manifest.length) {
    return (
      <p className="text-muted-foreground text-sm">
        No evidence manifest recorded
      </p>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Id</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Note</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {manifest.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="max-w-[140px] truncate font-mono text-xs">
                {entry.id}
              </TableCell>
              <TableCell className="text-sm capitalize">
                {entry.source}
              </TableCell>
              <TableCell className="text-sm">{entry.status}</TableCell>
              <TableCell className="text-muted-foreground max-w-[240px] truncate text-sm">
                {entry.note || "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
