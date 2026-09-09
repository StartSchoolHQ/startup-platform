import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AiReviewAdminSummary } from "@/types/ai-review-admin";

interface AiReviewsSummaryProps {
  summary: AiReviewAdminSummary | null;
}

export function AiReviewsSummary({ summary }: AiReviewsSummaryProps) {
  if (!summary) return null;

  const stats: { label: string; value: string; alert?: boolean }[] = [
    { label: "Reviewed today", value: String(summary.today) },
    {
      label: "Approval rate",
      value: `${Math.round(summary.approval_rate * 100)}%`,
    },
    {
      label: "Failures",
      value: String(summary.failures),
      alert: summary.failures > 0,
    },
    { label: "Spend", value: `$${summary.cost_usd.toFixed(2)}` },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs font-medium">
              {stat.label}
            </p>
            <p
              className={cn(
                "mt-1 text-2xl font-bold",
                stat.alert && "text-red-600"
              )}
            >
              {stat.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
