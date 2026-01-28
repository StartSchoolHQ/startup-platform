"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Users,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  Inbox,
} from "lucide-react";
import { useEffect } from "react";
import { useAppContext } from "@/contexts/app-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPendingInvitations,
  getSentInvitations,
  respondToInvitation,
} from "@/lib/database";
import {
  invalidateInvitationCount,
  invalidateInvitationLists,
} from "@/hooks/use-invitation-count";
import { toast } from "sonner";

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
    }) => respondToInvitation(vars.invitationId, user!.id, vars.response),
    onSuccess: (_, vars) => {
      toast.success(
        vars.response === "accepted"
          ? "Invitation accepted! You are now a team member."
          : "Invitation declined."
      );
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      invalidateInvitationCount(queryClient, user?.id);
      invalidateInvitationLists(queryClient);
    },
    onError: () => {
      toast.error("Failed to respond to invitation");
    },
  });

  // Invitation lists automatically refresh via React Query

  const handleResponse = (
    invitationId: string,
    response: "accepted" | "declined"
  ) => {
    respondMutation.mutate({ invitationId, response });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getRoleColor = (role: string | null) => {
    if (!role) return "bg-green-100 text-green-800";
    switch (role) {
      case "founder":
        return "bg-purple-100 text-purple-800";
      case "co_founder":
        return "bg-purple-100 text-purple-800";
      case "leader":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-green-100 text-green-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "bg-green-100 text-green-800";
      case "declined":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Invitations</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading invitations...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <span className="font-medium">Invitations</span>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Invitations</h1>
          <p className="text-muted-foreground">
            Manage your team invitations and membership requests
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-500" />
            <span className="text-sm text-muted-foreground">
              {pendingInvitations.length} pending
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
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

        <TabsContent value="pending" className="space-y-4 mt-6">
          {pendingInvitations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Inbox className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  No pending invitations
                </h3>
                <p className="text-gray-500 text-center">
                  You don&apos;t have any pending team invitations at the
                  moment.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pendingInvitations.map((invitation) => (
                <Card key={invitation.id} className="overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-100">
                          <Users className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="space-y-1">
                          <CardTitle className="text-lg">
                            {invitation.teams.name}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {invitation.teams.description ||
                              "No description provided"}
                          </p>
                          <div className="flex items-center gap-2 pt-1">
                            {invitation.role && (
                              <Badge className={getRoleColor(invitation.role)}>
                                {invitation.role
                                  .replace("_", " ")
                                  .toUpperCase()}
                              </Badge>
                            )}
                            <Badge variant="outline">
                              {invitation.teams.member_count} members
                            </Badge>
                            <Badge
                              variant={
                                invitation.teams.status === "active"
                                  ? "default"
                                  : "secondary"
                              }
                              className={
                                invitation.teams.status === "active"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }
                            >
                              {invitation.teams.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">
                          {invitation.created_at
                            ? formatDate(invitation.created_at)
                            : "N/A"}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage
                            src={invitation.invited_by?.avatar_url || undefined}
                            alt={invitation.invited_by?.name || undefined}
                          />
                          <AvatarFallback className="bg-gradient-to-r from-purple-400 to-pink-400 text-white font-bold text-xs">
                            {invitation.invited_by?.name
                              ? invitation.invited_by.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                              : "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium">
                            Invited by{" "}
                            {invitation.invited_by?.name || "Unknown User"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {invitation.invited_by?.email}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleResponse(invitation.id, "declined")
                          }
                          disabled={respondMutation.isPending}
                          className="gap-1"
                        >
                          <XCircle className="h-3 w-3" />
                          Decline
                        </Button>
                        <Button
                          size="sm"
                          onClick={() =>
                            handleResponse(invitation.id, "accepted")
                          }
                          disabled={respondMutation.isPending}
                          className="gap-1 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-3 w-3" />
                          Accept
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-4 mt-6">
          {sentInvitations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Send className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  No sent invitations
                </h3>
                <p className="text-gray-500 text-center">
                  You haven&apos;t sent any team invitations yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {sentInvitations.map((invitation) => (
                <Card key={invitation.id} className="overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-purple-100">
                          <Users className="h-6 w-6 text-purple-600" />
                        </div>
                        <div className="space-y-1">
                          <CardTitle className="text-lg">
                            {invitation.teams.name}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Invited{" "}
                            {invitation.invited_user?.name || "Unknown User"} as{" "}
                            <span className="font-medium">
                              {invitation.role?.replace("_", " ") || "Member"}
                            </span>
                          </p>
                          <div className="flex items-center gap-2 pt-1">
                            {invitation.status && (
                              <Badge
                                className={getStatusColor(invitation.status)}
                              >
                                {invitation.status.toUpperCase()}
                              </Badge>
                            )}
                            {invitation.responded_at && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                Responded {formatDate(invitation.responded_at)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">
                          Sent{" "}
                          {invitation.created_at
                            ? formatDate(invitation.created_at)
                            : "N/A"}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage
                          src={invitation.invited_user?.avatar_url || undefined}
                          alt={invitation.invited_user?.name || undefined}
                        />
                        <AvatarFallback className="bg-gradient-to-r from-blue-400 to-cyan-400 text-white font-bold text-xs">
                          {invitation.invited_user?.name
                            ? invitation.invited_user.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                            : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">
                          {invitation.invited_user?.name || "Unknown User"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {invitation.invited_user?.email}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
