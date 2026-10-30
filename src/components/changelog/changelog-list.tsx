import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  groupChangelogByMonth,
  type ChangelogArea,
  type ChangelogEntry,
} from "@/lib/changelog";

const DAY = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const AREA_CLASS: Record<ChangelogArea, string> = {
  "My Journey": "border-primary/30 bg-primary/10 text-primary",
  Reviewer: "border-violet-500/30 bg-violet-500/10 text-violet-700",
  Startie: "border-sky-500/30 bg-sky-500/10 text-sky-700",
  Reports: "border-amber-500/30 bg-amber-500/10 text-amber-700",
  Account: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
  Platform: "border-border bg-muted text-muted-foreground",
};

function Entry({ entry }: { entry: ChangelogEntry }) {
  return (
    <article className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Badge variant="outline" className={AREA_CLASS[entry.area]}>
          {entry.area}
        </Badge>
        <time
          dateTime={entry.date}
          className="text-muted-foreground text-xs tabular-nums"
        >
          {DAY.format(new Date(`${entry.date}T00:00:00Z`))}
        </time>
      </div>
      <h3 className="text-lg leading-snug font-semibold tracking-tight">
        {entry.title}
      </h3>
      <p className="text-muted-foreground max-w-prose text-sm leading-relaxed">
        {entry.summary}
      </p>
      <div className="border-primary/40 bg-muted/40 max-w-prose rounded-r-md border-l-2 py-2.5 pr-4 pl-4">
        <p className="text-foreground/80 text-xs font-medium">
          What this means for you
        </p>
        <p className="mt-1 text-sm leading-relaxed">{entry.impact}</p>
        {entry.link && (
          <Button asChild variant="link" size="sm" className="h-auto px-0 pt-2">
            <Link href={entry.link.href}>{entry.link.label}</Link>
          </Button>
        )}
      </div>
    </article>
  );
}

/**
 * The changelog as a reading column grouped by month: the month sits in a
 * quiet label to the left on wide screens and above the entries on small
 * ones, so the page scans by month without any extra chrome.
 */
export function ChangelogList() {
  const months = groupChangelogByMonth();
  return (
    <div className="space-y-12">
      {months.map((month) => (
        <section
          key={month.label}
          className="grid gap-y-5 sm:grid-cols-[8.5rem_1fr] sm:gap-x-8"
        >
          <h2 className="text-muted-foreground text-sm font-medium sm:pt-1 sm:text-right">
            {month.label}
          </h2>
          <div className="divide-border/70 space-y-8 divide-y [&>article:not(:first-child)]:pt-8">
            {month.entries.map((entry) => (
              <Entry key={`${entry.date}-${entry.title}`} entry={entry} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
