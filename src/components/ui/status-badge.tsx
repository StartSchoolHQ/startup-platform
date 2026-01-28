"use client";

import { Badge } from "@/components/ui/badge";

export type TaskStatus =
  | "approved"
  | "rejected"
  | "revision_required"
  | "pending_review"
  | "in_progress"
  | "not_started"
  | "cancelled"
  | "cooldown";

interface StatusBadgeProps {
  status: TaskStatus;
  variant?: "default" | "journey";
}

const getStatusConfig = (
  status: TaskStatus,
  variant: "default" | "journey" = "default"
) => {
  switch (status) {
    case "approved":
      return {
        text: variant === "journey" ? "Finished" : "Accepted",
        badgeVariant: "default" as const,
        className:
          "bg-green-500/10 text-green-700 border-green-500/20 dark:bg-green-500/20 dark:text-green-400",
      };
    case "rejected":
      return {
        text: variant === "journey" ? "Not Accepted" : "Rejected",
        badgeVariant: "destructive" as const,
        className: "",
      };
    case "revision_required":
      return {
        text: variant === "journey" ? "Not Accepted" : "Revision Required",
        badgeVariant: "outline" as const,
        className:
          "bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:bg-yellow-500/20 dark:text-yellow-400",
      };
    case "pending_review":
      return {
        text: variant === "journey" ? "Peer Review" : "Pending Review",
        badgeVariant: "secondary" as const,
        className:
          "bg-purple-500/10 text-purple-700 border-purple-500/20 dark:bg-purple-500/20 dark:text-purple-400",
      };
    case "in_progress":
      return {
        text: "In Progress",
        badgeVariant: "outline" as const,
        className:
          "bg-orange-500/10 text-orange-700 border-orange-500/20 dark:bg-orange-500/20 dark:text-orange-400",
      };
    case "not_started":
      return {
        text: "Not Started",
        badgeVariant: "secondary" as const,
        className: "",
      };
    case "cancelled":
      return {
        text: "Cancelled",
        badgeVariant: "secondary" as const,
        className: "",
      };
    case "cooldown":
      return {
        text: "Cooldown",
        badgeVariant: "outline" as const,
        className:
          "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400",
      };
    default:
      return {
        text: "Unknown",
        badgeVariant: "secondary" as const,
        className: "",
      };
  }
};

export function StatusBadge({ status, variant = "default" }: StatusBadgeProps) {
  const config = getStatusConfig(status, variant);

  // StatusBadge component for task status display

  return (
    <Badge variant={config.badgeVariant} className={config.className}>
      {config.text}
    </Badge>
  );
}
