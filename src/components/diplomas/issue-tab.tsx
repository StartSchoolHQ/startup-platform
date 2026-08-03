"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BatchRow } from "@/lib/diplomas/types";
import { PersonalCodeCell } from "./personal-code-cell";
import { PreviewDialog } from "./preview-dialog";
import {
  useBatches,
  useDiplomaStudents,
  useUpdateStudent,
} from "./use-diplomas";

export function IssueTab({ active }: { active: boolean }) {
  const { data: students, isLoading } = useDiplomaStudents(active);
  const { data: batches } = useBatches(active);
  const updateStudent = useUpdateStudent();
  const [search, setSearch] = useState("");
  const [previewUserId, setPreviewUserId] = useState<string | null>(null);

  const batch: BatchRow | null = batches?.[0] ?? null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students ?? [];
    return (students ?? []).filter(
      (s) =>
        s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    );
  }, [students, search]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-3">
      <Input
        placeholder="Search students…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Qwasar</TableHead>
              <TableHead>Personal code</TableHead>
              <TableHead>Startup module completed</TableHead>
              <TableHead>Diploma</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-muted-foreground text-xs">{s.email}</div>
                </TableCell>
                <TableCell>{s.team_name ?? "—"}</TableCell>
                <TableCell>
                  {s.qwasar_username ? (
                    <span className="text-xs">{s.qwasar_username}</span>
                  ) : (
                    <Badge variant="destructive">missing</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <PersonalCodeCell userId={s.id} value={s.personal_code} />
                </TableCell>
                <TableCell>
                  <Switch
                    checked={s.startup_module_completed}
                    disabled={updateStudent.isPending}
                    onCheckedChange={(checked) =>
                      updateStudent.mutate({
                        user_id: s.id,
                        startup_module_completed: checked,
                      })
                    }
                  />
                </TableCell>
                <TableCell>
                  {s.issued_diploma ? (
                    <Badge variant="secondary">
                      {s.issued_diploma.diploma_number}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">
                      not issued
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!batch}
                    onClick={() => setPreviewUserId(s.id)}
                  >
                    Preview & issue
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {previewUserId && batch && (
        <PreviewDialog
          userId={previewUserId}
          batch={batch}
          onClose={() => setPreviewUserId(null)}
        />
      )}
    </div>
  );
}
