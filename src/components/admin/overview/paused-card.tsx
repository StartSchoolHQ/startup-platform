import Link from "next/link";
import { PauseCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** Overview body when both journeys are switched off. */
export function PausedCard() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <PauseCircle className="text-muted-foreground h-10 w-10" />
        <p className="font-medium">Both journeys are paused</p>
        <p className="text-muted-foreground max-w-sm text-sm">
          Nothing is being tracked for students right now. Turn a journey on to
          see its activity here.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/admin/settings">Open Settings</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
