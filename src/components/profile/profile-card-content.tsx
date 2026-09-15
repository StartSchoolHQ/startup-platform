import { Users, Zap, type LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { economyLabels } from "@/lib/economy-labels";
import { FOUNDER_CARD_SECTIONS } from "@/lib/profile-card";
import type { ProfileCard } from "@/types/profile-card";

/** Founder answers as a question / answer grid. Quiet by design. */
export function ProfileCardBody({ card }: { card: ProfileCard }) {
  const founder = card.founder_card;

  if (!founder) {
    return (
      <p className="text-muted-foreground px-6 py-6 text-sm">
        This student hasn&apos;t filled in their founder card yet. It appears
        here once they complete profile setup.
      </p>
    );
  }

  return (
    <dl className="divide-border/70 divide-y px-6">
      {FOUNDER_CARD_SECTIONS.map((s) => (
        <div
          key={s.key}
          className="grid gap-1 py-4 sm:grid-cols-[9.5rem_1fr] sm:gap-6"
        >
          <dt className="text-muted-foreground text-sm">{s.label}</dt>
          <dd className="text-sm leading-relaxed whitespace-pre-line">
            {founder[s.key]}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="text-xl leading-none font-semibold tracking-tight tabular-nums">
        {value.toLocaleString()}
      </div>
      <div className="text-muted-foreground mt-1 text-xs">{label}</div>
    </div>
  );
}

function EconomyBlock({
  icon: Icon,
  title,
  xp,
  points,
  labels,
}: {
  icon: LucideIcon;
  title: string;
  xp: number;
  points: number;
  labels: { xp: string; points: string };
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="bg-background flex h-7 w-7 items-center justify-center rounded-full border">
          <Icon className="text-primary h-3.5 w-3.5" />
        </span>
        <span className="text-sm font-medium">{title}</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Metric value={xp} label={labels.xp} />
        <Metric value={points} label={labels.points} />
      </div>
    </div>
  );
}

/** Both economies, one block each. The leaderboard already ranked them. */
export function ProfileCardFooter({ card }: { card: ProfileCard }) {
  return (
    <div className="bg-muted/40 border-t px-6 py-5">
      <div className="grid gap-5 sm:grid-cols-2 sm:gap-8 sm:[&>*+*]:border-l sm:[&>*+*]:pl-8">
        <EconomyBlock
          icon={Zap}
          title="My Journey"
          xp={card.my_journey_xp}
          points={card.my_journey_credits}
          labels={economyLabels("my_journey")}
        />
        <EconomyBlock
          icon={Users}
          title="Team Journey"
          xp={card.team_xp}
          points={card.team_points}
          labels={economyLabels("team")}
        />
      </div>
    </div>
  );
}

export function ProfileCardSkeleton() {
  return (
    <div>
      <Skeleton className="h-24 rounded-none" />
      <div className="px-6">
        <Skeleton className="ring-background -mt-10 h-20 w-20 rounded-full ring-4" />
        <Skeleton className="mt-4 h-7 w-48" />
        <Skeleton className="mt-2 h-4 w-24" />
        <Skeleton className="mt-5 h-1.5 w-64 rounded-full" />
      </div>
      <div className="mt-6 space-y-4 px-6 pb-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[9.5rem_1fr]">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
