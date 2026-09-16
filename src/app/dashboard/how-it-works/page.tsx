"use client";

import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlatformSettings } from "@/hooks/use-platform-settings";
import { RouteStop } from "@/components/how-it-works/route-stop";
import { buildRouteStops } from "@/components/how-it-works/route-stops";

/**
 * A quick guide to the platform, told as one route in programme order:
 * My Journey, the weekly report, the leaderboard, feedback. Static copy,
 * phase-aware through the cached journey settings; nothing here queries the
 * database on its own.
 */
export default function HowItWorksPage() {
  const { data: journeys, isLoading } = usePlatformSettings();
  const stops = useMemo(() => buildRouteStops(journeys), [journeys]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-10 pb-8 sm:space-y-14">
      <header className="space-y-3">
        <h1 className="max-w-2xl text-3xl leading-[1.1] font-semibold tracking-tight sm:text-4xl">
          Welcome to Startup Module Platform!
        </h1>
        <p className="text-muted-foreground max-w-prose text-base leading-relaxed">
          This platform is designed to support you throughout the entire
          programme. We&apos;ll begin with My Journey, focusing on developing
          your individual skills and expanding your technical and
          business-related knowledge.
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-10">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[3rem_1fr] gap-x-6">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-3 pt-3">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ol className="flex flex-col">
          {stops.map((stop, index) => (
            <RouteStop
              key={stop.id}
              stop={stop}
              isLast={index === stops.length - 1}
              nextIsLater={stops[index + 1]?.later === true}
            />
          ))}
        </ol>
      )}
    </div>
  );
}
