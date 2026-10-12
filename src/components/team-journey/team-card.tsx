import Link from "next/link";
import { ArrowRight, ExternalLink, Users, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AvatarStack } from "@/components/team-journey/avatar-stack";
import { economyLabels } from "@/lib/economy-labels";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/team-journey";

const labels = economyLabels("team");

function Metric({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Users;
  value: string;
  label: string;
}) {
  return (
    <div className="bg-muted/40 flex items-center gap-2.5 rounded-lg px-3 py-2">
      <Icon className="text-primary h-4 w-4 shrink-0" />
      <div className="leading-tight">
        <p className="text-sm font-semibold tabular-nums">{value}</p>
        <p className="text-muted-foreground text-xs">{label}</p>
      </div>
    </div>
  );
}

/**
 * One team in the Team Journey list. The viewer's own team is ringed in the
 * primary colour; everything else sits on theme tokens like the My Journey
 * cards. Monthly revenue is no longer shown — it was $0 on every card.
 */
export function TeamCard({ team }: { team: Product }) {
  const website = team.website
    ? team.website.startsWith("http")
      ? team.website
      : `https://${team.website}`
    : null;

  return (
    <Card
      className={cn(
        "flex h-full flex-col gap-0 py-0 transition-shadow hover:shadow-md",
        team.isCurrentUserMember && "ring-primary/30 bg-primary/5 ring-2"
      )}
    >
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12 shrink-0 rounded-lg">
            {team.logoUrl ? (
              <AvatarImage
                src={team.logoUrl}
                alt={team.name}
                className="rounded-lg object-cover"
              />
            ) : null}
            <AvatarFallback className="bg-muted rounded-lg text-lg font-bold">
              {team.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="truncate text-lg leading-tight font-semibold">
                {team.name}
              </h3>
              {team.isCurrentUserMember ? (
                <Badge className="shrink-0">Your team</Badge>
              ) : (
                team.status !== "Active" && (
                  <Badge variant="secondary" className="shrink-0">
                    Archived
                  </Badge>
                )
              )}
            </div>
            <p className="text-muted-foreground line-clamp-2 min-h-10 text-sm leading-5">
              {team.description}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Metric
            icon={Users}
            value={String(team.customers.count)}
            label={team.customers.count === 1 ? "Member" : "Members"}
          />
          <Metric
            icon={Zap}
            value={team.points.amount.toLocaleString()}
            label={labels.xp}
          />
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
          <AvatarStack users={team.teamMembers} maxVisible={4} size="md" />
          <div className="flex items-center gap-1">
            {website && (
              <Button variant="ghost" size="icon-sm" asChild>
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${team.name} website`}
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
            <Button size="sm" variant="outline" className="group" asChild>
              <Link href={`/dashboard/team-journey/${team.id}`}>
                Open
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
