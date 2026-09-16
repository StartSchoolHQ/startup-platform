import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface RouteStopLink {
  label: string;
  href: string;
}

export interface RouteStopData {
  id: string;
  icon: LucideIcon;
  title: string;
  /** One or two short paragraphs. Each string is one paragraph. */
  body: ReactNode[];
  links?: RouteStopLink[];
  /** Not open yet in the programme — drawn muted, reached by a dashed track. */
  later?: boolean;
  /** Draw the stop inside a tinted card so it stands out from the route. */
  highlight?: boolean;
}

/**
 * One stop on the "How it works" route: a ring marker on a vertical track,
 * the stop's title and copy beside it. The track segment below the marker
 * belongs to this stop; it turns dashed when the next stop is still to come.
 */
export function RouteStop({
  stop,
  isLast,
  nextIsLater,
}: {
  stop: RouteStopData;
  isLast: boolean;
  nextIsLater: boolean;
}) {
  const Icon = stop.icon;

  return (
    <li className="relative grid grid-cols-[2.5rem_1fr] gap-x-5 sm:grid-cols-[3rem_1fr] sm:gap-x-6">
      {/* Track segment to the next stop */}
      {!isLast && (
        <span
          aria-hidden
          className={cn(
            "absolute top-10 bottom-0 left-5 -ml-px w-0 border-l-2 sm:left-6",
            nextIsLater || stop.later
              ? "border-border border-dashed"
              : "border-primary/40"
          )}
        />
      )}

      {/* Marker */}
      <span
        className={cn(
          "bg-card relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 sm:h-12 sm:w-12",
          stop.later
            ? "border-border text-muted-foreground border-dashed"
            : "border-primary/50 text-primary"
        )}
      >
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
      </span>

      {/* Content — a highlighted stop gets a tinted card and a filled button */}
      <div className={cn("pb-12 sm:pb-14", isLast && "pb-2")}>
        <div
          className={cn(
            stop.highlight &&
              "border-primary/30 bg-primary/5 rounded-xl border p-4 sm:p-5"
          )}
        >
          <h2
            className={cn(
              "text-lg leading-snug font-semibold tracking-tight sm:text-xl",
              !stop.highlight && "pt-2 sm:pt-3",
              stop.later && "text-muted-foreground"
            )}
          >
            {stop.title}
          </h2>
          <div className="mt-3 max-w-prose space-y-3">
            {stop.body.map((paragraph, index) => (
              <p
                key={index}
                className="text-muted-foreground text-sm leading-relaxed sm:text-[15px]"
              >
                {paragraph}
              </p>
            ))}
          </div>
          {stop.links && stop.links.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {stop.links.map((link) => (
                <Button
                  key={link.href}
                  asChild
                  variant={stop.highlight ? "default" : "outline"}
                  size="sm"
                >
                  <Link href={link.href}>{link.label}</Link>
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
