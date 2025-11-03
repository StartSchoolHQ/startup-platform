"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDate } from "@/lib/date-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  removeTeamMember,
  updateTeamMemberRole,
  disbandTeam,
  getAvailableUsersForInvitation,
  sendTeamInvitationById,
} from "@/lib/database";
import { invitationCountManager } from "@/hooks/use-invitation-count";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  UserPlus,
  MoreVertical,
  Crown,
  Shield,
  User,
  UserMinus,
  AlertTriangle,
  Search,
  Mail,
} from "lucide-react";

interface TeamMember {
  user_id: string;
  team_role: string;
  joined_at: string;
  users: {
    name: string | null;
    email: string;
    avatar_url: string | null;
    graduation_level: number | null;
  } | null;
}

interface AvailableUser {
  id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
  graduation_level: number | null;
}

interface TeamManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: {
    id: string;
    name: string;
    members: TeamMember[];
  };
  userRole: string;
  onRefresh?: () => void;
}

export function TeamManagementModal({
  isOpen,
  onClose,
  team,
  userRole,
  onRefresh,
}: TeamManagementModalProps) {
  const [activeTab, setActiveTab] = useState("current-team");
  const [searchTerm, setSearchTerm] = useState("");
  const [allAvailableUsers, setAllAvailableUsers] = useState<AvailableUser[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [invitingUsers, setInvitingUsers] = useState<Set<string>>(new Set());

  const canManageMembers =
    userRole === "founder" ||
    userRole === "co_founder" ||
    userRole === "leader";

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "founder":
        return <Crown className="h-4 w-4 text-primary" />;
      case "co_founder":
        return <Shield className="h-4 w-4 text-primary" />;
      case "leader":
        return <Shield className="h-4 w-4 text-primary" />;
      default:
        return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "founder":
        return "bg-primary/10 text-primary hover:bg-primary/20";
      case "co_founder":
        return "bg-primary/10 text-primary hover:bg-primary/20";
      case "leader":
        return "bg-primary/10 text-primary hover:bg-primary/20";
      default:
        return "bg-muted text-muted-foreground hover:bg-muted/80";
    }
  };

  const handleKickMember = async (memberId: string) => {
    try {
      await removeTeamMember(team.id, memberId);
      toast.success("Member removed from team successfully");
      onRefresh?.();
      onClose();
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member from team");
    }
  };

  const handleChangeRole = async (
    memberId: string,
    newRole: "member" | "leader" | "founder" | "co_founder"
  ) => {
    try {
      await updateTeamMemberRole(team.id, memberId, newRole);
      toast.success("Member role updated successfully");
      onRefresh?.();
      onClose();
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update member role");
    }
  };

  const handleDisbandTeam = async () => {
    if (
      !window.confirm(
        "Are you sure you want to disband this team? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await disbandTeam(team.id);
      toast.success("Team disbanded successfully");
      onClose();
      // Redirect to teams list or dashboard
      window.location.href = "/dashboard/team-journey";
    } catch (error) {
      console.error("Error disbanding team:", error);
      toast.error("Failed to disband team");
    }
  };

  // Load all available users for invitation (once)
  const loadAllAvailableUsers = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all users without search term to get the complete list
      const users = await getAvailableUsersForInvitation(team.id, "");
      setAllAvailableUsers(users);
    } catch (error) {
      console.error("Error loading available users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [team.id]);

  // Filter users locally based on search term
  const filteredUsers = allAvailableUsers.filter((user) => {
    if (!searchTerm.trim()) return true;

    const searchLower = searchTerm.toLowerCase();
    const nameMatch = user.name?.toLowerCase().includes(searchLower) || false;
    const emailMatch = user.email.toLowerCase().includes(searchLower);

    return nameMatch || emailMatch;
  });

  // Send invitation to user
  const handleInviteUser = async (userId: string, userName: string | null) => {
    setInvitingUsers((prev) => new Set(prev).add(userId));

    try {
      await sendTeamInvitationById(team.id, userId, "member");
      toast.success(`Invitation sent to ${userName || "user"} successfully!`);
      // Remove user from available list
      setAllAvailableUsers((prev) => prev.filter((user) => user.id !== userId));
      // Refresh invitation count and lists for all users
      invitationCountManager.refreshAll();
    } catch (error) {
      console.error("Error sending invitation:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to send invitation"
      );
    } finally {
      setInvitingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  // Load users once when invite tab becomes active
  useEffect(() => {
    if (activeTab === "invite-users" && allAvailableUsers.length === 0) {
      loadAllAvailableUsers();
    }
  }, [activeTab, loadAllAvailableUsers, allAvailableUsers.length]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Manage Team: {team.name}
          </DialogTitle>
          <DialogDescription>
            Manage your team members and invite new users to join your team.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger
              value="current-team"
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Current Team ({team.members.length})
            </TabsTrigger>
            <TabsTrigger
              value="invite-users"
              className="flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Invite Users
            </TabsTrigger>
          </TabsList>

          {/* Current Team Tab */}
          <TabsContent value="current-team" className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Team Members</h3>
              {canManageMembers && userRole === "founder" && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                    onClick={handleDisbandTeam}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Disband Team
                  </Button>
                </div>
              )}
            </div>

            <div className="grid gap-3">
              {team.members.map((member) => (
                <Card key={member.user_id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={member.users?.avatar_url || ""} />
                        <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                          {member.users?.name
                            ? member.users.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                            : "U"}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">
                            {member.users?.name || "Unknown User"}
                          </h4>
                          {getRoleIcon(member.team_role)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {member.users?.email}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="secondary"
                            className={getRoleBadgeColor(member.team_role)}
                          >
                            {member.team_role
                              .replace("_", " ")
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Joined {formatDate(member.joined_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {canManageMembers && member.team_role !== "founder" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              handleChangeRole(member.user_id, "leader")
                            }
                          >
                            <Shield className="h-4 w-4 mr-2" />
                            Make Leader
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleChangeRole(member.user_id, "member")
                            }
                          >
                            <User className="h-4 w-4 mr-2" />
                            Make Member
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleKickMember(member.user_id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <UserMinus className="h-4 w-4 mr-2" />
                            Remove from Team
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Invite Users Tab */}
          <TabsContent value="invite-users" className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Invite New Members</h3>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Users List */}
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading users...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <Card className="p-6">
                  <div className="text-center">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h4 className="font-semibold mb-2">No users found</h4>
                    <p className="text-muted-foreground text-sm">
                      {searchTerm
                        ? "Try adjusting your search terms"
                        : "All users are either already team members or have pending invitations"}
                    </p>
                  </div>
                </Card>
              ) : (
                filteredUsers.map((user) => (
                  <Card key={user.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={user.avatar_url || ""} />
                          <AvatarFallback className="bg-secondary text-secondary-foreground font-bold">
                            {user.name
                              ? user.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                              : "U"}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1">
                          <h4 className="font-semibold">
                            {user.name || "Unknown User"}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {user.email}
                          </p>
                          {user.graduation_level && (
                            <Badge variant="outline" className="text-xs mt-1">
                              Level {user.graduation_level}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <Button
                        onClick={() => handleInviteUser(user.id, user.name)}
                        disabled={invitingUsers.has(user.id)}
                        className="flex items-center gap-2"
                      >
                        <Mail className="h-4 w-4" />
                        {invitingUsers.has(user.id) ? "Inviting..." : "Invite"}
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
