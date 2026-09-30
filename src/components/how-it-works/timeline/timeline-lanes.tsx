import { cn } from "@/lib/utils";
import { READINGS, RECURRING, TASKS } from "./timeline-data";
import { PHASE_EDGE, READING_EDGE, RECURRING_DOT } from "./phase-colors";
import {
  PX_PER_DAY,
  formatEffort,
  formatRange,
  packRows,
  spanWidth,
  xOf,
} from "./timeline-scale";

const TASK_MIN_DAYS = 8;
const TASK_ROW_H = 68;

/** Every dated task as a small card with its phase colour on the edge. */
export function TaskLane() {
  const rows = packRows(TASKS, TASK_MIN_DAYS);
  const rowCount = Math.max(...rows) + 1;
  return (
    <div className="relative mx-3" style={{ height: rowCount * TASK_ROW_H }}>
      {TASKS.map((task, i) => (
        <div
          key={`${task.phase}-${task.title}`}
          className={cn(
            "bg-card absolute flex h-[62px] flex-col justify-between rounded-md border border-l-[3px] px-2.5 py-1.5 shadow-xs",
            task.reading ? READING_EDGE : PHASE_EDGE[task.phase]
          )}
          style={{
            top: rows[i] * TASK_ROW_H,
            left: xOf(task.start),
            width:
              Math.max(
                spanWidth(task.start, task.end),
                TASK_MIN_DAYS * PX_PER_DAY
              ) - 4,
          }}
          title={`${task.title} (${formatRange(task.start, task.end)}, ${formatEffort(task.hours)})`}
        >
          <p className="line-clamp-2 text-[11.5px] leading-tight font-medium">
            {task.title}
          </p>
          <p className="text-muted-foreground flex gap-2 text-[10.5px] whitespace-nowrap tabular-nums">
            <span>{formatRange(task.start, task.end)}</span>
            <span>{formatEffort(task.hours)}</span>
          </p>
        </div>
      ))}
    </div>
  );
}

const READING_ROW_H = 30;
const READING_MIN_DAYS = 8;

export function ReadingLane() {
  const rows = packRows(READINGS, READING_MIN_DAYS);
  const rowCount = Math.max(...rows) + 1;
  return (
    <div className="relative mx-3" style={{ height: rowCount * READING_ROW_H }}>
      {READINGS.map((r, i) => (
        <div
          key={r.title}
          className={cn(
            "bg-card absolute flex h-7 items-center gap-2 overflow-hidden rounded-md border border-l-[3px] px-2.5 text-[11.5px] whitespace-nowrap shadow-xs",
            READING_EDGE
          )}
          style={{
            top: rows[i] * READING_ROW_H,
            left: xOf(r.start),
            width:
              Math.max(
                spanWidth(r.start, r.end),
                READING_MIN_DAYS * PX_PER_DAY
              ) - 4,
          }}
          title={`${r.title} (${formatRange(r.start, r.end)}, ${formatEffort(r.hours)})`}
        >
          <span className="font-medium">{r.title}</span>
          <span className="text-muted-foreground text-[10.5px] tabular-nums">
            {formatEffort(r.hours)}
          </span>
        </div>
      ))}
    </div>
  );
}

/** One row per recurring task, a dot on each planned date. */
export function RecurringLane() {
  return (
    <div className="mx-3 pb-4">
      {RECURRING.map((r) => (
        <div key={r.title} className="relative h-9 border-t border-dashed">
          <span className="bg-card sticky left-3 z-10 mt-2 inline-flex items-baseline gap-2 pr-2 text-[11.5px] font-medium">
            {r.title}
            <span className="text-muted-foreground text-[10.5px] font-normal">
              {r.cadence}, {formatEffort(r.hours)}
            </span>
          </span>
          {r.dates.map((d) => (
            <span
              key={d}
              className={cn(
                "ring-card absolute top-3 h-3 w-3 rounded-full ring-2",
                RECURRING_DOT
              )}
              style={{ left: xOf(d) + PX_PER_DAY / 2 - 6 }}
              title={formatRange(d, d)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
