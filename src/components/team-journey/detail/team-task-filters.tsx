"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TaskFilterStatus } from "@/lib/team-journey/detail-transforms";

export interface FilterMember {
  user_id: string;
  name: string;
}

/**
 * Compact toolbar above the team tasks table: status and assignee. The
 * achievement filter lives in the cards above, as on My Journey.
 */
export function TeamTaskFilters({
  status,
  onStatus,
  assignee,
  onAssignee,
  members,
  onClear,
}: {
  status: TaskFilterStatus;
  onStatus: (value: TaskFilterStatus) => void;
  assignee: string;
  onAssignee: (value: string) => void;
  members: FilterMember[];
  onClear: () => void;
}) {
  const active = status !== "all" || assignee !== "all";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={status}
        onValueChange={(v) => onStatus(v as TaskFilterStatus)}
      >
        <SelectTrigger size="sm" className="w-[150px]" aria-label="Status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any status</SelectItem>
          <SelectItem value="not_started">Not started</SelectItem>
          <SelectItem value="in_progress">In progress</SelectItem>
          <SelectItem value="completed">Finished</SelectItem>
        </SelectContent>
      </Select>
      <Select value={assignee} onValueChange={onAssignee}>
        <SelectTrigger size="sm" className="w-[170px]" aria-label="Assignee">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Anyone</SelectItem>
          {members.map((m) => (
            <SelectItem key={m.user_id} value={m.user_id}>
              {m.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {active && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      )}
    </div>
  );
}
