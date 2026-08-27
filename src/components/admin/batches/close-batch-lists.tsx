"use client";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { BatchClosePreview } from "@/lib/batches/types";

interface ListProps<T extends { id: string }> {
  title: string;
  items: T[];
  checked: Set<string>;
  onToggle: (id: string, next: boolean) => void;
  onToggleAll: (next: boolean) => void;
  render: (item: T) => React.ReactNode;
}

function CheckList<T extends { id: string }>({
  title,
  items,
  checked,
  onToggle,
  onToggleAll,
  render,
}: ListProps<T>) {
  const selected = items.filter((i) => checked.has(i.id)).length;
  return (
    <div className="flex min-h-0 flex-col rounded-md border">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id={`all-${title}`}
            checked={
              selected === 0
                ? false
                : selected === items.length
                  ? true
                  : "indeterminate"
            }
            onCheckedChange={(v) => onToggleAll(v === true)}
          />
          <label htmlFor={`all-${title}`} className="text-sm font-medium">
            {title}
          </label>
        </div>
        <span className="text-muted-foreground text-xs">
          {selected} / {items.length} selected
        </span>
      </div>
      <ScrollArea className="h-64">
        <ul className="divide-y">
          {items.length === 0 && (
            <li className="text-muted-foreground px-3 py-2 text-sm">
              Nothing matches.
            </li>
          )}
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-2 px-3 py-2">
              <Checkbox
                id={item.id}
                className="mt-0.5"
                checked={checked.has(item.id)}
                onCheckedChange={(v) => onToggle(item.id, v === true)}
              />
              <label htmlFor={item.id} className="flex-1 text-sm">
                {render(item)}
              </label>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
}

export function UsersCheckList(props: {
  items: BatchClosePreview["users"];
  checked: Set<string>;
  onToggle: (id: string, next: boolean) => void;
  onToggleAll: (next: boolean) => void;
}) {
  return (
    <CheckList
      title="Users to archive & lock out"
      {...props}
      render={(u) => (
        <>
          <span className="font-medium">{u.name ?? "—"}</span>{" "}
          <span className="text-muted-foreground">{u.email}</span>
          {u.team_names.length > 0 && (
            <span className="text-muted-foreground block text-xs">
              {u.team_names.join(", ")}
            </span>
          )}
        </>
      )}
    />
  );
}

export function TeamsCheckList(props: {
  items: BatchClosePreview["teams"];
  checked: Set<string>;
  onToggle: (id: string, next: boolean) => void;
  onToggleAll: (next: boolean) => void;
}) {
  return (
    <CheckList
      title="Products to archive"
      {...props}
      render={(t) => (
        <>
          <span className="font-medium">{t.name}</span>{" "}
          <span className="text-muted-foreground">
            {t.member_count} member{t.member_count === 1 ? "" : "s"}
          </span>
          {t.has_admin_member && (
            <Badge variant="destructive" className="ml-2">
              admin team
            </Badge>
          )}
          {t.member_names.length > 0 && (
            <span className="text-muted-foreground block text-xs">
              {t.member_names.join(", ")}
            </span>
          )}
        </>
      )}
    />
  );
}
