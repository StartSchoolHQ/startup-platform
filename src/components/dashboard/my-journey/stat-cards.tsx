import { CheckCircle, Target, Trophy, Zap } from "lucide-react";
import { StatsCardComponent } from "@/components/dashboard/stats-card";
import { statsGridColumnsClass } from "@/components/ui/stats-grid-skeleton";
import { economyLabels } from "@/lib/economy-labels";
import { MyJourneyOverview, StatsCard } from "@/types/dashboard";

const labels = economyLabels("my_journey");

/**
 * Headline numbers for the solo economy. The rank card only earns its place
 * once there is a field to be ranked in — under three students a "#1 of 2"
 * says nothing, so the row drops to three cards and the grid follows.
 */
export function MyJourneyStatCards({ data }: { data: MyJourneyOverview }) {
  const showRank = data.rank.total >= 3 && data.rank.position !== null;
  const balances = data.balances;

  const cards: StatsCard[] = [
    {
      id: "onborda-my-journey-balance",
      title: labels.xp,
      value: balances.my_journey_xp.toLocaleString(),
      subtitle: `${balances.my_journey_credits.toLocaleString()} ${labels.points}`,
      icon: Zap,
      iconColor: "text-amber-500",
      href: "/dashboard/my-journey",
    },
    {
      title: "Tasks completed",
      value: `${data.tasks.completed}/${data.tasks.total}`,
      subtitle: "Solo tasks you have finished",
      icon: CheckCircle,
      iconColor: "text-blue-500",
      href: "/dashboard/my-journey",
    },
    {
      title: "Achievements",
      value: `${data.achievements.completed}/${data.achievements.total}`,
      subtitle: "Unlocked so far",
      icon: Target,
      iconColor: "text-purple-500",
      href: "/dashboard/my-journey",
    },
  ];

  if (showRank) {
    cards.push({
      title: "Your rank",
      value: `#${data.rank.position}`,
      subtitle: `of ${data.rank.total} students`,
      icon: Trophy,
      iconColor: "text-emerald-500",
      href: "/dashboard/leaderboard",
    });
  }

  return (
    <div className={`grid gap-4 ${statsGridColumnsClass(cards.length)}`}>
      {cards.map((card) => (
        <div key={card.title} id={card.id}>
          <StatsCardComponent
            title={card.title}
            value={card.value}
            subtitle={card.subtitle}
            icon={card.icon}
            iconColor={card.iconColor}
            href={card.href}
          />
        </div>
      ))}
    </div>
  );
}
