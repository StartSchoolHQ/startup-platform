"use client";

import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  ChevronsUpDown,
  LogOut,
  History,
  Mail,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useAppContext } from "@/contexts/app-context";
import { useInvitationCount } from "@/hooks/use-invitation-count";
import { useNotifications } from "@/hooks/use-task-notifications";
import type { UnifiedNotification } from "@/lib/notifications";

export function NavUser({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
}) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const { user: appUser } = useAppContext();
  const { count: invitationCount } = useInvitationCount(appUser?.id);
  const {
    notifications,
    count: notificationCount,
    markAsSeen,
  } = useNotifications(appUser?.id);

  const handleNotificationClick = async (notification: UnifiedNotification) => {
    // Mark as seen and remove from list (auto-detects source)
    await markAsSeen(notification.id, notification.source);

    // Extract task_id from different sources
    const taskId =
      ("taskId" in notification ? notification.taskId : undefined) ||
      ("data" in notification && notification.data?.taskId);

    // Navigate based on notification type and data
    const notificationType =
      "type" in notification ? notification.type : undefined;
    const notificationTitle =
      "title" in notification ? notification.title : undefined;

    if (notificationType === "invitation") {
      router.push("/dashboard/invitations");
    } else if (notificationType === "achievement") {
      router.push("/dashboard/my-journey");
    } else if (notificationType === "team_update") {
      router.push("/dashboard/team-journey");
    } else if (
      notificationType === "peer_review_rejected" ||
      notificationType === "peer_review_approved" ||
      notificationType === "peer_review_resubmission" ||
      notificationType === "review_completed" ||
      notificationType === "review_rejected" ||
      notificationType === "resubmission" ||
      notificationTitle?.toLowerCase().includes("review")
    ) {
      // Peer review notifications - navigate to correct tab based on type
      // Reviewer notifications (resubmission) -> My Tests tab
      // Submitter notifications (rejected/approved) -> My Tasks tab
      const isReviewerNotification =
        notificationType === "peer_review_resubmission";
      const tab = isReviewerNotification ? "my-tests" : "my-tasks";

      if (taskId) {
        router.push(`/dashboard/peer-review?tab=${tab}&task=${taskId}`);
      } else {
        router.push(`/dashboard/peer-review?tab=${tab}`);
      }
    } else if (taskId) {
      // Task-related notifications
      router.push(`/dashboard/team-journey/task/${taskId}`);
    } else {
      // Default fallback
      router.push("/dashboard");
    }
  };

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Generate initials from user name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground relative"
            >
              <div className="relative">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                {invitationCount + notificationCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-4 min-w-4 text-xs p-0 flex items-center justify-center"
                  >
                    {invitationCount + notificationCount}
                  </Badge>
                )}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => router.push("/dashboard/account")}
              >
                <BadgeCheck />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push("/dashboard/invitations")}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Mail />
                    Invitations
                  </div>
                  {invitationCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="h-5 min-w-5 text-xs"
                    >
                      {invitationCount}
                    </Badge>
                  )}
                </div>
              </DropdownMenuItem>

              {/* Unified Notifications */}
              {notifications.length > 0 && (
                <>
                  {notifications.map((notification) => {
                    const notificationIcon =
                      "icon" in notification ? notification.icon : undefined;
                    const IconComponent =
                      notificationIcon === "check-circle"
                        ? CheckCircle
                        : notificationIcon === "users"
                        ? Mail
                        : notificationIcon === "refresh-cw"
                        ? RefreshCw
                        : notificationIcon === "x-circle"
                        ? XCircle
                        : XCircle;
                    const iconColor =
                      notificationIcon === "check-circle"
                        ? "text-green-500"
                        : notificationIcon === "users"
                        ? "text-blue-500"
                        : notificationIcon === "refresh-cw"
                        ? "text-blue-500"
                        : "text-red-500";

                    return (
                      <DropdownMenuItem
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className="px-3 py-2"
                      >
                        <div className="flex gap-3 w-full">
                          <IconComponent
                            className={`h-4 w-4 flex-shrink-0 ${iconColor}`}
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium">
                              {"title" in notification
                                ? notification.title
                                : notification.message}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {/* Show task title from data if available, otherwise show message */}
                              {("data" in notification &&
                                notification.data?.taskTitle) ||
                                ("message" in notification &&
                                  notification.message) ||
                                ""}
                            </div>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    );
                  })}
                </>
              )}
              <DropdownMenuItem
                onClick={() => router.push("/dashboard/transaction-history")}
              >
                <History />
                Transaction History
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
