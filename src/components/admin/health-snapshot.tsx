"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Minus,
  Rocket,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface HealthBuckets {
  active: number;
  slowing: number;
  at_risk: number;
  active_wow_delta: number;
  at_risk_wow_delta: number;
}

interface HealthSnapshotProps {
  students: HealthBuckets;
  teams: HealthBuckets;
}

type Tier = "active" | "slowing" | "at_risk";
type Scope = "students" | "teams";

const STUDENT_LABELS: Record<Tier, string> = {
  active: "Active",
  slowing: "Slowing",
  at_risk: "At Risk",
};

const TEAM_LABELS: Record<Tier, string> = {
  active: "Gaining XP",
  slowing: "Stalling",
  at_risk: "Dormant",
};

const TIER_DOT: Record<Tier, string> = {
  active: "bg-emerald-500",
  slowing: "bg-amber-500",
  at_risk: "bg-red-500",
};

const TIER_RANGE: Record<Tier, string> = {
  active: "last 7 days",
  slowing: "7–13 days",
  at_risk: "14+ days",
};

function Delta({ value, invert = false }: { value: number; invert?: boolean }) {
  if (value === 0) {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
        <Minus className="h-3 w-3" />0
      </span>
    );
  }

  // For "active" higher is better; for "at_risk" lower is better (invert=true flips color).
  const goodDirection = invert ? value < 0 : value > 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        goodDirection ? "text-emerald-600" : "text-red-500"
      )}
    >
      {value > 0 ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {value > 0 ? "+" : ""}
      {value}
    </span>
  );
}

function HealthCard({
  title,
  icon: Icon,
  scope,
  buckets,
  labels,
  unitSingular,
  unitPlural,
}: {
  title: string;
  icon: typeof Users;
  scope: Scope;
  buckets: HealthBuckets;
  labels: Record<Tier, string>;
  unitSingular: string;
  unitPlural: string;
}) {
  const router = useRouter();

  const go = (tier: Tier) => {
    router.push(`/dashboard/admin/progress?filter=${tier}&type=${scope}`);
  };

  const unit = (n: number) => (n === 1 ? unitSingular : unitPlural);

  const rows: Tier[] = ["active", "slowing", "at_risk"];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="text-muted-foreground h-4 w-4" />
          {title}
        </CardTitle>
        <button
          onClick={() => router.push(`/dashboard/admin/progress?type=${scope}`)}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs font-medium"
        >
          View all <ArrowRight className="h-3 w-3" />
        </button>
      </CardHeader>
      <CardContent className="space-y-1 pt-0">
        {rows.map((tier) => {
          const count = buckets[tier];
          return (
            <button
              key={tier}
              onClick={() => go(tier)}
              className="hover:bg-muted/60 group flex w-full items-center justify-between rounded-md px-2 py-2 text-left transition-colors"
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "inline-block h-2.5 w-2.5 rounded-full",
                    TIER_DOT[tier]
                  )}
                />
                <span className="text-sm font-medium">{labels[tier]}</span>
                <span className="text-muted-foreground text-xs">
                  {TIER_RANGE[tier]}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-base font-bold tabular-nums">
                  {count}
                </span>
                <span className="text-muted-foreground hidden text-xs sm:inline">
                  {unit(count)}
                </span>
                <ArrowRight className="text-muted-foreground/40 group-hover:text-foreground h-3.5 w-3.5 transition-colors" />
              </div>
            </button>
          );
        })}

        <div className="text-muted-foreground mt-2 flex items-center justify-between border-t pt-3 text-xs">
          <span>Week over week</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Active <Delta value={buckets.active_wow_delta} />
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
              At risk <Delta value={buckets.at_risk_wow_delta} invert />
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function HealthSnapshot({ students, teams }: HealthSnapshotProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <HealthCard
        title="Student Health"
        icon={Users}
        scope="students"
        buckets={students}
        labels={STUDENT_LABELS}
        unitSingular="student"
        unitPlural="students"
      />
      <HealthCard
        title="Team Health"
        icon={Rocket}
        scope="teams"
        buckets={teams}
        labels={TEAM_LABELS}
        unitSingular="team"
        unitPlural="teams"
      />
    </div>
  );
}
