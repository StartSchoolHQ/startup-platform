import { Skeleton } from "@/components/ui/skeleton";

export function LeaderboardSkeleton() {
  return (
    <div>
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="border-border grid min-w-[700px] items-center gap-4 border-b p-4"
          style={{
            gridTemplateColumns: "80px 200px 1fr 1fr 1fr 1fr 100px",
          }}
        >
          {/* Rank */}
          <Skeleton className="h-5 w-8" />

          {/* User */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div>
              <Skeleton className="mb-1 h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>

          {/* XP */}
          <div>
            <Skeleton className="mb-1 h-4 w-16" />
            <Skeleton className="h-3 w-10" />
          </div>

          {/* Tasks */}
          <Skeleton className="h-4 w-10" />

          {/* Reviews */}
          <Skeleton className="h-4 w-8" />

          {/* Streak */}
          <Skeleton className="h-6 w-16 rounded-full" />

          {/* Change */}
          <Skeleton className="mx-auto h-6 w-10 rounded-full" />
        </div>
      ))}
    </div>
  );
}
