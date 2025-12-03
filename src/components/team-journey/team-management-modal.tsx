"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  updateTeamDetails,
} from "@/lib/database";
import { invitationCountManager } from "@/hooks/use-invitation-count";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Edit,
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
    description?: string | null;
    members: TeamMember[];
  };
  userRole: string;
  currentUserId?: string;
  onRefresh?: () => void;
}

export function TeamManagementModal({
  isOpen,
  onClose,
  team,
  userRole,
  currentUserId,
  onRefresh,
}: TeamManagementModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("current-team");
  const [searchTerm, setSearchTerm] = useState("");
  const [allAvailableUsers, setAllAvailableUsers] = useState<AvailableUser[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [invitingUsers, setInvitingUsers] = useState<Set<string>>(new Set());

  // Team details form state
  const [editFormData, setEditFormData] = useState({
    name: team.name,
    description: team.description || "",
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState("");

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
      router.push("/dashboard/team-journey");
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

  // Team details form handlers
  const handleTeamDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError("");

    // Security check: Only founders can edit team details
    if (userRole !== "founder") {
      setEditError("Only team founders can edit team details.");
      return;
    }

    if (!editFormData.name.trim()) {
      setEditError("Team name is required");
      return;
    }

    if (editFormData.name.trim().length < 2) {
      setEditError("Team name must be at least 2 characters long.");
      return;
    }

    if (editFormData.name.trim().length > 100) {
      setEditError("Team name must be less than 100 characters.");
      return;
    }

    if (editFormData.description.length > 500) {
      setEditError("Team description must be less than 500 characters.");
      return;
    } // Get founder ID - prefer currentUserId if available, otherwise find founder in members
    const founderId =
      currentUserId ||
      team.members.find((m) => m.team_role === "founder")?.user_id;
    if (!founderId) {
      setEditError("Unable to identify team founder. Please try again.");
      return;
    }

    // Additional security: Verify current user is actually the founder
    if (currentUserId && founderId !== currentUserId) {
      setEditError("You are not authorized to edit this team.");
      return;
    }

    setIsUpdating(true);
    try {
      // Optimistic update: Create updated team object for immediate UI feedback
      const optimisticTeam = {
        ...team,
        name: editFormData.name.trim(),
        description: editFormData.description.trim() || null,
      };

      await updateTeamDetails(team.id, founderId, {
        name: editFormData.name.trim(),
        description: editFormData.description.trim() || undefined,
      });

      toast.success(`Team "${editFormData.name.trim()}" updated successfully!`);

      // Refresh team data to ensure consistency
      await onRefresh?.();

      // Switch back to current team tab and close modal
      setActiveTab("current-team");
      onClose();
    } catch (error) {
      console.error("Error updating team details:", error);

      // Enhanced error handling with specific messages
      if (error instanceof Error) {
        if (error.message.includes("authorized")) {
          setEditError("You are not authorized to edit this team.");
        } else if (
          error.message.includes("network") ||
          error.message.includes("fetch")
        ) {
          setEditError(
            "Network error. Please check your connection and try again."
          );
        } else {
          setEditError(error.message);
        }
      } else {
        setEditError("Failed to update team details. Please try again.");
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const resetEditForm = () => {
    setEditFormData({
      name: team.name,
      description: team.description || "",
    });
    setEditError("");
  };

  // Handle modal close with confirmation if form has changes
  const handleModalClose = () => {
    const hasChanges =
      editFormData.name !== team.name ||
      (editFormData.description || "") !== (team.description || "");

    if (hasChanges && !isUpdating) {
      if (
        window.confirm(
          "You have unsaved changes. Are you sure you want to close?"
        )
      ) {
        resetEditForm();
        onClose();
      }
    } else {
      resetEditForm();
      onClose();
    }
  };

  // Load users once when invite tab becomes active
  useEffect(() => {
    if (activeTab === "invite-users" && allAvailableUsers.length === 0) {
      loadAllAvailableUsers();
    }
  }, [activeTab, loadAllAvailableUsers, allAvailableUsers.length]);

  // Reset form data when team prop changes
  useEffect(() => {
    setEditFormData({
      name: team.name,
      description: team.description || "",
    });
    setEditError("");
  }, [team.name, team.description]);

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Manage Team: {team.name}
          </DialogTitle>
          <DialogDescription>
            Manage your team members, invite new users, and edit team details.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full flex-1 flex flex-col overflow-hidden"
        >
          <TabsList
            className={`grid w-full ${
              userRole === "founder" ? "grid-cols-3" : "grid-cols-2"
            }`}
          >
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
            {userRole === "founder" && (
              <TabsTrigger
                value="team-details"
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Team Details
              </TabsTrigger>
            )}
          </TabsList>

          {/* Current Team Tab */}
          <TabsContent
            value="current-team"
            className="space-y-4 mt-6 flex-1 overflow-y-auto"
          >
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
          <TabsContent
            value="invite-users"
            className="space-y-4 mt-6 flex-1 overflow-y-auto"
          >
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

          {/* Team Details Tab - Founder Only */}
          {userRole === "founder" ? (
            <TabsContent
              value="team-details"
              className="space-y-4 mt-6 flex-1 overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Edit Team Details</h3>
                <Badge
                  variant="secondary"
                  className="bg-primary/10 text-primary"
                >
                  <Crown className="h-3 w-3 mr-1" />
                  Founder Only
                </Badge>
              </div>

              {editError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                  {editError}
                </div>
              )}

              <form onSubmit={handleTeamDetailsSubmit} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="teamName">Team Name</Label>
                    <span
                      className={`text-xs ${
                        editFormData.name.length > 80
                          ? "text-destructive"
                          : "text-muted-foreground"
                      }`}
                    >
                      {editFormData.name.length}/100
                    </span>
                  </div>
                  <Input
                    id="teamName"
                    value={editFormData.name}
                    onChange={(e) =>
                      setEditFormData((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="Enter team name..."
                    required
                    disabled={isUpdating}
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="teamDescription">Team Description</Label>
                    <span
                      className={`text-xs ${
                        editFormData.description.length > 450
                          ? "text-destructive"
                          : "text-muted-foreground"
                      }`}
                    >
                      {editFormData.description.length}/500
                    </span>
                  </div>
                  <Textarea
                    id="teamDescription"
                    value={editFormData.description}
                    onChange={(e) =>
                      setEditFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Describe your team's mission and goals..."
                    rows={4}
                    disabled={isUpdating}
                    maxLength={500}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="submit"
                    disabled={
                      isUpdating ||
                      !editFormData.name.trim() ||
                      editFormData.name.length > 100 ||
                      editFormData.description.length > 500 ||
                      (editFormData.name === team.name &&
                        editFormData.description === (team.description || ""))
                    }
                    className="flex-1"
                  >
                    {isUpdating ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetEditForm}
                    disabled={isUpdating}
                  >
                    Reset
                  </Button>
                </div>
              </form>
            </TabsContent>
          ) : (
            <TabsContent
              value="team-details"
              className="space-y-4 mt-6 flex-1 overflow-y-auto"
            >
              <div className="text-center py-8">
                <Crown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="font-semibold mb-2">Founder Access Required</h4>
                <p className="text-muted-foreground text-sm">
                  Only the team founder can edit team details like name and
                  description.
                </p>
              </div>
            </TabsContent>
          )}
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
          <Button
            variant="outline"
            onClick={handleModalClose}
            disabled={isUpdating}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
