"use client";

import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function LeaderboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Leaderboard error:", error);
  }, [error]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <p className="text-muted-foreground">
          Compete with others and track your progress
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <AlertTriangle className="text-muted-foreground h-10 w-10" />
          <div className="text-center">
            <p className="font-medium">Failed to load leaderboard data</p>
            <p className="text-muted-foreground mt-1 text-sm">
              This is usually temporary. Please try again.
            </p>
          </div>
          <Button variant="outline" onClick={reset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
