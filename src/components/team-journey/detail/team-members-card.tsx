import { Settings2, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionLabel } from "@/components/dashboard/my-journey/section-label";
import { economyLabels } from "@/lib/economy-labels";
import type { TeamDetailMember } from "@/hooks/use-team-detail";

const labels = economyLabels("team");

const ROLE_LABEL: Record<string, string> = {
  founder: "Founder",
  co_founder: "Co-founder",
  leader: "Leader",
  member: "Member",
};

const initials = (name: string | null | undefined) =>
  name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?";

/** Who is on the team, their role and what each has earned here. */
export function TeamMembersCard({
  members,
  canManage,
  onManage,
}: {
  members: TeamDetailMember[];
  canManage: boolean;
  onManage: () => void;
}) {
  return (
    <Card className="h-full gap-0 py-0">
      <div className="flex h-full flex-col gap-4 p-5">
        <SectionLabel
          icon={Users}
          title="Members"
          aside={
            canManage ? (
              <Button
                variant="ghost"
                size="sm"
                className="-my-1 h-7"
                onClick={onManage}
              >
                <Settings2 className="h-3.5 w-3.5" />
                Manage
              </Button>
            ) : (
              `${members.length} ${members.length === 1 ? "person" : "people"}`
            )
          }
        />
        <ul className="grid gap-2 sm:grid-cols-2">
          {members.map((m) => (
            <li
              key={m.user_id}
              className="bg-muted/40 flex items-center gap-3 rounded-lg px-3 py-2"
            >
              <Avatar className="h-9 w-9">
                <AvatarImage src={m.users?.avatar_url || ""} />
                <AvatarFallback className="bg-background text-xs font-semibold">
                  {initials(m.users?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">
                    {m.users?.name || "Unknown"}
                  </p>
                  <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                    {ROLE_LABEL[m.team_role ?? "member"] ?? m.team_role}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-xs tabular-nums">
                  {(m.users?.team_xp ?? 0).toLocaleString()} {labels.xp}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
