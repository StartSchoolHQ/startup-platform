"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { splitDismissed } from "@/lib/analytics/attention";
import { useAttention } from "@/components/admin/analytics/use-analytics";

/** Top five of the attention list, on the admin Overview. */
export function NeedsAttentionCard({ batchId }: { batchId: string | null }) {
  const { data, isLoading, isError } = useAttention(batchId);
  const open = splitDismissed(data ?? []).open.slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle>Needs attention</CardTitle>
          <CardDescription>
            Flagged by the attention rules, most urgent first.
          </CardDescription>
        </div>
        <Link
          href="/dashboard/admin/analytics"
          className="text-primary inline-flex items-center gap-1 text-sm hover:underline"
        >
          See all <ArrowRight className="size-3.5" />
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-24 w-full" />}
        {isError && (
          <p className="text-destructive text-sm">
            Couldn&apos;t load the list.
          </p>
        )}
        {!isLoading && !isError && open.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Nobody is flagged right now.
          </p>
        )}
        {open.length > 0 && (
          <ul className="divide-y">
            {open.map((r) => (
              <li
                key={r.user_id}
                className="flex flex-wrap items-center gap-2 py-2 text-sm"
              >
                <span className="font-medium">{r.name}</span>
                {r.reasons.slice(0, 2).map((reason) => (
                  <Badge
                    key={reason}
                    variant="secondary"
                    className="font-normal"
                  >
                    {reason}
                  </Badge>
                ))}
                {r.reasons.length > 2 && (
                  <span className="text-muted-foreground text-xs">
                    +{r.reasons.length - 2} more
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
