"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";

interface Stats {
  messages_today: number;
  cost_month_usd: number;
  cache_hit_rate: number | null;
  cache_write_tokens: number | null;
  avg_output_tokens: number | null;
  threads_total: number;
  flagged_total: number;
}

export const STARTIE_STATS_KEY = ["admin", "assistant", "stats"];

export function StartieStatsStrip() {
  const { data, isLoading, isError } = useQuery({
    queryKey: STARTIE_STATS_KEY,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<Stats | null> => {
      const { data, error } = await createClient().rpc(
        "get_assistant_admin_stats_v1"
      );
      if (error) throw new Error(error.message);
      return (data as unknown as Stats | null) ?? null;
    },
  });

  if (isError) {
    return (
      <p className="text-destructive text-sm">
        Couldn&apos;t load Startie stats. Refresh the page.
      </p>
    );
  }

  const tiles: { label: string; value: string }[] = data
    ? [
        { label: "Messages today", value: String(data.messages_today) },
        {
          label: "Cost this month",
          value: `$${Number(data.cost_month_usd).toFixed(2)}`,
        },
        {
          label: "Cache hit rate",
          value:
            data.cache_hit_rate === null
              ? "—"
              : `${Math.round(Number(data.cache_hit_rate) * 100)}%`,
        },
        {
          label: "Cache writes (tokens)",
          value:
            data.cache_write_tokens === null
              ? "—"
              : Number(data.cache_write_tokens).toLocaleString("en-GB"),
        },
        {
          label: "Avg reply tokens",
          value:
            data.avg_output_tokens === null
              ? "—"
              : String(Math.round(Number(data.avg_output_tokens))),
        },
      ]
    : [];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {isLoading
        ? Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))
        : tiles.map((t) => (
            <Card key={t.label}>
              <CardContent className="p-4">
                <p className="text-muted-foreground text-xs">{t.label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {t.value}
                </p>
              </CardContent>
            </Card>
          ))}
    </div>
  );
}
