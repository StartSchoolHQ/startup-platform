import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Medal, Zap, CreditCard } from "lucide-react"

interface AchievementCardProps {
  title: string
  description: string
  status: "in-progress" | "finished" | "not-started"
  points: number
  xp: number
}

export function AchievementCard({ title, description, status, points, xp }: AchievementCardProps) {
  const getStatusConfig = (status: AchievementCardProps['status']) => {
    switch (status) {
      case 'in-progress':
        return {
          badgeText: 'In Progress',
          badgeClass: 'bg-yellow-100 text-orange-800 hover:bg-purple-100',
          cardClass: 'border-purple-300 bg-purple-50',
          iconBg: 'bg-purple-100'
        }
      case 'finished':
        return {
          badgeText: 'Finished',
          badgeClass: 'bg-green-100 text-green-800 hover:bg-green-100',
          cardClass: '',
          iconBg: 'bg-purple-100'
        }
      case 'not-started':
        return {
          badgeText: 'Not Started',
          badgeClass: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
          cardClass: 'border-gray-300 bg-gray-50',
          iconBg: 'bg-purple-100'
        }
    }
  }

  const config = getStatusConfig(status)

  return (
    <Card className={`${config.cardClass} transition-all hover:shadow-md p-0`}>
      <CardHeader className="pt-4 px-4">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className={`${config.badgeClass} px-3 py-1`}>
            {config.badgeText}
          </Badge>
         </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="flex items-center gap-2 align-middle mb-4">
        <Medal className="h-12 w-12 text-purple-500 flex-shrink-0 bg-purple-100 rounded-md p-2" />
        <div className="">
          <h3 className="font-semibold text-lg">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {/* Points Box */}
          <div className="border border-gray-200 rounded-lg p-2 bg-white">
            <div className="flex items-center gap-2">
              <CreditCard className="h-8 w-8 text-blue-500 flex-shrink-0 bg-blue-100 rounded-md p-2" />
              <div className="min-w-0">
                <div className="font-semibold text-base">{points}</div>
                <div className="text-xs text-muted-foreground">Points</div>
              </div>
            </div>
          </div>
          
          {/* XP Box */}
          <div className="border border-gray-200 rounded-lg p-2 bg-white">
            <div className="flex items-center gap-2">
              <Zap className="h-8 w-8 text-green-500 flex-shrink-0 bg-green-100 rounded-md p-2" />
              <div className="min-w-0">
                <div className="font-semibold text-base">{xp}</div>
                <div className="text-xs text-muted-foreground">XP</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}