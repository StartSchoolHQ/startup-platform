"use client";

import posthog from "posthog-js";
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
  updateTeamDetailsV2,
  uploadTeamLogo,
} from "@/lib/database";
import {
  invalidateInvitationCount,
  invalidateInvitationLists,
} from "@/hooks/use-invitation-count";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { LogoUploadField } from "@/components/ui/logo-upload-field";
import {
  Users,
  UserPlus,
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
    website?: string | null;
    logo_url?: string | null;
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
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("current-team");
  const [showDisbandConfirm, setShowDisbandConfirm] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
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
    website: team.website || "",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState("");

  const canManageMembers =
    userRole === "founder" ||
    userRole === "co_founder" ||
    userRole === "leader";

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "founder":
        return <Crown className="text-primary h-4 w-4" />;
      case "co_founder":
        return <Shield className="text-primary h-4 w-4" />;
      case "leader":
        return <Shield className="text-primary h-4 w-4" />;
      default:
        return <User className="text-muted-foreground h-4 w-4" />;
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
      posthog.capture("team_member_removed", {
        team_id: team.id,
        team_name: team.name,
        removed_user_id: memberId,
      });
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
      posthog.capture("team_member_role_changed", {
        team_id: team.id,
        team_name: team.name,
        member_id: memberId,
        new_role: newRole,
      });
      toast.success("Member role updated successfully");
      onRefresh?.();
      onClose();
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update member role");
    }
  };

  const handleDisbandTeam = async () => {
    setShowDisbandConfirm(true);
  };

  const confirmDisbandTeam = async () => {
    try {
      await disbandTeam(team.id);
      posthog.capture("team_disbanded", {
        team_id: team.id,
        team_name: team.name,
      });

      // Invalidate React Query cache to update UI without page refresh
      queryClient.invalidateQueries({ queryKey: ["teamJourney"] });

      toast.success("Team disbanded successfully");
      onClose();
      // Redirect to teams list or dashboard
      router.push("/dashboard/team-journey");
    } catch (error) {
      console.error("Error disbanding team:", error);
      toast.error("Failed to disband team");
    } finally {
      setShowDisbandConfirm(false);
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
      posthog.capture("invitation_sent", {
        team_id: team.id,
        team_name: team.name,
        invited_user_id: userId,
        invited_user_name: userName,
        role: "member",
      });
      toast.success(`Invitation sent to ${userName || "user"} successfully!`);
      // Remove user from available list
      setAllAvailableUsers((prev) => prev.filter((user) => user.id !== userId));
      // Refresh invitation count and lists for all users
      invalidateInvitationCount(queryClient);
      invalidateInvitationLists(queryClient);
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
    }

    if (editFormData.website && editFormData.website.length > 255) {
      setEditError("Website URL must be less than 255 characters.");
      return;
    }

    // Get founder ID - prefer currentUserId if available, otherwise find founder in members
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
      // Note: Currently not implemented - we just refresh after API call
      // const optimisticTeam = {
      //   ...team,
      //   name: editFormData.name.trim(),
      //   description: editFormData.description.trim() || null,
      // };

      // Upload logo if a new file was selected
      let logoUrl: string | null | undefined = undefined;
      if (logoFile) {
        logoUrl = await uploadTeamLogo(team.id, logoFile);
      }

      await updateTeamDetailsV2(team.id, founderId, {
        name: editFormData.name.trim(),
        description: editFormData.description.trim() || undefined,
        website: editFormData.website.trim() || undefined,
        ...(logoUrl !== undefined ? { logo_url: logoUrl } : {}),
      });

      toast.success(
        logoFile
          ? `Team "${editFormData.name.trim()}" updated with new logo!`
          : `Team "${editFormData.name.trim()}" updated successfully!`
      );

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
      website: team.website || "",
    });
    setEditError("");
    setShowUnsavedWarning(false);
  };

  // Handle modal close with confirmation if form has changes
  const handleModalClose = () => {
    const hasChanges =
      editFormData.name !== team.name ||
      (editFormData.description || "") !== (team.description || "") ||
      (editFormData.website || "") !== (team.website || "");

    if (hasChanges && !isUpdating) {
      setShowUnsavedWarning(true);
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
      website: team.website || "",
    });
    setEditError("");
  }, [team.name, team.description, team.website]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleModalClose}>
        <DialogContent
          className="flex h-[80vh] max-w-4xl flex-col"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Manage Team: {team.name}
            </DialogTitle>
            <DialogDescription>
              Manage your team members, invite new users, and edit team details.
            </DialogDescription>
          </DialogHeader>

          {showUnsavedWarning && (
            <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/50 dark:bg-amber-950/30">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                You have unsaved changes.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUnsavedWarning(false)}
                >
                  Keep Editing
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setShowUnsavedWarning(false);
                    resetEditForm();
                    onClose();
                  }}
                >
                  Discard
                </Button>
              </div>
            </div>
          )}

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex w-full flex-1 flex-col overflow-hidden"
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
              className="mt-6 flex-1 space-y-4 overflow-y-auto"
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
                      <AlertTriangle className="mr-2 h-4 w-4" />
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
                        <Avatar className="h-12 w-12">
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
                          <p className="text-muted-foreground text-sm">
                            {member.users?.email}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className={getRoleBadgeColor(member.team_role)}
                            >
                              {member.team_role
                                .replace("_", " ")
                                .replace(/\b\w/g, (l) => l.toUpperCase())}
                            </Badge>
                            <span className="text-muted-foreground text-xs">
                              Joined {formatDate(member.joined_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {canManageMembers && member.team_role !== "founder" && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleChangeRole(member.user_id, "leader")
                            }
                            className="h-8 px-2 text-xs"
                          >
                            <Shield className="mr-1 h-3 w-3" />
                            Make Leader
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleChangeRole(member.user_id, "member")
                            }
                            className="h-8 px-2 text-xs"
                          >
                            <User className="mr-1 h-3 w-3" />
                            Make Member
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleKickMember(member.user_id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2 text-xs"
                          >
                            <UserMinus className="mr-1 h-3 w-3" />
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Invite Users Tab */}
            <TabsContent
              value="invite-users"
              className="mt-6 flex-1 space-y-4 overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Invite New Members</h3>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
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
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground">Loading users...</p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <Card className="p-6">
                    <div className="text-center">
                      <Users className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                      <h4 className="mb-2 font-semibold">No users found</h4>
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
                          <Avatar className="h-10 w-10">
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
                            <p className="text-muted-foreground text-sm">
                              {user.email}
                            </p>
                            {user.graduation_level && (
                              <Badge variant="outline" className="mt-1 text-xs">
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
                          {invitingUsers.has(user.id)
                            ? "Inviting..."
                            : "Invite"}
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
                className="mt-6 flex-1 space-y-4 overflow-y-auto"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Edit Team Details</h3>
                  <Badge
                    variant="secondary"
                    className="bg-primary/10 text-primary"
                  >
                    <Crown className="mr-1 h-3 w-3" />
                    Founder Only
                  </Badge>
                </div>

                {editError && (
                  <div className="bg-destructive/10 border-destructive/20 text-destructive rounded-lg border p-3 text-sm">
                    {editError}
                  </div>
                )}

                <form onSubmit={handleTeamDetailsSubmit} className="space-y-4">
                  <LogoUploadField
                    currentLogoUrl={team.logo_url}
                    teamName={editFormData.name}
                    onFileSelect={setLogoFile}
                    disabled={isUpdating}
                  />

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

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="teamWebsite">
                        Team Website (optional)
                      </Label>
                      <span
                        className={`text-xs ${
                          editFormData.website &&
                          editFormData.website.length > 230
                            ? "text-destructive"
                            : "text-muted-foreground"
                        }`}
                      >
                        {editFormData.website.length}/255
                      </span>
                    </div>
                    <Input
                      id="teamWebsite"
                      type="url"
                      value={editFormData.website}
                      onChange={(e) =>
                        setEditFormData((prev) => ({
                          ...prev,
                          website: e.target.value,
                        }))
                      }
                      placeholder="https://example.com or example.com"
                      disabled={isUpdating}
                      maxLength={255}
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
                        (editFormData.website &&
                          editFormData.website.length > 255) ||
                        (!logoFile &&
                          editFormData.name === team.name &&
                          editFormData.description ===
                            (team.description || "") &&
                          editFormData.website === (team.website || ""))
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
                className="mt-6 flex-1 space-y-4 overflow-y-auto"
              >
                <div className="py-8 text-center">
                  <Crown className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                  <h4 className="mb-2 font-semibold">
                    Founder Access Required
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    Only the team founder can edit team details like name and
                    description.
                  </p>
                </div>
              </TabsContent>
            )}
          </Tabs>

          {/* Inline Disband Team Confirmation */}
          {showDisbandConfirm && (
            <div className="bg-background/95 absolute inset-0 z-10 flex items-center justify-center rounded-lg p-6">
              <div className="max-w-sm space-y-4 text-center">
                <AlertTriangle className="text-destructive mx-auto h-10 w-10" />
                <h3 className="text-lg font-semibold">Disband Team?</h3>
                <p className="text-muted-foreground text-sm">
                  Are you sure you want to disband &quot;{team.name}&quot;? This
                  action cannot be undone. All team members will lose access and
                  all team data will be archived.
                </p>
                <div className="flex justify-center gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowDisbandConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={confirmDisbandTeam}>
                    Disband Team
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-shrink-0 justify-end gap-2 border-t pt-4">
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
    </>
  );
}
