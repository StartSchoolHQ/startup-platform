import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Building2, Zap, CreditCard } from "lucide-react"

interface ClientMeeting {
  id: string
  client: {
    company: string
    type: string
  }
  responsible: {
    name: string
    avatar: string
    datetime: string
  }
  points: number
}

interface ClientMeetingsTableProps {
  meetings: ClientMeeting[]
}

export function ClientMeetingsTable({ meetings }: ClientMeetingsTableProps) {
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-4 px-4 font-medium text-gray-600">Client</th>
              <th className="text-left py-4 px-4 font-medium text-gray-600">Responsible</th>
              <th className="text-left py-4 px-4 font-medium text-gray-600">Type</th>
              <th className="text-left py-4 px-4 font-medium text-gray-600">Points</th>
              <th className="text-right py-4 px-4 font-medium text-gray-600">Action</th>
            </tr>
          </thead>
          <tbody>
            {meetings.map((meeting, index) => (
              <tr key={meeting.id} className={`${index < meetings.length - 1 ? 'border-b border-gray-100' : ''} hover:bg-gray-50`}>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-blue-100">
                      <Building2 className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{meeting.client.company}</div>
                      <div className="text-xs text-muted-foreground">{meeting.client.type}</div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={meeting.responsible.avatar} alt={meeting.responsible.name} />
                      <AvatarFallback className="bg-gradient-to-r from-purple-400 to-pink-400 text-white font-bold text-xs">
                        {meeting.responsible.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">{meeting.responsible.name}</div>
                      <div className="text-xs text-muted-foreground">{meeting.responsible.datetime}</div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-1">
                    <Zap className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">50</span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-1">
                    <CreditCard className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">{meeting.points}</span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" className="text-xs">
                      View
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
