import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TaskPipelineRow } from "@/types/admin-stats";

const STATUS_ORDER: { key: string; label: string; bar: string }[] = [
  { key: "approved", label: "Approved", bar: "bg-emerald-500" },
  { key: "pending_review", label: "Pending review", bar: "bg-amber-500" },
  { key: "in_progress", label: "In progress", bar: "bg-primary" },
  { key: "not_started", label: "Not started", bar: "bg-muted-foreground/40" },
  { key: "rejected", label: "Rejected", bar: "bg-red-500" },
];

interface TaskPipelineCardProps {
  title: string;
  rows: TaskPipelineRow[];
  activityType: "individual" | "team";
}

/** Status breakdown of task assignments for one journey, as bars. */
export function TaskPipelineCard({
  title,
  rows,
  activityType,
}: TaskPipelineCardProps) {
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (r.activity_type !== activityType) continue;
    counts.set(r.status, (counts.get(r.status) ?? 0) + r.count);
  }
  const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-muted-foreground text-xs">
          {total.toLocaleString()} task assignments
        </p>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {total === 0 && (
          <p className="text-muted-foreground text-sm">No assignments yet.</p>
        )}
        {STATUS_ORDER.filter((s) => counts.has(s.key)).map((s) => {
          const n = counts.get(s.key) ?? 0;
          const pct = total ? Math.round((n / total) * 100) : 0;
          return (
            <div
              key={s.key}
              className="grid grid-cols-[7rem_1fr_5rem] items-center gap-3 text-sm"
            >
              <span className="text-muted-foreground">{s.label}</span>
              <div className="bg-muted h-2 overflow-hidden rounded-full">
                <div
                  className={`h-full ${s.bar}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-right tabular-nums">
                {n.toLocaleString()} · {pct}%
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
