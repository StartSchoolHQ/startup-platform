import {
  Award,
  CheckCircle2,
  DollarSign,
  Eye,
  Sparkles,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { economyFromActivityType, economyLabels } from "@/lib/economy-labels";

export interface TransactionRowData {
  id: string;
  type: string;
  activity_type: string;
  xp_change: number;
  points_change: number;
  description: string | null;
  created_at: string | null;
  team?: { name: string } | null;
  achievement?: { name: string } | null;
  revenue_stream?: { product_name: string } | null;
}

const TYPE_ICON: Record<string, LucideIcon> = {
  task: CheckCircle2,
  revenue: DollarSign,
  validation: Eye,
  team_cost: Users,
  achievement: Award,
};

function describe(t: TransactionRowData): string {
  if (t.description) return t.description;
  switch (t.type) {
    case "task":
      return "Task completed";
    case "revenue":
      return t.revenue_stream?.product_name
        ? `Revenue from ${t.revenue_stream.product_name}`
        : "Revenue earned";
    case "validation":
      return "Peer review reward";
    case "team_cost":
      return t.team?.name ? `Team cost for ${t.team.name}` : "Team cost";
    case "achievement":
      return t.achievement?.name
        ? `Achievement: ${t.achievement.name}`
        : "Achievement unlocked";
    default:
      return "Transaction";
  }
}

function Amount({ value, unit }: { value: number; unit: string }) {
  if (value === 0) return null;
  const positive = value > 0;
  return (
    <span
      className={cn(
        "text-sm font-semibold tabular-nums",
        positive
          ? "text-green-600 dark:text-green-400"
          : "text-red-600 dark:text-red-400"
      )}
    >
      {positive ? "+" : ""}
      {value.toLocaleString()}{" "}
      <span className="text-muted-foreground text-xs font-normal">{unit}</span>
    </span>
  );
}

export function TransactionRow({
  transaction,
}: {
  transaction: TransactionRowData;
}) {
  const Icon = TYPE_ICON[transaction.type] ?? Sparkles;
  const labels = economyLabels(
    economyFromActivityType(transaction.activity_type)
  );
  const negative = transaction.xp_change < 0 || transaction.points_change < 0;
  const when = transaction.created_at
    ? new Date(transaction.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <li className="flex items-center gap-4 px-4 py-3">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          negative ? "bg-red-500/10 text-red-600" : "bg-primary/10 text-primary"
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{describe(transaction)}</p>
        <p className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 text-xs">
          <span>{when}</span>
          <span className="capitalize">
            {transaction.type.replace("_", " ")}
          </span>
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5 sm:flex-row sm:items-center sm:gap-4">
        <Amount value={transaction.xp_change} unit={labels.xp} />
        <Amount value={transaction.points_change} unit={labels.points} />
      </div>
    </li>
  );
}
