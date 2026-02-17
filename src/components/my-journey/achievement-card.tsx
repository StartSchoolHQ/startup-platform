import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Medal, Zap, CreditCard, ChevronRight } from "lucide-react";

interface AchievementCardProps {
  title: string;
  description: string;
  status: "in-progress" | "finished" | "not-started";
  points: number;
  xp: number;
  selected?: boolean;
  completedTasks?: number;
  totalTasks?: number;
}

export function AchievementCard({
  title,
  description,
  status,
  points,
  xp,
  selected = false,
  completedTasks,
  totalTasks,
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
      className={`${
        config.cardClass
      } flex h-full flex-col p-0 transition-all hover:-translate-y-1 hover:shadow-md ${
        selected ? "border-primary border-2" : ""
      }`}
    >
      <CardHeader className="flex-shrink-0 px-4 pt-4">
        <div className="flex items-center justify-between">
          <Badge
            variant="outline"
            className={`${config.badgeClass} border px-3 py-1`}
          >
            {config.badgeText}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col px-4 pb-4">
        <div className="mb-4 flex flex-1 items-start gap-2">
          <Medal className="bg-muted mt-1 h-12 w-12 flex-shrink-0 rounded-md p-2 text-black dark:text-white" />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <h3 className="text-lg leading-tight font-semibold">{title}</h3>
              <ChevronRight className="text-muted-foreground h-4 w-4 flex-shrink-0 opacity-60" />
            </div>
            <p className="text-muted-foreground line-clamp-2 text-sm">
              {description}
            </p>
          </div>
        </div>

        {totalTasks != null && totalTasks > 0 && (
          <div className="mb-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-muted-foreground text-xs">Progress</span>
              <span className="text-muted-foreground text-xs">
                {completedTasks ?? 0} / {totalTasks}
              </span>
            </div>
            <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.round(((completedTasks ?? 0) / totalTasks) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        <div className="mt-auto grid grid-cols-2 gap-2">
          {/* Points Box */}
          <div className="border-border bg-background rounded-lg border p-2">
            <div className="flex items-center gap-2">
              <CreditCard className="bg-muted h-8 w-8 flex-shrink-0 rounded-md p-2 text-black dark:text-white" />
              <div className="min-w-0">
                <div className="text-foreground text-base font-semibold">
                  {points}
                </div>
                <div className="text-muted-foreground text-xs">Points</div>
              </div>
            </div>
          </div>

          {/* XP Box */}
          <div className="border-border bg-background rounded-lg border p-2">
            <div className="flex items-center gap-2">
              <Zap className="bg-muted h-8 w-8 flex-shrink-0 rounded-md p-2 text-black dark:text-white" />
              <div className="min-w-0">
                <div className="text-foreground text-base font-semibold">
                  {xp}
                </div>
                <div className="text-muted-foreground text-xs">XP</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
