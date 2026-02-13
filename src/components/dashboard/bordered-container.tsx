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
        "border-border flex min-h-[64px] items-center gap-3 rounded-lg border p-2",
        className
      )}
    >
      {children}
    </div>
  );
}
