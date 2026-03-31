import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/types/dashboard";
import { useCountUp } from "@/hooks/use-count-up";

// Map icon color classes to progress bar background colors
const progressBarColorMap: Record<string, string> = {
  "text-amber-500": "bg-amber-500",
  "text-emerald-500": "bg-emerald-500",
  "text-purple-500": "bg-purple-500",
  "text-blue-500": "bg-blue-500",
};

// Reusable card component for stats
export function StatsCardComponent({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  href,
}: StatsCard) {
  // Parse fraction values like "3/12" for progress bar
  const fractionMatch =
    typeof value === "string" ? value.match(/^(\d+)\/(\d+)$/) : null;
  const completed = fractionMatch ? parseInt(fractionMatch[1], 10) : null;
  const total = fractionMatch ? parseInt(fractionMatch[2], 10) : null;
  const progressPercent =
    completed !== null && total !== null && total > 0
      ? Math.round((completed / total) * 100)
      : null;

  // Parse numeric values for count-up animation
  const numericValue =
    typeof value === "string" ? parseInt(value.replace(/,/g, ""), 10) : 0;
  const isNumeric = !isNaN(numericValue) && !fractionMatch;
  const animatedValue = useCountUp(isNumeric ? numericValue : 0, 1000);

  // Format the display value
  const displayValue = isNumeric ? animatedValue.toLocaleString() : value;

  const barColor = progressBarColorMap[iconColor] ?? "bg-primary";

  const card = (
    <Card
      className={`h-full ${
        href ? "cursor-pointer transition-shadow hover:shadow-md" : ""
      }`}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-bold">{title}</CardTitle>
        <Icon className={`h-8 w-8 ${iconColor}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{displayValue}</div>
        <p className="text-muted-foreground mt-1 text-xs">{subtitle}</p>
        {progressPercent !== null && (
          <div className="mt-3">
            <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
              <div
                className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-muted-foreground mt-1 text-right text-[10px]">
              {progressPercent}%
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {card}
      </Link>
    );
  }

  return card;
}
