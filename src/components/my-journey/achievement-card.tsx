import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Medal, Zap, CreditCard } from "lucide-react";

interface AchievementCardProps {
  title: string;
  description: string;
  status: "in-progress" | "finished" | "not-started";
  points: number;
  xp: number;
  selected?: boolean;
}

export function AchievementCard({
  title,
  description,
  status,
  points,
  xp,
  selected = false,
}: AchievementCardProps) {
  const getStatusConfig = (status: AchievementCardProps["status"]) => {
    switch (status) {
      case "in-progress":
        return {
          badgeText: "In Progress",
          badgeClass: "bg-orange-100 text-orange-700 border-orange-200",
          cardClass: "border-border bg-card",
          iconBg: "bg-muted",
        };
      case "finished":
        return {
          badgeText: "Finished",
          badgeClass: "bg-green-100 text-green-700 border-green-200",
          cardClass: "border-green-200 bg-green-50/50",
          iconBg: "bg-muted",
        };
      case "not-started":
        return {
          badgeText: "Not Started",
          badgeClass: "bg-gray-100 text-gray-600 border-gray-200",
          cardClass: "border-border bg-card",
          iconBg: "bg-muted",
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Card
      className={`${config.cardClass} transition-all hover:shadow-md p-0 ${
        selected ? "border-2 border-primary" : ""
      }`}
    >
      <CardHeader className="pt-4 px-4">
        <div className="flex items-center justify-between">
          <Badge
            variant="outline"
            className={`${config.badgeClass} px-3 py-1 border`}
          >
            {config.badgeText}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="flex items-center gap-2 align-middle mb-4">
          <Medal className="h-12 w-12 text-black dark:text-white flex-shrink-0 bg-muted rounded-md p-2" />
          <div className="">
            <h3 className="font-semibold text-lg">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Points Box */}
          <div className="border border-border rounded-lg p-2 bg-background">
            <div className="flex items-center gap-2">
              <CreditCard className="h-8 w-8 text-black dark:text-white flex-shrink-0 bg-muted rounded-md p-2" />
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
              <Zap className="h-8 w-8 text-black dark:text-white flex-shrink-0 bg-muted rounded-md p-2" />
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
