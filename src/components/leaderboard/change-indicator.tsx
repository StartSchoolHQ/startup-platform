import { ArrowUp, ArrowDown } from "lucide-react"

interface ChangeIndicatorProps {
  direction: "up" | "down" | "none"
  amount: number
}

export function ChangeIndicator({ direction, amount }: ChangeIndicatorProps) {
  if (direction === "none" || amount === 0) {
    return <span className="text-gray-400 text-sm">—</span>
  }

  return (
    <div className="flex items-center gap-1">
      {direction === "up" ? (
        <ArrowUp className="h-3 w-3 text-green-500" />
      ) : (
        <ArrowDown className="h-3 w-3 text-red-500" />
      )}
      <span className={`text-sm ${direction === "up" ? "text-green-500" : "text-red-500"}`}>
        {amount}
      </span>
    </div>
  )
} 