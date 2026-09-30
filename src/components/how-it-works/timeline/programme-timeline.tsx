"use client";

import { useEffect, useRef } from "react";
import {
  BookOpen,
  GraduationCap,
  ListChecks,
  Milestone,
  Repeat,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PHASE_DOT, READING_DOT, RECURRING_DOT } from "./phase-colors";
import { PHASES } from "./timeline-data";
import { ReadingLane, RecurringLane, TaskLane } from "./timeline-lanes";
import { CurriculumLane, LaneHeading, PhaseLane } from "./timeline-lanes-top";
import {
  RANGE_END,
  RANGE_START,
  boardWidth,
  dayIndex,
  monthSpans,
  spanWidth,
  weekStarts,
  xOf,
} from "./timeline-scale";

const PAD = 12;

/** Month names on top, the Monday of each week underneath. Sticky. */
function Ruler() {
  return (
    <div className="bg-card sticky top-0 z-20 border-b" style={{ height: 52 }}>
      {monthSpans().map((m, i) => (
        <div
          key={m.label}
          className={cn(
            "absolute top-0 flex h-7 items-center pl-2 text-sm font-semibold",
            i > 0 && "border-l"
          )}
          style={{ left: PAD + xOf(m.start), width: spanWidth(m.start, m.end) }}
        >
          {/* Sticks inside its own month while that month is in view. */}
          <span className="sticky left-3">{m.label}</span>
        </div>
      ))}
      {weekStarts().map((w) => (
        <div
          key={w}
          className="text-muted-foreground absolute top-7 h-6 border-l pl-1 text-[11px] leading-6 tabular-nums"
          style={{ left: PAD + xOf(w) }}
        >
          {Number(w.slice(8, 10))}{" "}
          {new Date(w).toLocaleString("en-GB", {
            month: "short",
            timeZone: "UTC",
          })}
        </div>
      ))}
    </div>
  );
}

/** Week lines behind every lane, month starts drawn stronger. */
function Grid() {
  const monthStarts = new Set(monthSpans().map((m) => m.start));
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {weekStarts().map((w) => (
        <span
          key={w}
          className="border-border/60 absolute top-0 bottom-0 border-l"
          style={{ left: PAD + xOf(w) }}
        />
      ))}
      {[...monthStarts].map((m) => (
        <span
          key={m}
          className="border-border absolute top-0 bottom-0 border-l"
          style={{ left: PAD + xOf(m) }}
        />
      ))}
    </div>
  );
}

function Legend() {
  const items = [
    ...PHASES.map((p) => [PHASE_DOT[p.number], `Phase ${p.number}`] as const),
    [READING_DOT, "Reading"] as const,
    [RECURRING_DOT, "Recurring"] as const,
  ];
  return (
    <ul className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {items.map(([dot, label]) => (
        <li key={label} className="flex items-center gap-1.5">
          <span className={cn("inline-block h-2.5 w-2.5 rounded-full", dot)} />
          {label}
        </li>
      ))}
    </ul>
  );
}

/**
 * The programme on one day scale, Sep–Dec: curriculum months on top, then
 * the My Journey phases, every planned task, the readings and the recurring
 * rhythm. Static content from `timeline-data.ts`; the only live thing is
 * the today line, and the board scrolls itself so today sits a third of
 * the way in.
 */
export function ProgrammeTimeline({ today }: { today: string }) {
  const showToday =
    dayIndex(today) >= dayIndex(RANGE_START) &&
    dayIndex(today) <= dayIndex(RANGE_END);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (!el || !showToday) return;
    el.scrollLeft = Math.max(0, PAD + xOf(today) - el.clientWidth / 3);
  }, [today, showToday]);

  return (
    <div className="space-y-3">
      <Legend />
      <div
        ref={scroller}
        className="bg-card overflow-x-auto rounded-xl border shadow-sm"
      >
        <div className="relative" style={{ width: boardWidth() + PAD * 2 }}>
          <Ruler />
          <div className="relative">
            <Grid />
            {showToday && (
              <div
                className="bg-primary pointer-events-none absolute top-0 bottom-0 z-10 w-0.5"
                style={{ left: PAD + xOf(today) }}
              >
                <span className="bg-primary text-primary-foreground absolute top-2 left-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap">
                  Today
                </span>
              </div>
            )}

            <LaneHeading
              icon={GraduationCap}
              title="Startup Module"
              aside="Curriculum topics, month by month"
            />
            <CurriculumLane />

            <div className="mx-3 mt-4 border-t" />

            <LaneHeading
              icon={Milestone}
              title="My Journey phases"
              aside="Planned windows. Phases open by progress, not by date. About 45 min a day."
            />
            <PhaseLane />

            <LaneHeading
              icon={ListChecks}
              title="Tasks"
              aside="Planned days and effort per task"
            />
            <TaskLane />

            <LaneHeading
              icon={BookOpen}
              title="Reading"
              aside="The Mom Test and Mindset count toward Phase 1"
            />
            <ReadingLane />

            <LaneHeading
              icon={Repeat}
              title="Recurring"
              aside="Comes back after its cooldown"
            />
            <RecurringLane />
          </div>
        </div>
      </div>
    </div>
  );
}
