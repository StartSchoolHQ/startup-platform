import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BorderedContainerProps {
  children: ReactNode;
  className?: string;
}

export function BorderedContainer({
  children,
  className,
}: BorderedContainerProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border border-border rounded-lg p-2 min-h-[64px]",
        className
      )}
    >
      {children}
    </div>
  );
}
