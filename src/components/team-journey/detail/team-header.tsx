import { ExternalLink, Settings2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const ROLE_LABEL: Record<string, string> = {
  founder: "Founder",
  co_founder: "Co-founder",
  leader: "Leader",
  member: "Member",
};

export const MANAGER_ROLES = ["founder", "co_founder", "leader"];

/**
 * Team page header, the twin of MyJourneyHeader: logo, name, status and
 * role badges, description. Guests get a muted note instead of a banner;
 * the website link only shows when there is one.
 */
export function TeamHeader({
  name,
  description,
  logoUrl,
  website,
  status,
  isTeamMember,
  userRole,
  onManage,
}: {
  name: string;
  description: string | null;
  logoUrl: string | null;
  website: string | null;
  status: string | null;
  isTeamMember: boolean;
  userRole: string | null;
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
            <Badge variant="outline">{ROLE_LABEL[userRole] ?? userRole}</Badge>
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
