import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar, Users, CheckCircle, X, Zap, CreditCard } from "lucide-react"

interface WeeklyReport {
  id: string
  week: string
  dateRange: string
  weeklyFill: {
    avatars: string[]
    names: string[]
  }
  clients: number
  meetings: number
  xp: number
  points: number
  status: "complete" | "done" | "missed"
}

interface WeeklyReportsTableProps {
  reports: WeeklyReport[]
}

export function WeeklyReportsTable({ reports }: WeeklyReportsTableProps) {
  const getStatusConfig = (status: WeeklyReport["status"]) => {
    switch (status) {
      case "complete":
        return {
          buttonText: "Complete",
          buttonClass: "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50",
          icon: null
        }
      case "done":
        return {
          buttonText: "Done", 
          buttonClass: "bg-green-600 text-white hover:bg-green-700",
          icon: <CheckCircle className="h-3 w-3 mr-1" />
        }
      case "missed":
        return {
          buttonText: "Missed",
          buttonClass: "bg-red-600 text-white hover:bg-red-700", 
          icon: <X className="h-3 w-3 mr-1" />
        }
    }
  }

  const getRowBackgroundColor = (status: WeeklyReport["status"]) => {
    switch (status) {
      case "done":
        return "bg-green-50 border-l-4 border-l-green-500"
      case "missed":
        return "bg-red-50 border-l-4 border-l-red-500"
      default:
        return ""
    }
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 ">
              <th className="text-left py-4 px-4 font-medium text-gray-600">Week</th>
              <th className="text-left py-4 px-4 font-medium text-gray-600">Weekly Fill</th>
              <th className="text-left py-4 px-4 font-medium text-gray-600">Clients</th>
              <th className="text-left py-4 px-4 font-medium text-gray-600">Meetings</th>
              <th className="text-left py-4 px-4 font-medium text-gray-600">XP</th>
              <th className="text-left py-4 px-4 font-medium text-gray-600">Points</th>
              <th className="text-right py-4 px-4 font-medium text-gray-600">Action</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report, index) => {
              const statusConfig = getStatusConfig(report.status)
              return (
                <tr key={report.id} className={`${index < reports.length - 1 ? 'border-b border-gray-100' : ''} hover:bg-gray-50 ${getRowBackgroundColor(report.status)}`}>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-blue-100">
                        <Calendar className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{report.week}</div>
                        <div className="text-xs text-muted-foreground">{report.dateRange}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1">
                      {report.weeklyFill.avatars.map((avatar, idx) => (
                        <Avatar key={idx} className="w-8 h-8">
                          <AvatarImage src={avatar} alt={report.weeklyFill.names[idx]} />
                          <AvatarFallback className="bg-gradient-to-r from-purple-400 to-pink-400 text-white font-bold text-xs">
                            DP
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">{report.clients}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium">{report.meetings}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1">
                      <Zap className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">{report.xp}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1">
                      <CreditCard className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">{report.points}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex justify-end">
                      <Button size="sm" className={`text-xs ${statusConfig.buttonClass}`}>
                        {statusConfig.icon}
                        {statusConfig.buttonText}
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
