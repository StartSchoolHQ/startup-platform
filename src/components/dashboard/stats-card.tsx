import Link from "next/link";
import { Card } from "@/components/ui/card";
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

  // Parse "1,234" or "1,234 Team XP": animate the number, keep the unit suffix
  const unitMatch =
    typeof value === "string" && !fractionMatch
      ? value.match(/^([\d,]+)(\s+.+)?$/)
      : null;
  const numericValue = unitMatch
    ? parseInt(unitMatch[1].replace(/,/g, ""), 10)
    : 0;
  const unitSuffix = unitMatch?.[2] ?? "";
  const isNumeric = unitMatch !== null && !isNaN(numericValue);
  const animatedValue = useCountUp(isNumeric ? numericValue : 0, 1000);

  // Format the display value
  const displayValue = isNumeric
    ? `${animatedValue.toLocaleString()}${unitSuffix}`
    : value;

  const barColor = progressBarColorMap[iconColor] ?? "bg-primary";

  const card = (
    <Card
      className={`h-full gap-0 py-0 transition-all ${
        href ? "hover:border-primary/40 cursor-pointer hover:shadow-md" : ""
      }`}
    >
      <div className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground text-sm font-medium">
            {title}
          </span>
          <span className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </span>
        </div>

        <div>
          <div className="text-3xl font-semibold tracking-tight tabular-nums">
            {displayValue}
          </div>
          <p className="text-muted-foreground mt-1 text-xs">{subtitle}</p>
        </div>

        {progressPercent !== null && (
          <div className="mt-auto flex items-center gap-3">
            <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
              <div
                className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-muted-foreground text-xs tabular-nums">
              {progressPercent}%
            </span>
          </div>
        )}
      </div>
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
