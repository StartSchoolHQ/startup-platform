"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";

type Status = Database["public"]["Enums"]["scholarship_agreement_status"];

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

interface BadgeStyle {
  /** Display label — overrides the enum value when set. */
  label?: string;
  /** ShadCN Badge variant. */
  variant: "default" | "secondary" | "destructive" | "outline";
  /** Extra Tailwind classes for fine-grained color. */
  classes: string;
}

const STYLES: Record<Status, BadgeStyle> = {
  draft: {
    label: "Draft",
    variant: "secondary",
    classes:
      "bg-zinc-500/10 text-zinc-700 border-zinc-500/20 dark:bg-zinc-500/20 dark:text-zinc-300",
  },
  identity_verified: {
    label: "Identity verified",
    variant: "outline",
    classes:
      "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400",
  },
  awaiting_student_signature: {
    label: "Awaiting student",
    variant: "outline",
    classes:
      "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400",
  },
  student_signed: {
    label: "Student signed",
    variant: "outline",
    classes:
      "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400",
  },
  awaiting_school_signature: {
    label: "Awaiting school",
    variant: "outline",
    classes:
      "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400",
  },
  school_signed: {
    label: "School signed",
    variant: "outline",
    classes:
      "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400",
  },
  archived: {
    label: "Archived",
    variant: "default",
    classes:
      "bg-emerald-600/15 text-emerald-800 border-emerald-600/30 dark:bg-emerald-500/20 dark:text-emerald-400",
  },
  cancelled: {
    label: "Cancelled",
    variant: "destructive",
    classes: "",
  },
  expired: {
    label: "Expired",
    variant: "secondary",
    classes:
      "bg-zinc-400/10 text-zinc-600 border-zinc-400/20 dark:bg-zinc-400/20 dark:text-zinc-400",
  },
  failed: {
    label: "Failed",
    variant: "destructive",
    classes: "",
  },
};

/**
 * Color-coded status pill for scholarship agreements.
 * Drives off the generated `scholarship_agreement_status` enum so adding
 * a new DB status surfaces a TypeScript error here until handled.
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const style = STYLES[status];
  return (
    <Badge variant={style.variant} className={cn(style.classes, className)}>
      {style.label ?? status.replaceAll("_", " ")}
    </Badge>
  );
}
