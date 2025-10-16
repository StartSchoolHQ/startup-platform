import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Medal, Zap, CreditCard } from "lucide-react";

interface AchievementCardProps {
  title: string;
  description: string;
  status: "in-progress" | "finished" | "not-started";
  points: number;
  xp: number;
}

export function AchievementCard({
  title,
  description,
  status,
  points,
  xp,
}: AchievementCardProps) {
  const getStatusConfig = (status: AchievementCardProps["status"]) => {
    switch (status) {
      case "in-progress":
        return {
          badgeText: "In Progress",
          badgeClass: "bg-accent/20 text-accent-foreground",
          cardClass: "border-border bg-accent/5",
          iconBg: "bg-muted",
        };
      case "finished":
        return {
          badgeText: "Finished",
          badgeClass: "bg-primary/10 text-primary",
          cardClass: "border-primary/20 bg-primary/5",
          iconBg: "bg-muted",
        };
      case "not-started":
        return {
          badgeText: "Not Started",
          badgeClass: "bg-muted text-muted-foreground",
          cardClass: "border-border bg-card",
          iconBg: "bg-muted",
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Card className={`${config.cardClass} transition-all hover:shadow-md p-0`}>
      <CardHeader className="pt-4 px-4">
        <div className="flex items-center justify-between">
          <Badge
            variant="secondary"
            className={`${config.badgeClass} px-3 py-1`}
          >
            {config.badgeText}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="flex items-center gap-2 align-middle mb-4">
          <Medal className="h-12 w-12 text-primary flex-shrink-0 bg-muted rounded-md p-2" />
          <div className="">
            <h3 className="font-semibold text-lg">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Points Box */}
          <div className="border border-border rounded-lg p-2 bg-background">
            <div className="flex items-center gap-2">
              <CreditCard className="h-8 w-8 text-primary flex-shrink-0 bg-muted rounded-md p-2" />
              <div className="min-w-0">
                <div className="font-semibold text-base text-foreground">
                  {points}
                </div>
                <div className="text-xs text-muted-foreground">Points</div>
              </div>
            </div>
          </div>

          {/* XP Box */}
          <div className="border border-border rounded-lg p-2 bg-background">
            <div className="flex items-center gap-2">
              <Zap className="h-8 w-8 text-primary flex-shrink-0 bg-muted rounded-md p-2" />
              <div className="min-w-0">
                <div className="font-semibold text-base text-foreground">
                  {xp}
                </div>
                <div className="text-xs text-muted-foreground">XP</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
