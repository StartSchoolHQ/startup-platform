"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  removeTeamMember, 
  updateTeamMemberRole, 
  disbandTeam 
} from "@/lib/database";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  AlertTriangle
} from "lucide-react";

interface TeamMember {
  user_id: string;
  team_role: string;
  joined_at: string;
  users: {
    name: string | null;
    email: string;
    graduation_level: number | null;
  } | null;
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
  onRefresh
}: TeamManagementModalProps) {
  const [activeTab, setActiveTab] = useState("current-team");

  const canManageMembers = userRole === "founder" || userRole === "co_founder" || userRole === "leader";

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "founder":
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case "co_founder":
        return <Shield className="h-4 w-4 text-blue-500" />;
      case "leader":
        return <Shield className="h-4 w-4 text-green-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "founder":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      case "co_founder":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case "leader":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
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

  const handleChangeRole = async (memberId: string, newRole: "member" | "leader" | "founder" | "co_founder") => {
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
    if (!window.confirm("Are you sure you want to disband this team? This action cannot be undone.")) {
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Manage Team: {team.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="current-team" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Current Team ({team.members.length})
            </TabsTrigger>
            <TabsTrigger value="invite-users" className="flex items-center gap-2">
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
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-gradient-to-r from-purple-400 to-pink-400 text-white font-bold">
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
                            {member.team_role.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Joined {new Date(member.joined_at).toLocaleDateString()}
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
                          <DropdownMenuItem onClick={() => handleChangeRole(member.user_id, "leader")}>
                            <Shield className="h-4 w-4 mr-2" />
                            Make Leader
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleChangeRole(member.user_id, "member")}>
                            <User className="h-4 w-4 mr-2" />
                            Make Member
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleKickMember(member.user_id)}
                            className="text-red-600 focus:text-red-600"
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
            
            <Card className="p-6">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-base">Coming Soon</CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <p className="text-muted-foreground">
                  User invitation functionality will be implemented in the next part.
                  This will include browsing all users and sending team invitations.
                </p>
              </CardContent>
            </Card>
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