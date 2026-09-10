"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Person {
  name: string | null;
  avatar_url: string | null;
}

function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const STATUS_CLASS: Record<string, string> = {
  accepted: "bg-green-500/10 text-green-700 dark:text-green-400",
  declined: "bg-red-500/10 text-red-700 dark:text-red-400",
  pending: "bg-muted text-muted-foreground",
};

function Meta({
  role,
  extra,
  date,
}: {
  role?: string | null;
  extra?: React.ReactNode;
  date?: string | null;
}) {
  return (
    <p className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 text-xs">
      {role && <span className="capitalize">{role.replace("_", " ")}</span>}
      {extra}
      {date && <span>{formatDate(date)}</span>}
    </p>
  );
}

/** An invitation you received: who invited you, to which team, accept/decline. */
export function ReceivedInvitationRow({
  inviter,
  teamName,
  memberCount,
  role,
  createdAt,
  busy,
  onAccept,
  onDecline,
}: {
  inviter?: Person | null;
  teamName: string;
  memberCount: number | null;
  role?: string | null;
  createdAt?: string | null;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <li className="flex flex-wrap items-center gap-4 px-4 py-3 sm:flex-nowrap">
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage
          src={inviter?.avatar_url || undefined}
          alt={inviter?.name || undefined}
        />
        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
          {initials(inviter?.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">
          <span className="font-medium">{inviter?.name || "Someone"}</span>{" "}
          invited you to <span className="font-semibold">{teamName}</span>
        </p>
        <Meta
          role={role}
          extra={
            memberCount != null && (
              <span>
                {memberCount} {memberCount === 1 ? "member" : "members"}
              </span>
            )
          }
          date={createdAt}
        />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="outline" size="sm" onClick={onDecline} disabled={busy}>
          Decline
        </Button>
        <Button size="sm" onClick={onAccept} disabled={busy}>
          Accept
        </Button>
      </div>
    </li>
  );
}

/** An invitation you sent: who, which team, and where it stands. */
export function SentInvitationRow({
  invitee,
  teamName,
  role,
  status,
  createdAt,
}: {
  invitee?: Person | null;
  teamName: string;
  role?: string | null;
  status?: string | null;
  createdAt?: string | null;
}) {
  return (
    <li className="flex items-center gap-4 px-4 py-3">
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage
          src={invitee?.avatar_url || undefined}
          alt={invitee?.name || undefined}
        />
        <AvatarFallback className="bg-muted text-xs font-semibold">
          {initials(invitee?.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">
          Invited{" "}
          <span className="font-medium">{invitee?.name || "Unknown user"}</span>{" "}
          to <span className="font-semibold">{teamName}</span>
        </p>
        <Meta role={role} date={createdAt} />
      </div>
      {status && (
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
            STATUS_CLASS[status] ?? STATUS_CLASS.pending
          )}
        >
          {status}
        </span>
      )}
    </li>
  );
}
