import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface BorderedContainerProps {
  children: ReactNode
  className?: string
}

export function BorderedContainer({ children, className }: BorderedContainerProps) {
  return (
    <div className={cn("flex items-center gap-3 border border-gray-200 rounded-lg p-2", className)}>
      {children}
    </div>
  )
} 