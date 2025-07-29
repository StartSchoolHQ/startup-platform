import { TrendingUp, TrendingDown } from "lucide-react"

interface RankIconProps {
  type: "crown" | "trophy" | "medal" | "flame" | "none"
  rank: number
  changeDirection: "up" | "down" | "none"
}

export function RankIcon({ type, rank, changeDirection }: RankIconProps) {
  const getIcon = () => {
    switch (type) {
      case "crown":
        return <span className="text-yellow-500 text-sm">👑</span>
      case "trophy":
        return <span className="text-gray-600 text-sm">🏆</span>
      case "medal":
        return <span className="text-orange-500 text-sm">🥉</span>
      case "flame":
        return <span className="text-sm font-medium">#4</span>
      default:
        return <span className="text-sm font-medium text-gray-500">#{rank}</span>
    }
  }

  const getTrendIcon = () => {
    if (changeDirection === "up") {
      return <TrendingUp className="h-3 w-3 text-green-500" />
    } else if (changeDirection === "down") {
      return <TrendingDown className="h-3 w-3 text-red-500" />
    }
    return null
  }

     return (
     <div className="flex items-center gap-1">
       <div className="flex items-center justify-center">
         {getIcon()}
       </div>
       {getTrendIcon()}
     </div>
   )
} 