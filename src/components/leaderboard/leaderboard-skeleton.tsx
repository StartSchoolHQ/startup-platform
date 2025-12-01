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
              <div className="flex-shrink-0 w-8 h-8">
                <Skeleton className="w-full h-full rounded-full" />
              </div>

              {/* Avatar */}
              <div className="flex-shrink-0">
                <Skeleton className="w-10 h-10 rounded-full" />
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>

              {/* Stats Grid */}
              <div className="hidden md:grid md:grid-cols-4 md:gap-8 md:text-center">
                <div>
                  <Skeleton className="h-4 w-12 mx-auto mb-1" />
                  <Skeleton className="h-3 w-6 mx-auto" />
                </div>
                <div>
                  <Skeleton className="h-4 w-12 mx-auto mb-1" />
                  <Skeleton className="h-3 w-6 mx-auto" />
                </div>
                <div>
                  <Skeleton className="h-4 w-8 mx-auto mb-1" />
                  <Skeleton className="h-3 w-4 mx-auto" />
                </div>
                <div>
                  <Skeleton className="h-4 w-10 mx-auto mb-1" />
                  <Skeleton className="h-3 w-6 mx-auto" />
                </div>
              </div>

              {/* Streak */}
              <div className="flex-shrink-0">
                <Skeleton className="w-16 h-6 rounded-full" />
              </div>

              {/* Change */}
              <div className="flex-shrink-0 w-8">
                <Skeleton className="w-6 h-6 mx-auto rounded" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}