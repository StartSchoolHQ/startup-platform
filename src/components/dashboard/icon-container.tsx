import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface IconContainerProps {
  icon: LucideIcon;
  iconColor: string;
  backgroundColor: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: { container: "p-1.5", icon: "h-4 w-4" },
  md: { container: "p-2", icon: "h-5 w-5" },
  lg: { container: "p-2", icon: "h-8 w-8" },
};

export function IconContainer({
  icon: Icon,
  iconColor,
  backgroundColor,
  size = "md",
}: IconContainerProps) {
  const { container, icon: iconSize } = sizeClasses[size];

  return (
    <div className={cn("rounded-lg", container, backgroundColor)}>
      <Icon className={cn(iconSize, iconColor)} />
    </div>
  );
}
