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
  Loader2,
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
    markAllAsRead,
    isMarkingAllRead,
  } = useNotifications(appUser?.id);
  const [isOpen, setIsOpen] = useState(false);

  // Get notification icon based on type
  const getNotificationIcon = (notification: UnifiedNotification) => {
    const notificationIcon = notification.icon;
    const type = notification.type;

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
          return { Icon: RefreshCw, color: "text-primary" };
        case "invitation":
          return { Icon: Mail, color: "text-primary" };
        case "achievement":
          return { Icon: Trophy, color: "text-amber-500" };
        case "invitations_auto_declined":
          return { Icon: Users, color: "text-orange-500" };
        case "task_assigned":
          return { Icon: UserCheck, color: "text-primary" };
        default:
          return { Icon: Bell, color: "text-muted-foreground" };
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
            ? "text-primary"
            : "text-muted-foreground";

    return { Icon: IconComponent, color: iconColor };
  };

  const handleNotificationClick = async (notification: UnifiedNotification) => {
    // Mark as seen and remove from list
    await markAsSeen(notification.id);

    // Close the modal/popover
    setIsOpen(false);

    // Extract routing data from notification
    const data = notification.data;
    const type = notification.type;

    // Custom route override
    if (data?.target_route) {
      let route = data.target_route;
      // AI-review notifications store the *task* id in the route, but the
      // solo task page is keyed by the task_progress id. Swap it in when the
      // progress id is available so the click lands on the right page.
      if (
        data.task_progress_id &&
        data.task_id &&
        route === `/dashboard/my-journey/task/${data.task_id}`
      ) {
        route = `/dashboard/my-journey/task/${data.task_progress_id}`;
      }
      if (data.target_tab) route = `${route}?tab=${data.target_tab}`;
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

      case "task_assigned": {
        const assignedTeamId = data?.team_id;
        if (assignedTeamId) {
          router.push(`/dashboard/team-journey/${assignedTeamId}`);
        } else {
          router.push("/dashboard/team-journey");
        }
        break;
      }

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

  const formatNotificationTime = (createdAt: string) => {
    try {
      return formatDistanceToNow(new Date(createdAt), { addSuffix: true });
    } catch {
      return "Recently";
    }
  };

  const notificationList = (
    <ScrollArea
      className={notifications.length === 0 ? "w-full" : "h-[400px] w-full"}
    >
      <div className="p-1">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <span className="bg-primary/10 text-primary mb-3 flex h-10 w-10 items-center justify-center rounded-full">
              <Bell className="h-5 w-5" />
            </span>
            <p className="text-sm font-medium">You&apos;re all caught up</p>
            <p className="text-muted-foreground mt-1 text-xs">
              We&apos;ll notify you when something important happens
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-2">
              <span className="text-muted-foreground text-xs">
                {notificationCount} unread
              </span>
              {notificationCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  disabled={isMarkingAllRead}
                  className="text-muted-foreground hover:text-foreground h-auto p-1 text-xs"
                >
                  {isMarkingAllRead ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Check className="mr-1 h-3 w-3" />
                  )}
                  Mark all read
                </Button>
              )}
            </div>
            <Separator />
            {notifications.map((notification, index) => {
              const { Icon, color } = getNotificationIcon(notification);
              const title = notification.title;
              const message = notification.message ?? "";
              const taskTitle =
                notification.data?.taskTitle ||
                notification.data?.task_title ||
                "";
              const createdAt = notification.created_at ?? "";

              return (
                <div
                  key={notification.id}
                  className="animate-[slide-in-right_0.3s_ease-out_forwards]"
                  style={{ animationDelay: `${index * 30}ms`, opacity: 0 }}
                >
                  <button
                    onClick={() => handleNotificationClick(notification)}
                    className="hover:bg-muted/60 w-full rounded-lg p-3 text-left transition-colors"
                  >
                    <div className="flex gap-3">
                      <span className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                        <Icon className={`h-4 w-4 ${color}`} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 text-sm leading-tight font-medium">
                          {title}
                        </div>
                        {message && title !== message && (
                          <div className="text-muted-foreground mb-1 line-clamp-2 text-xs leading-tight">
                            {message}
                          </div>
                        )}
                        {taskTitle && (
                          <div className="text-muted-foreground text-xs font-medium">
                            Task: {taskTitle}
                          </div>
                        )}
                        {createdAt && (
                          <div className="text-muted-foreground mt-1 text-xs">
                            {formatNotificationTime(createdAt)}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
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
              className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center p-0 text-xs"
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
        collisionPadding={16}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Bell className="text-primary h-4 w-4" />
            Notifications
          </h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {notificationList}
      </PopoverContent>
    </Popover>
  );
}
