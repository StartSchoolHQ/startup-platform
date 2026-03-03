"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { motion } from "framer-motion";
import { Inbox, Send } from "lucide-react";
import posthog from "posthog-js";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface Invitation {
  id: string;
  team_id: string;
  role: string;
  status: string;
  created_at: string;
  responded_at?: string | null;
  teams: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    member_count: number | null;
  };
  invited_by?: {
    id: string;
    name: string | null;
    email: string;
    avatar_url: string | null;
  };
  invited_user?: {
    id: string;
    name: string | null;
    email: string;
    avatar_url: string | null;
  };
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
          ? "Invitation accepted! You are now a team member."
          : "Invitation declined."
      );
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      invalidateInvitationCount(queryClient, user?.id);
      invalidateInvitationLists(queryClient);
    },
    onError: (error) => {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to respond to invitation";
      toast.error(errorMessage);
    },
  });

  // Invitation lists automatically refresh via React Query

  const handleResponse = (
    invitationId: string,
    response: "accepted" | "declined",
    teamId?: string,
    teamName?: string
  ) => {
    respondMutation.mutate({ invitationId, response, teamId, teamName });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="mt-2 h-4 w-80" />
        </div>
        <Skeleton className="h-10 w-64 rounded-md" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-4 py-4">
                <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-56" />
                  <div className="flex gap-1.5">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-18 rounded-md" />
                  <Skeleton className="h-8 w-18 rounded-md" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-3xl font-bold">Team Invitations</h1>
        <p className="text-muted-foreground">
          Manage your team invitations and membership requests
        </p>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-fit grid-cols-2">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Inbox className="h-4 w-4" />
              Received ({pendingInvitations.length})
            </TabsTrigger>
            <TabsTrigger value="sent" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Sent ({sentInvitations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6 space-y-4">
            {pendingInvitations.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Inbox className="text-muted-foreground mb-4 h-12 w-12" />
                  <h3 className="text-foreground mb-2 text-lg font-semibold">
                    No pending invitations
                  </h3>
                  <p className="text-muted-foreground text-center">
                    You don&apos;t have any pending team invitations at the
                    moment.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {pendingInvitations.map((invitation, index) => (
                  <motion.div
                    key={invitation.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Card>
                      <CardContent className="flex items-center gap-4 py-4">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarImage
                            src={invitation.invited_by?.avatar_url || undefined}
                            alt={invitation.invited_by?.name || undefined}
                          />
                          <AvatarFallback className="text-xs font-bold">
                            {invitation.invited_by?.name
                              ? invitation.invited_by.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                              : "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium">
                              {invitation.invited_by?.name || "Someone"} invited
                              you to{" "}
                              <span className="font-semibold">
                                {invitation.teams.name}
                              </span>
                            </p>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {invitation.role && (
                              <Badge variant="secondary" className="text-xs">
                                {invitation.role.replace("_", " ")}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {invitation.teams.member_count} members
                            </Badge>
                            <span className="text-muted-foreground text-xs">
                              {invitation.created_at
                                ? formatDate(invitation.created_at)
                                : ""}
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleResponse(
                                invitation.id,
                                "declined",
                                invitation.team_id,
                                invitation.teams?.name
                              )
                            }
                            disabled={respondMutation.isPending}
                          >
                            Decline
                          </Button>
                          <Button
                            size="sm"
                            onClick={() =>
                              handleResponse(
                                invitation.id,
                                "accepted",
                                invitation.team_id,
                                invitation.teams?.name
                              )
                            }
                            disabled={respondMutation.isPending}
                            className="bg-[#ff78c8] text-white hover:bg-[#ff60b8]"
                          >
                            Accept
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sent" className="mt-6 space-y-4">
            {sentInvitations.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Send className="text-muted-foreground mb-4 h-12 w-12" />
                  <h3 className="text-foreground mb-2 text-lg font-semibold">
                    No sent invitations
                  </h3>
                  <p className="text-muted-foreground text-center">
                    You haven&apos;t sent any team invitations yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {sentInvitations.map((invitation, index) => (
                  <motion.div
                    key={invitation.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Card>
                      <CardContent className="flex items-center gap-4 py-4">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarImage
                            src={
                              invitation.invited_user?.avatar_url || undefined
                            }
                            alt={invitation.invited_user?.name || undefined}
                          />
                          <AvatarFallback className="text-xs font-bold">
                            {invitation.invited_user?.name
                              ? invitation.invited_user.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                              : "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            Invited{" "}
                            <span className="font-semibold">
                              {invitation.invited_user?.name || "Unknown User"}
                            </span>{" "}
                            to{" "}
                            <span className="font-semibold">
                              {invitation.teams.name}
                            </span>
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {invitation.role && (
                              <Badge variant="secondary" className="text-xs">
                                {invitation.role.replace("_", " ")}
                              </Badge>
                            )}
                            {invitation.status && (
                              <Badge
                                variant={
                                  invitation.status === "accepted"
                                    ? "default"
                                    : invitation.status === "declined"
                                      ? "destructive"
                                      : "outline"
                                }
                                className="text-xs"
                              >
                                {invitation.status}
                              </Badge>
                            )}
                            <span className="text-muted-foreground text-xs">
                              {invitation.created_at
                                ? formatDate(invitation.created_at)
                                : ""}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
