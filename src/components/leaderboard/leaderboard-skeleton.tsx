import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function LeaderboardSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <Card key={index} className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              {/* Rank */}
              <div className="h-8 w-8 flex-shrink-0">
                <Skeleton className="h-full w-full rounded-full" />
              </div>

              {/* Avatar */}
              <div className="flex-shrink-0">
                <Skeleton className="h-10 w-10 rounded-full" />
              </div>

              {/* User Info */}
              <div className="min-w-0 flex-1">
                <Skeleton className="mb-1 h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>

              {/* Stats Grid */}
              <div className="hidden md:grid md:grid-cols-4 md:gap-8 md:text-center">
                <div>
                  <Skeleton className="mx-auto mb-1 h-4 w-12" />
                  <Skeleton className="mx-auto h-3 w-6" />
                </div>
                <div>
                  <Skeleton className="mx-auto mb-1 h-4 w-12" />
                  <Skeleton className="mx-auto h-3 w-6" />
                </div>
                <div>
                  <Skeleton className="mx-auto mb-1 h-4 w-8" />
                  <Skeleton className="mx-auto h-3 w-4" />
                </div>
                <div>
                  <Skeleton className="mx-auto mb-1 h-4 w-10" />
                  <Skeleton className="mx-auto h-3 w-6" />
                </div>
              </div>

              {/* Streak */}
              <div className="flex-shrink-0">
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>

              {/* Change */}
              <div className="w-8 flex-shrink-0">
                <Skeleton className="mx-auto h-6 w-6 rounded" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
