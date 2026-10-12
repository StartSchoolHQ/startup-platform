import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamCard } from "@/components/team-journey/team-card";
import type { Product } from "@/types/team-journey";

function TeamCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-12 w-12 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-14 shrink-0 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-12 w-full rounded-lg" />
        <div className="flex items-center justify-between pt-2">
          <div className="flex -space-x-2">
            {Array.from({ length: 3 }).map((_, k) => (
              <Skeleton
                key={k}
                className="border-background h-8 w-8 rounded-full border-2"
              />
            ))}
          </div>
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

export function TeamGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <TeamCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * One tab of the Team Journey list: skeleton while loading, an empty state,
 * or the responsive grid of team cards.
 */
export function TeamGrid({
  teams,
  loading,
  empty,
}: {
  teams: Product[];
  loading: boolean;
  empty: {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: { label: string; onClick: () => void };
  };
}) {
  if (loading) return <TeamGridSkeleton />;
  if (teams.length === 0) return <EmptyState {...empty} />;
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {teams.map((team) => (
        <TeamCard key={team.id} team={team} />
      ))}
    </div>
  );
}
