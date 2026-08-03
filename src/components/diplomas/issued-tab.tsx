"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  openDiplomaDownload,
  useIssuedDiplomas,
  useSupersedeDiploma,
} from "./use-diplomas";

export function IssuedTab({ active }: { active: boolean }) {
  const { data: diplomas, isLoading } = useIssuedDiplomas(active);
  const supersede = useSupersedeDiploma();
  const [supersedeId, setSupersedeId] = useState<string | null>(null);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Number</TableHead>
            <TableHead>Student</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Issued</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {(diplomas ?? []).map((d) => (
            <TableRow key={d.id}>
              <TableCell className="font-medium">{d.diploma_number}</TableCell>
              <TableCell>
                <div>{d.users?.name ?? "—"}</div>
                <div className="text-muted-foreground text-xs">
                  {d.users?.email}
                </div>
              </TableCell>
              <TableCell>
                {d.diploma_type === "full" ? "Full" : "Tech only"}
              </TableCell>
              <TableCell>
                {new Date(d.issued_at).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <Badge
                  variant={d.status === "issued" ? "secondary" : "outline"}
                >
                  {d.status}
                </Badge>
              </TableCell>
              <TableCell className="space-x-2 text-right">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openDiplomaDownload(d.id)}
                >
                  Download
                </Button>
                {d.status === "issued" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={supersede.isPending}
                    onClick={() => setSupersedeId(d.id)}
                  >
                    Supersede
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {(diplomas ?? []).length === 0 && (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-muted-foreground py-8 text-center"
              >
                No diplomas issued yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <AlertDialog
        open={!!supersedeId}
        onOpenChange={(open) => !open && setSupersedeId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supersede this diploma?</AlertDialogTitle>
            <AlertDialogDescription>
              The diploma stays stored for audit but stops being the
              student&apos;s active diploma. You can then issue a new one with a
              fresh number.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (supersedeId) supersede.mutate(supersedeId);
                setSupersedeId(null);
              }}
            >
              Supersede
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
