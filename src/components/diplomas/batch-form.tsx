"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BatchRow } from "@/lib/diplomas/types";
import { useUpsertBatch } from "./use-diplomas";

export function BatchForm({ batch }: { batch: BatchRow }) {
  const upsert = useUpsertBatch();
  const [admission, setAdmission] = useState(batch.admission_date ?? "");
  const [completion, setCompletion] = useState(batch.completion_date ?? "");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{batch.name}</CardTitle>
        <CardDescription>
          Prefix {batch.number_prefix} · next number {batch.number_prefix}-S
          {String(batch.next_seq).padStart(3, "0")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor={`adm-${batch.id}`}>Date of admission</Label>
            <Input
              id={`adm-${batch.id}`}
              type="date"
              value={admission}
              onChange={(e) => setAdmission(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`cmp-${batch.id}`}>Date of completion</Label>
            <Input
              id={`cmp-${batch.id}`}
              type="date"
              value={completion}
              onChange={(e) => setCompletion(e.target.value)}
            />
          </div>
        </div>
        <Button
          size="sm"
          disabled={upsert.isPending}
          onClick={() =>
            upsert.mutate({
              id: batch.id,
              name: batch.name,
              number_prefix: batch.number_prefix,
              admission_date: admission || null,
              completion_date: completion || null,
            })
          }
        >
          {upsert.isPending ? "Saving…" : "Save dates"}
        </Button>
      </CardContent>
    </Card>
  );
}
