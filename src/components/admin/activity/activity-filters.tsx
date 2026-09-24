"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ACTIVITY_GROUPS, type ActivityKind } from "@/lib/activity/format";
import type { ActivityFilters, FilterUser } from "@/hooks/use-admin-activity";

const ALL = "__all__";

interface Props {
  filters: ActivityFilters;
  users: FilterUser[];
  onChange: (next: ActivityFilters) => void;
}

export const EMPTY_FILTERS: ActivityFilters = {
  userId: null,
  kinds: null,
  from: null,
  to: null,
};

/** Which badge groups are currently selected, derived from the kinds array. */
function selectedBadges(kinds: ActivityKind[] | null): Set<string> {
  if (!kinds) return new Set();
  return new Set(
    ACTIVITY_GROUPS.filter((g) => g.kinds.every((k) => kinds.includes(k))).map(
      (g) => g.badge
    )
  );
}

export function ActivityFilters({ filters, users, onChange }: Props) {
  const selected = selectedBadges(filters.kinds);

  const toggleBadge = (badge: string) => {
    const next = new Set(selected);
    if (next.has(badge)) next.delete(badge);
    else next.add(badge);
    const kinds = ACTIVITY_GROUPS.filter((g) => next.has(g.badge)).flatMap(
      (g) => g.kinds
    );
    onChange({ ...filters, kinds: kinds.length ? kinds : null });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="activity-student">Student</Label>
          <Select
            value={filters.userId ?? ALL}
            onValueChange={(v) =>
              onChange({ ...filters, userId: v === ALL ? null : v })
            }
          >
            <SelectTrigger id="activity-student">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All students</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name || u.email || "Unnamed"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="activity-from">From</Label>
          <Input
            id="activity-from"
            type="date"
            value={filters.from ?? ""}
            onChange={(e) =>
              onChange({ ...filters, from: e.target.value || null })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="activity-to">To</Label>
          <Input
            id="activity-to"
            type="date"
            value={filters.to ?? ""}
            onChange={(e) =>
              onChange({ ...filters, to: e.target.value || null })
            }
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {ACTIVITY_GROUPS.map((g) => (
          <Button
            key={g.badge}
            type="button"
            size="sm"
            variant={selected.has(g.badge) ? "default" : "outline"}
            onClick={() => toggleBadge(g.badge)}
          >
            {g.badge}
          </Button>
        ))}
        <span className="text-muted-foreground text-xs">
          {selected.size === 0
            ? "Showing everything"
            : "Showing selected types"}
        </span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="ml-auto"
          onClick={() => onChange(EMPTY_FILTERS)}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}
