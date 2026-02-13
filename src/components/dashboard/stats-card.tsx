import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/types/dashboard";
import { useCountUp } from "@/hooks/use-count-up";

// Reusable card component for stats
export function StatsCardComponent({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
}: StatsCard) {
  // Parse numeric values for count-up animation
  const numericValue =
    typeof value === "string" ? parseInt(value.replace(/,/g, ""), 10) : 0;
  const isNumeric = !isNaN(numericValue);
  const animatedValue = useCountUp(isNumeric ? numericValue : 0, 1000);

  // Format the display value
  const displayValue = isNumeric ? animatedValue.toLocaleString() : value;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-bold">{title}</CardTitle>
        <Icon className={`h-8 w-8 ${iconColor}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{displayValue}</div>
        <p className="text-muted-foreground mt-1 text-xs">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
