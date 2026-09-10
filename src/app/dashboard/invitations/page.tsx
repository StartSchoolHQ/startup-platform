"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ReceivedInvitationRow,
  SentInvitationRow,
} from "@/components/invitations/invitation-row";
import { useAppContext } from "@/contexts/app-context";
import {
  invalidateInvitationCount,
  invalidateInvitationLists,
} from "@/hooks/use-invitation-count";
import {
  getPendingInvitations,
  getSentInvitations,
  respondToInvitation,
} from "@/lib/database";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Inbox, Send } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import posthog from "posthog-js";
import { toast } from "sonner";

function CountPill({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="bg-primary/10 text-primary rounded-full px-1.5 text-[10px] font-semibold tabular-nums">
      {count}
    </span>
  );
}

function EmptyState({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <div className="border-border/70 flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-12 text-center">
      <span className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-full">
        <Icon className="h-5 w-5" />
      </span>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-muted-foreground max-w-sm text-sm">{text}</p>
    </div>
  );
}

export default function InvitationsPage() {
  const { user } = useAppContext();
  const queryClient = useQueryClient();

  const { data: pendingInvitations = [], isPending: loadingPending } = useQuery(
    {
      queryKey: ["invitations", "pending", user?.id],
      queryFn: () => getPendingInvitations(user!.id),
      enabled: !!user?.id,
    }
  );

  const { data: sentInvitations = [], isPending: loadingSent } = useQuery({
    queryKey: ["invitations", "sent", user?.id],
    queryFn: () => getSentInvitations(user!.id),
    enabled: !!user?.id,
  });

  const loading = loadingPending || loadingSent;

  const respondMutation = useMutation({
    mutationFn: (vars: {
      invitationId: string;
      response: "accepted" | "declined";
      teamId?: string;
      teamName?: string;
    }) => respondToInvitation(vars.invitationId, user!.id, vars.response),
    retry: 0,
    onSuccess: (_, vars) => {
      posthog.capture(
        vars.response === "accepted"
          ? "invitation_accepted"
          : "invitation_declined",
        {
          invitation_id: vars.invitationId,
          team_id: vars.teamId,
          team_name: vars.teamName,
        }
      );
      toast.success(
        vars.response === "accepted"
          ? `You joined ${vars.teamName ?? "the team"}`
          : "Invitation declined"
      );
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      invalidateInvitationCount(queryClient, user?.id);
      invalidateInvitationLists(queryClient);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to respond to invitation"
      );
    },
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-9 w-56 rounded-md" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Invitations
        </h1>
        <p className="text-muted-foreground text-sm">
          Team invites you&apos;ve received and the ones you&apos;ve sent.
        </p>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="h-9">
          <TabsTrigger value="pending" className="gap-2 px-4">
            <Inbox className="h-3.5 w-3.5" />
            Received
            <CountPill count={pendingInvitations.length} />
          </TabsTrigger>
          <TabsTrigger value="sent" className="gap-2 px-4">
            <Send className="h-3.5 w-3.5" />
            Sent
            <CountPill count={sentInvitations.length} />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {pendingInvitations.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No invitations waiting"
              text="When a team invites you, it shows up here with accept and decline."
            />
          ) : (
            <Card className="gap-0 overflow-hidden py-0">
              <ul className="divide-y">
                {pendingInvitations.map((invitation) => (
                  <ReceivedInvitationRow
                    key={invitation.id}
                    inviter={invitation.invited_by}
                    teamName={invitation.teams.name}
                    memberCount={invitation.teams.member_count}
                    role={invitation.role}
                    createdAt={invitation.created_at}
                    busy={respondMutation.isPending}
                    onAccept={() =>
                      respondMutation.mutate({
                        invitationId: invitation.id,
                        response: "accepted",
                        teamId: invitation.team_id,
                        teamName: invitation.teams?.name,
                      })
                    }
                    onDecline={() =>
                      respondMutation.mutate({
                        invitationId: invitation.id,
                        response: "declined",
                        teamId: invitation.team_id,
                        teamName: invitation.teams?.name,
                      })
                    }
                  />
                ))}
              </ul>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sent" className="mt-4">
          {sentInvitations.length === 0 ? (
            <EmptyState
              icon={Send}
              title="Nothing sent yet"
              text="Invite people from your team page and track their answers here."
            />
          ) : (
            <Card className="gap-0 overflow-hidden py-0">
              <ul className="divide-y">
                {sentInvitations.map((invitation) => (
                  <SentInvitationRow
                    key={invitation.id}
                    invitee={invitation.invited_user}
                    teamName={invitation.teams.name}
                    role={invitation.role}
                    status={invitation.status}
                    createdAt={invitation.created_at}
                  />
                ))}
              </ul>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
