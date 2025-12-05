"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle,
  XCircle,
  RefreshCw,
  UserCheck,
  UserX,
  Users,
  CalendarClock,
  Mail,
  Trophy,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useNotifications } from "@/hooks/use-task-notifications";
import { useAppContext } from "@/contexts/app-context";
import type { UnifiedNotification } from "@/lib/notifications";
import { formatDistanceToNow } from "date-fns";

export function NotificationCenter() {
  const router = useRouter();
  const { user: appUser } = useAppContext();
  const {
    notifications,
    count: notificationCount,
    markAsSeen,
  } = useNotifications(appUser?.id);
  const [isOpen, setIsOpen] = useState(false);

  // Get notification icon based on type
  const getNotificationIcon = (notification: UnifiedNotification) => {
    const notificationIcon =
      "icon" in notification ? notification.icon : undefined;
    const type = "type" in notification ? notification.type : undefined;

    // Use type-based icons if no explicit icon
    if (!notificationIcon && type) {
      switch (type) {
        case "invitation_accepted":
        case "peer_review_approved":
          return { Icon: CheckCircle, color: "text-green-500" };
        case "invitation_declined":
        case "peer_review_rejected":
          return { Icon: XCircle, color: "text-red-500" };
        case "peer_review_resubmission":
          return { Icon: RefreshCw, color: "text-blue-500" };
        case "invitation":
          return { Icon: Mail, color: "text-blue-500" };
        case "achievement":
          return { Icon: Trophy, color: "text-yellow-500" };
        case "invitations_auto_declined":
          return { Icon: Users, color: "text-orange-500" };
        default:
          return { Icon: Bell, color: "text-gray-500" };
      }
    }

    // Icon-based mapping (existing logic)
    const IconComponent =
      notificationIcon === "check-circle"
        ? CheckCircle
        : notificationIcon === "x-circle"
        ? XCircle
        : notificationIcon === "refresh-cw"
        ? RefreshCw
        : notificationIcon === "user-check"
        ? UserCheck
        : notificationIcon === "user-x"
        ? UserX
        : notificationIcon === "users"
        ? Users
        : notificationIcon === "users-x"
        ? Users
        : notificationIcon === "calendar-clock"
        ? CalendarClock
        : notificationIcon === "bell"
        ? Bell
        : Bell;

    const iconColor =
      notificationIcon === "check-circle" || notificationIcon === "user-check"
        ? "text-green-500"
        : notificationIcon === "x-circle" ||
          notificationIcon === "user-x" ||
          notificationIcon === "users-x"
        ? "text-red-500"
        : notificationIcon === "refresh-cw" ||
          notificationIcon === "users" ||
          notificationIcon === "calendar-clock"
        ? "text-blue-500"
        : "text-gray-500";

    return { Icon: IconComponent, color: iconColor };
  };

  const handleNotificationClick = async (notification: UnifiedNotification) => {
    // Mark as seen and remove from list
    await markAsSeen(notification.id, notification.source);

    // Close the modal/popover
    setIsOpen(false);

    // Extract routing data from notification
    const data = "data" in notification ? notification.data : null;
    const type = "type" in notification ? notification.type : undefined;

    // Custom route override
    if (data?.target_route) {
      const route = data.target_tab
        ? `${data.target_route}?tab=${data.target_tab}`
        : data.target_route;
      router.push(route);
      return;
    }

    // Task routing - use task_progress_id for team tasks, task_id for individual tasks
    const taskId = data?.taskId || data?.task_id;
    const taskProgressId = data?.task_progress_id;

    // Notification type-specific routing
    switch (type) {
      case "invitation":
      case "invitation_accepted":
      case "invitation_declined":
      case "invitations_auto_declined":
        router.push("/dashboard/invitations");
        break;

      case "peer_review_approved":
      case "peer_review_rejected":
        // Task submitter -> Team Journey Tasks with Peer Review tab
        // Use task_progress_id for team tasks (the actual task instance)
        const routeTaskId = taskProgressId || taskId;
        if (routeTaskId) {
          router.push(
            `/dashboard/team-journey/task/${routeTaskId}?tab=peer-review`
          );
        } else {
          router.push("/dashboard/peer-review?tab=my-tasks");
        }
        break;

      case "peer_review_resubmission":
        // Reviewer -> Peer Review My Tests tab
        router.push("/dashboard/peer-review?tab=my-tests");
        break;

      case "weekly_report_reminder_2day":
      case "weekly_report_reminder_1day":
        // Navigate to appropriate weekly report section
        const context = data?.context;
        if (context === "team") {
          const teamId = data?.team_id;
          if (teamId) {
            router.push(`/dashboard/team-journey/${teamId}?tab=weekly-reports`);
          } else {
            router.push("/dashboard/team-journey");
          }
        } else {
          router.push("/dashboard/my-journey?tab=weekly-reports");
        }
        break;

      case "achievement":
        router.push("/dashboard/my-journey");
        break;

      default:
        // Legacy routing logic for backward compatibility
        if (
          type === "review_completed" ||
          type === "review_rejected" ||
          type === "resubmission"
        ) {
          // Legacy peer review notifications
          const isReviewerNotification = type === "resubmission";
          const tab = isReviewerNotification ? "my-tests" : "my-tasks";
          const routeTaskId = taskProgressId || taskId;
          if (routeTaskId) {
            router.push(
              `/dashboard/peer-review?tab=${tab}&task=${routeTaskId}`
            );
          } else {
            router.push(`/dashboard/peer-review?tab=${tab}`);
          }
        } else {
          // For general task routing, use task_progress_id for team tasks
          const routeTaskId = taskProgressId || taskId;
          if (routeTaskId) {
            router.push(`/dashboard/team-journey/task/${routeTaskId}`);
          } else {
            router.push("/dashboard");
          }
        }
    }
  };

  const handleMarkAllAsRead = async () => {
    if (notifications.length > 0 && appUser?.id) {
      // Mark all notifications as seen using the enhanced function
      for (const notification of notifications) {
        await markAsSeen(notification.id, notification.source);
      }
    }
  };

  const formatNotificationTime = (createdAt: string) => {
    try {
      return formatDistanceToNow(new Date(createdAt), { addSuffix: true });
    } catch {
      return "Recently";
    }
  };

  const NotificationList = () => (
    <ScrollArea className="h-[400px] w-full">
      <div className="space-y-1 p-1">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              No new notifications
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              We&apos;ll notify you when something important happens
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-2">
              <h4 className="font-medium text-sm">
                Notifications ({notificationCount})
              </h4>
              {notificationCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>
            <Separator />
            {notifications.map((notification, index) => {
              const { Icon, color } = getNotificationIcon(notification);
              const title =
                "title" in notification
                  ? notification.title
                  : notification.message;
              const message =
                "message" in notification ? notification.message : "";
              const taskTitle: string =
                "data" in notification
                  ? ((notification.data?.taskTitle ||
                      notification.data?.task_title ||
                      "") as string)
                  : "";
              const createdAt: string =
                "created_at" in notification
                  ? (notification.created_at as string)
                  : "createdAt" in notification
                  ? (notification.createdAt as string)
                  : "";

              return (
                <div key={notification.id}>
                  <button
                    onClick={() => handleNotificationClick(notification)}
                    className="w-full text-left p-3 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 pt-0.5">
                        <Icon className={`h-4 w-4 ${color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm leading-tight mb-1">
                          {title}
                        </div>
                        {message && title !== message && (
                          <div className="text-xs text-muted-foreground leading-tight mb-1 line-clamp-2">
                            {message}
                          </div>
                        )}
                        {taskTitle && (
                          <div className="text-xs text-muted-foreground font-medium">
                            Task: {taskTitle}
                          </div>
                        )}
                        {createdAt && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatNotificationTime(createdAt)}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                  {index < notifications.length - 1 && (
                    <Separator className="my-1" />
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </ScrollArea>
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          aria-label={`Notifications${
            notificationCount > 0 ? ` (${notificationCount} new)` : ""
          }`}
        >
          <Bell className="h-4 w-4" />
          {notificationCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 min-w-4 text-xs p-0 flex items-center justify-center"
            >
              {notificationCount > 99 ? "99+" : notificationCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 p-0"
        align="end"
        sideOffset={8}
        alignOffset={-8}
      >
        <div className="flex items-center justify-between p-4 pb-2">
          <h3 className="font-semibold">Notifications</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <NotificationList />
      </PopoverContent>
    </Popover>
  );
}
