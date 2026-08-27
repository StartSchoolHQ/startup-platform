"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  parseQwasarProgressCsv,
  parseUsernameMappingCsv,
} from "@/lib/diplomas/csv";
import { BatchForm } from "./batch-form";
import { CsvUploadCard } from "./csv-upload-card";
import { NewBatchForm } from "./new-batch-form";
import {
  useBatches,
  useUploadQwasarProgress,
  useUploadUsernames,
} from "./use-diplomas";

export function SetupTab({ active }: { active: boolean }) {
  const { data: batches, isLoading } = useBatches(active);
  const uploadProgress = useUploadQwasarProgress();
  const uploadUsernames = useUploadUsernames();
  const [usernameNote, setUsernameNote] = useState<string | null>(null);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-4">
        {isLoading && <Skeleton className="h-40 w-full" />}
        {(batches ?? []).map((b) => (
          <BatchForm key={b.id} batch={b} />
        ))}
        {!isLoading && <NewBatchForm />}
      </div>
      <div className="space-y-4">
        <CsvUploadCard
          title="Qwasar progress CSV"
          description="Export from the Qwasar admin Progress Dashboard (download_progress). Parsed by header name; empty cells stay empty."
          isPending={uploadProgress.isPending}
          onFile={(text) => {
            const { rows, unknownColumns, error } =
              parseQwasarProgressCsv(text);
            if (error) return { error };
            if (rows.length === 0)
              return { error: "No progress rows found in this CSV." };
            uploadProgress.mutate(rows);
            return {
              summary:
                `${rows.length} rows parsed` +
                (unknownColumns.length
                  ? ` · new tracks not yet configured: ${unknownColumns.join(", ")}`
                  : ""),
            };
          }}
        />
        <CsvUploadCard
          title="Qwasar username mapping CSV"
          description="Columns: name,email,login,status. Matches students by email and fills their Qwasar username."
          isPending={uploadUsernames.isPending}
          resultNote={usernameNote}
          onFile={(text) => {
            const { rows, error } = parseUsernameMappingCsv(text);
            if (error) return { error };
            if (rows.length === 0)
              return { error: "No mapping rows found in this CSV." };
            uploadUsernames.mutate(rows, {
              onSuccess: (result) => {
                setUsernameNote(
                  result.unmatched.length
                    ? `Unmatched emails: ${result.unmatched.join(", ")}`
                    : null
                );
              },
            });
            return { summary: `${rows.length} mapping rows parsed` };
          }}
        />
      </div>
    </div>
  );
}
