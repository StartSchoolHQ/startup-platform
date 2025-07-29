interface StreakBadgeProps {
  days: number
  type: "active" | "warning" | "inactive"
}

export function StreakBadge({ days, type }: StreakBadgeProps) {
  const getBadgeColor = () => {
    switch (type) {
      case "active":
        return "bg-green-100 text-green-700"
      case "warning":
        return "bg-orange-100 text-orange-700"
      case "inactive":
        return "bg-gray-100 text-gray-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${getBadgeColor()}`}>
      {days} days
    </span>
  )
} 