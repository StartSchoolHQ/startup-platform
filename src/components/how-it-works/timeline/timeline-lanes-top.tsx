import type { LucideIcon } from "lucide-react";
import { Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { CURRICULUM_MONTHS, HOLIDAY_BUFFER, PHASES } from "./timeline-data";
import { PHASE_BAR, PHASE_EDGE } from "./phase-colors";
import { formatRange, monthSpans, spanWidth, xOf } from "./timeline-scale";

/**
 * Lane label in the dashboard's section-label style: primary icon, muted
 * title, optional aside. One sticky block so it stays put while the board
 * scrolls sideways.
 */
export function LaneHeading({
  icon: Icon,
  title,
  aside,
}: {
  icon: LucideIcon;
  title: string;
  aside?: string;
}) {
  return (
    <div className="px-3 pt-4 pb-2">
      <div className="bg-card sticky left-3 flex w-max items-center gap-2 pr-2">
        <Icon className="text-primary h-4 w-4" />
        <span className="text-muted-foreground text-sm font-medium">
          {title}
        </span>
        {aside && (
          <span className="text-muted-foreground hidden text-xs sm:inline">
            {aside}
          </span>
        )}
      </div>
    </div>
  );
}

/** One cell per month with the curriculum goals and topic pills. */
export function CurriculumLane() {
  const spans = monthSpans();
  return (
    <div className="flex gap-1 px-3">
      {CURRICULUM_MONTHS.map((m) => {
        const span = spans.find(
          (s) => s.start.slice(5, 7) === `${m.month}`.padStart(2, "0")
        );
        if (!span) return null;
        return (
          <div
            key={m.month}
            className="bg-muted/40 flex shrink-0 flex-col gap-3 rounded-lg p-3"
            style={{ width: spanWidth(span.start, span.end) - 4 }}
          >
            <p className="text-sm font-semibold">{m.label}</p>
            <ul className="space-y-1.5">
              {m.goals.map((g) => (
                <li
                  key={g}
                  className="flex items-start gap-1.5 text-xs leading-snug font-medium"
                >
                  <Target className="text-primary mt-0.5 h-3 w-3 shrink-0" />
                  {g}
                </li>
              ))}
            </ul>
            <ul className="flex flex-wrap gap-1">
              {m.topics.map((t) => (
                <li
                  key={t}
                  className="bg-card text-muted-foreground rounded-full border px-2 py-0.5 text-[11px] leading-tight"
                >
                  {t}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

const PHASE_ROW_H = 38;
const GATE_ROW_H = 26;

/**
 * Four overlapping phase bars on two rows, the holiday buffer, and under
 * each phase start a label saying how the app really opens it. The gate
 * line drops from the previous phase's bar to its label so nothing covers
 * the bar text.
 */
export function PhaseLane() {
  const height = PHASE_ROW_H * 2 + GATE_ROW_H;
  return (
    <div className="relative mx-3" style={{ height }}>
      {PHASES.map((p, i) => (
        <div
          key={p.number}
          className={cn(
            "absolute flex h-8 items-center gap-2 overflow-hidden rounded-md border-l-4 px-3 text-xs whitespace-nowrap",
            PHASE_BAR[p.number],
            PHASE_EDGE[p.number]
          )}
          style={{
            top: (i % 2) * PHASE_ROW_H,
            left: xOf(p.start),
            width: spanWidth(p.start, p.end),
          }}
        >
          <span className="font-semibold">
            Phase {p.number}: {p.name}
          </span>
          <span className="opacity-75">
            {formatRange(p.start, p.end)}, {p.taskCount} tasks
          </span>
        </div>
      ))}
      {PHASES.filter((p) => p.opensAt).map((p) => {
        const prevRow = (p.number - 2) % 2;
        return (
          <div
            key={`gate-${p.number}`}
            className="border-muted-foreground/50 absolute border-l border-dashed"
            style={{
              top: prevRow * PHASE_ROW_H,
              bottom: 0,
              left: xOf(p.start),
            }}
          >
            <span className="bg-card text-muted-foreground absolute bottom-0 left-1.5 rounded-full border px-2 py-0.5 text-[11px] whitespace-nowrap">
              {p.opensAt}
            </span>
          </div>
        );
      })}
      <div
        className="text-muted-foreground absolute flex h-8 items-center rounded-md border border-dashed px-3 text-xs whitespace-nowrap"
        style={{
          top: 0,
          left: xOf(HOLIDAY_BUFFER.start),
          width: spanWidth(HOLIDAY_BUFFER.start, HOLIDAY_BUFFER.end),
        }}
      >
        {HOLIDAY_BUFFER.label},{" "}
        {formatRange(HOLIDAY_BUFFER.start, HOLIDAY_BUFFER.end)}
      </div>
    </div>
  );
}
