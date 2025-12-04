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
import type { Notification } from "@/lib/database";

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

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as seen and remove from list
    await markAsSeen(notification.id);

    // Navigate to the task based on notification type/context
    // Peer review notifications should go to team-journey (team context tasks)
    // Individual task notifications should go to my-journey
    if (
      notification.type === "review_completed" ||
      notification.type === "review_rejected" ||
      notification.title?.toLowerCase().includes("review")
    ) {
      // Peer review notifications are for team context tasks
      router.push(`/dashboard/team-journey/task/${notification.taskId}`);
    } else {
      // Individual task notifications
      router.push(`/dashboard/my-journey/task/${notification.taskId}`);
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

              {/* Simple Notifications */}
              {notifications.length > 0 && (
                <>
                  {notifications.map((notification) => {
                    const IconComponent =
                      notification.icon === "check-circle"
                        ? CheckCircle
                        : XCircle;
                    const iconColor =
                      notification.icon === "check-circle"
                        ? "text-green-500"
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
                              {notification.title}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {notification.taskTitle}
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
