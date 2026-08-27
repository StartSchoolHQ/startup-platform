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
import { useUpsertBatch } from "./use-diplomas";

/** Creates the next cohort batch (e.g. Batch 3) so it can be closed later. */
export function NewBatchForm() {
  const upsert = useUpsertBatch();
  const [name, setName] = useState("");
  const [prefix, setPrefix] = useState("");
  const valid = name.trim().length > 0 && /^[A-Za-z0-9]{1,10}$/.test(prefix);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New batch</CardTitle>
        <CardDescription>
          Name + diploma number prefix. Dates can be set after creating.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-[1fr_120px] gap-3">
          <div className="space-y-1">
            <Label htmlFor="new-batch-name">Name</Label>
            <Input
              id="new-batch-name"
              placeholder="e.g. Gemini"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="new-batch-prefix">Prefix</Label>
            <Input
              id="new-batch-prefix"
              placeholder="B2"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value.toUpperCase())}
            />
          </div>
        </div>
        <Button
          size="sm"
          disabled={!valid || upsert.isPending}
          onClick={() =>
            upsert.mutate(
              {
                name: name.trim(),
                number_prefix: prefix,
                admission_date: null,
                completion_date: null,
              },
              {
                onSuccess: () => {
                  setName("");
                  setPrefix("");
                },
              }
            )
          }
        >
          {upsert.isPending ? "Creating…" : "Create batch"}
        </Button>
      </CardContent>
    </Card>
  );
}
