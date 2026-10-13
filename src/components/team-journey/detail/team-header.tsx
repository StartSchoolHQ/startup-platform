import { ExternalLink, Settings2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TeamDetailMember } from "@/hooks/use-team-detail";

const ROLE_LABEL: Record<string, string> = {
  founder: "Founder",
  co_founder: "Co-founder",
  leader: "Leader",
  member: "Member",
};

export const MANAGER_ROLES = ["founder", "co_founder", "leader"];

const initials = (name: string | null | undefined) =>
  name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?";

/**
 * Team page header, the twin of MyJourneyHeader: logo, name, status and
 * role badges, description, then the members as a row of chips (a click
 * opens the profile card). Guests get a muted note instead of a banner; the
 * website link only shows when there is one. The members used to be a card
 * of their own, which sat mostly empty for one- and two-person teams.
 */
export function TeamHeader({
  name,
  description,
  logoUrl,
  website,
  status,
  isTeamMember,
  userRole,
  members,
  onMemberClick,
  onManage,
}: {
  name: string;
  description: string | null;
  logoUrl: string | null;
  website: string | null;
  status: string | null;
  isTeamMember: boolean;
  userRole: string | null;
  members: TeamDetailMember[];
  onMemberClick: (userId: string) => void;
  onManage?: () => void;
}) {
  const href = website
    ? website.startsWith("http")
      ? website
      : `https://${website}`
    : null;
  const canManage =
    isTeamMember && !!userRole && MANAGER_ROLES.includes(userRole);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <Avatar className="h-10 w-10 shrink-0 rounded-lg">
              {logoUrl ? (
                <AvatarImage
                  src={logoUrl}
                  alt={name}
                  className="rounded-lg object-cover"
                />
              ) : null}
              <AvatarFallback className="bg-muted rounded-lg text-lg font-bold">
                {name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h1 className="text-3xl font-bold">{name}</h1>
            <Badge variant="secondary">
              {status === "active" ? "Team Journey" : "Archived"}
            </Badge>
            {isTeamMember && userRole && (
              <Badge variant="outline">
                {ROLE_LABEL[userRole] ?? userRole}
              </Badge>
            )}
            {!isTeamMember && <Badge variant="outline">View only</Badge>}
          </div>
          <p className="text-muted-foreground text-lg">
            {description || "No description yet"}
          </p>
          {!isTeamMember && (
            <p className="text-muted-foreground text-sm">
              You are looking at another team. Only its members can start tasks,
              log meetings or send the weekly report.
            </p>
          )}
        </div>

        {members.length > 0 && (
          <ul className="flex flex-wrap items-center gap-2">
            {members.map((m) => (
              <li key={m.user_id}>
                <button
                  type="button"
                  onClick={() => onMemberClick(m.user_id)}
                  className="bg-muted/40 hover:bg-muted focus-visible:ring-primary flex items-center gap-2 rounded-full py-1 pr-3 pl-1 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={m.users?.avatar_url || ""} />
                    <AvatarFallback className="bg-background text-[10px] font-semibold">
                      {initials(m.users?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">
                    {m.users?.name || "Unknown"}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {ROLE_LABEL[m.team_role ?? "member"] ?? m.team_role}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {href && (
          <Button variant="outline" asChild>
            <a href={href} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              Website
            </a>
          </Button>
        )}
        {canManage && onManage && (
          <Button variant="outline" onClick={onManage}>
            <Settings2 className="h-4 w-4" />
            Manage team
          </Button>
        )}
      </div>
    </div>
  );
}
